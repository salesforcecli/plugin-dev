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
import { Manifest, Snapshot } from '../../manifest';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'convert.script');

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

    this.warn(
      'This script will replace sfdx commands for sf commands. It does not guarantee breaking changes, or changed json results.'
    );
    this.warn(
      "As an additional reminder, the sfdx commands will be available in sf and can be migrated by simpling changing 'sfdx' to 'sf'."
    );
    this.warn("This script assumes you've uninstalled `sf v1` and `sfdx` and are ready to use `sf v2` ");

    await this.smartConfirm('Do you want to continue?', !flags['no-prompt']);

    const contents = await fs.promises.readFile(flags.script, 'utf8');

    const manifest = Object.values(Manifest);

    const lines = contents.split(os.EOL);
    const data: string[] = [];
    //  examples:
    // sfdx force:user:password:generate -u myuser
    // sfdx force:package:install -p 04t1I0000000X0P -w 10 -u myorg
    // sfdx force:package:beta:version:list -p 04t1I0000000X0P -u myorg

    for (let line of lines) {
      try {
        // if the line looks like it's a valid sfdx command
        if (line.match(/sfdx \w+/g)?.length && line.includes(':') && !line.startsWith('#')) {
          const commandId = line.split('sfdx ')[1]?.split(' ')[0];

          const replacement = this.findReplacement(manifest, commandId);

          if (Manifest[commandId]?.deprecationOptions?.to.includes('/')) {
            this.warn(`Cannot determine appropriate replacement for ${commandId}`);
          }

          if (replacement) {
            // we can only replace flags for commands we know about

            if (await this.smartConfirm(`replace ${commandId} for ${replacement.id}`, !flags['no-prompt'])) {
              line = line.replace(commandId, replacement.id);
            }

            const replacementFlags = Object.values(replacement.flags);

            // find the flags in the line, and replace them
            for (const flag of line
              .match(/ -\w/g)
              .concat(line.match(/ --\w(\w|-)*/g))
              .filter((f) => f)) {
              // trim down the flag to remove '-', '--' and optionally a '='
              const flagName =
                flag.replace(' -', '').replace(' --', '').split(' ')[0] ?? flag.replace(' --', '').split('=')[0];

              const replacementFlag = replacementFlags.find(
                (f) => f.char === flagName || f.aliases?.includes(flagName)
              ).name;

              // don't prompt if the flag already matches the replacement
              if (
                replacementFlag &&
                replacementFlag !== flagName &&
                (await this.smartConfirm(`\treplacing ${flagName} for ${replacementFlag}`, !flags['no-prompt']))
              ) {
                line = line.replace(flag, ` --${replacementFlag}${flag.includes('=') ? '=' : ''}`);
              }
            }
          }
          // bare minimum replace sfdx with sf, and -u -> --target-org, -v -> --target-dev-hub
          line = line.replace('sfdx ', 'sf ').replace(' -u ', ' --target-org ').replace(' -v ', ' --target-dev-hub');
          data.push(line);
        } else {
          // no changes
          data.push(line);
        }
      } catch (e) {
        line = line.replace('sfdx ', 'sf ').replace(' -u ', ' --target-org ').replace(' -v ', ' --target-dev-hub');
        line = line.concat(' # ERROR converting this line, human intervention required');
        data.push(line);
      }
    }
    fs.writeFileSync(flags.script, data.join(os.EOL));
  }

  private async smartConfirm(message: string, prompt = true): Promise<boolean> {
    return prompt ? await this.confirm(message, 100000) : true;
  }

  private findReplacement(manifest: Snapshot[], commandId: string): Snapshot | undefined {
    let result = manifest.find(
      (c) =>
        (c.state === 'deprecated' && c.deprecationOptions?.to && c.id === commandId) || c.aliases.includes(commandId)
    );
    if (result?.id === commandId) {
      // we found ourself, can happen with force:source:deploy where we need to get the deprecationOptions.to key from the manifest
      const replacedWithSemiColons = result.deprecationOptions.to.replace(/ /g, ':');
      result = Manifest[replacedWithSemiColons];
    }
    return result;
  }
}
