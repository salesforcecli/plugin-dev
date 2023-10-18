/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as os from 'os';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.convert.script');

type Flag = {
  [key: string]: {
    name: string;
    char: string;
    aliases: string[];
  };
};

type Snapshot = {
  id: string;
  pluginName: string;
  aliases: string[];
  flags?: Flag;
  state?: 'deprecated';
  deprecationOptions?: {
    to: string;
    message: string;
  };
};

export default class ConvertScript extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    script: Flags.file({
      summary: messages.getMessage('flags.script.summary'),
      char: 's',
      required: true,
    }),
    'no-prompt': Flags.boolean({
      hidden: true,
      default: false,
      summary: messages.getMessage('flags.no-prompt.summary'),
    }),
  };

  // this command will replace the 'sfdx' "deprecated" style commands, with the 'sf' commands
  // it will not guarantee breaking changes, or changed json results
  // it will scan a script line by line, and prompt the user to replace the command
  // it will not replace the command if the user does not confirm
  // it uses the command-snapshot.json file at the CLI level to determine the command to replace

  public async run(): Promise<void> {
    const { flags } = await this.parse(ConvertScript);

    this.warn(messages.getMessage('warnBreakingChange'));
    this.warn(messages.getMessage('warnSfdxToSf'));
    this.warn(messages.getMessage('warnSfV2'));

    const agreeToTerms = await this.smartConfirm(messages.getMessage('continue'), !flags['no-prompt']);
    if (!agreeToTerms) {
      return;
    }
    const contents = await fs.promises.readFile(flags.script, 'utf8');

    const lines = contents.split(os.EOL);
    const data: string[] = [];
    //  examples:
    // sfdx force:user:password:generate -u myuser
    // sfdx force:package:install -p 04t1I0000000X0P -w 10 -u myorg
    // sfdx force:package:beta:version:list -p 04t1I0000000X0P -u myorg

    // sfdx force:package:install \
    //  -p 04t1I0000000X0P \
    //  --wait 10 \
    //  -u myorg

    for (let index = 0; index < lines.length; index++) {
      let line = lines[index];
      try {
        // if the line looks like it's a valid sfdx command
        if (line.match(/sfdx \w+/g)?.length && line.includes(':') && !line.startsWith('#')) {
          // if we have a multi line command, build it together
          if (line.endsWith('\\')) {
            while (line.endsWith('\\')) {
              line = line.concat(lines[index + 1]);
              lines.splice(index + 1, 1);
            }
            // we'll grab the next line after the last line that ends with '\', see ~L82
            line = line.concat(`${lines[index + 1]} `);
            if (lines[index + 2] === '') {
              // if there's a space to the next command, the multi-line commands will miss that, so check and grab it here
              line = line.concat(os.EOL);
            }
            lines.splice(index, 1);
          }

          const commandId = line.split('sfdx ')[1]?.split(' ')[0];

          const replacement = this.findReplacement(commandId);
          // eslint-disable-next-line no-await-in-loop
          line = await this.replaceCommand(commandId, replacement, line, flags['no-prompt']);

          if (replacement) {
            // eslint-disable-next-line no-await-in-loop
            line = await this.replaceFlag(replacement, line, flags['no-prompt']);
          }
        }
      } catch (e) {
        line = line.concat(` # ${messages.getMessage('errorComment')}${os.EOL}`);
        this.warn(messages.getMessage('errorComment'));
      } finally {
        // bare minimum replace sfdx with sf, and -u -> --target-org, -v -> --target-dev-hub
        line = line.replace('sfdx ', 'sf ').replace(' -u ', ' --target-org ').replace(' -v ', ' --target-dev-hub');
        data.push(line.replace(/\\ /g, `\\${os.EOL} `));
      }
    }

    fs.writeFileSync(flags.script, data.join(os.EOL));
  }

  private async replaceFlag(replacement: Snapshot, line: string, prompt: boolean): Promise<string> {
    // we can only replace flags for commands we know about

    const replacementFlags = Object.values(replacement.flags ?? {});

    // find the flags in the line, and replace them
    for (const flag of (line.match(/( -\w)|( --\w+)/g) ?? []).filter((f) => f)) {
      // trim down the flag to remove '-', '--' and optionally a '='
      const flagName =
        flag.replace(' --', '').replace(' -', '').split(' ')[0] ??
        flag.replace(' --', '').replace(' -', '').split('=')[0];

      // possibly undefined - but ok and handled below correctly
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const replacementFlag: string | undefined = replacementFlags.find(
        (f) => f.char === flagName || f.aliases?.includes(flagName) || f.name === flagName
      ).name;

      // don't prompt if the flag already matches the replacement
      if (
        replacementFlag &&
        replacementFlag !== flagName &&
        // eslint-disable-next-line no-await-in-loop
        (await this.smartConfirm(`\t${messages.getMessage('replaceFlag', [flagName, replacementFlag])}`, !prompt))
      ) {
        line = line.replace(flag, ` --${replacementFlag}${flag.includes('=') ? '=' : ''}`);
      }
    }
    return line;
  }

  private async replaceCommand(
    commandId: string,
    replacement: Snapshot,
    line: string,
    prompt: boolean
  ): Promise<string> {
    // meaning it's deprecated to multiple commands and can't be replaced inline
    // or if there is no "to", but there is a "message", then print the message
    const depMessage = replacement.deprecationOptions?.message;
    const depTo = replacement.deprecationOptions?.to;

    if (depTo?.includes('/') || (!depTo && depMessage)) {
      this.warn(messages.getMessage('cannotDetermine', [commandId]));
      if (depMessage) {
        this.warn(depMessage);
      }
    }

    if (replacement) {
      // we can only replace flags for commands we know about
      const commandWithSpaces = (depTo ?? replacement.id).replace(/:/g, ' ');
      if (await this.smartConfirm(messages.getMessage('replaceCommand', [commandId, commandWithSpaces]), !prompt)) {
        line = line.replace(commandId, commandWithSpaces);
      }
    }

    return line;
  }

  private async smartConfirm(message: string, prompt = true): Promise<boolean> {
    return prompt ? this.confirm(message, 18000000) : true;
  }

  private findReplacement(commandId: string): Snapshot {
    // first find the commands's aliases that match the commandId - and get their plugin name
    // from the plugin find the command that matches the commandId or the alias

    const pluginName = this.config.commands.find((c) => c.id === commandId)?.pluginName;
    const plugin = this.config.plugins.find((p) => p.name === pluginName);
    return plugin?.commands.find((c) => c.id === commandId || c.aliases.includes(commandId)) as Snapshot;
  }
}
