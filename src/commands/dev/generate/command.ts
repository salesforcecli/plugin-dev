/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { fileExists, generate } from '../../../util';
import { CommandTaxonomyHelper } from '../../../CommandTaxonomyHelper';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.command', [
  'summary',
  'description',
  'examples',
  'flags.name.summary',
  'flags.force.summary',
  'flags.nuts.summary',
  'flags.unit.summary',
  'flags.org.summary',
  'flags.devhub.summary',
  'flags.results.summary',
  'flags.wants-help.summary',
  'errors.InvalidDir',
  'errors.SessionTerminatedByUser',
  'message.non-conforming-command-name',
  'message.no-command-name-given',
  'message.need-help',
  'flags.keep-as-is.summary',
]);

export default class GenerateCommand extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      required: false,
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
    }),
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
    }),
    nuts: Flags.boolean({
      summary: messages.getMessage('flags.nuts.summary'),
      allowNo: true,
      default: true,
    }),
    unit: Flags.boolean({
      summary: messages.getMessage('flags.unit.summary'),
      allowNo: true,
      default: true,
    }),
    'uses-org': Flags.boolean({
      summary: messages.getMessage('flags.org.summary'),
    }),
    'uses-devhub-org': Flags.boolean({
      summary: messages.getMessage('flags.devhub.summary'),
    }),
    'result-type': Flags.enum({
      summary: messages.getMessage('flags.results.summary'),
      options: ['list', 'object', 'string', 'void'],
    }),
    'wants-help': Flags.boolean({
      summary: messages.getMessage('flags.wants-help.summary'),
      allowNo: true,
      default: true,
    }),
    'keep-as-is': Flags.boolean({
      summary: messages.getMessage('flags.keep-as-is.summary'),
      char: 'k',
      exclusive: ['wants-help'],
      dependsOn: ['name'],
      allowNo: true,
      default: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateCommand);
    const command = !flags['keep-as-is'] ? await this.validateCommandName(flags.name, flags['wants-help']) : flags.name;
    if (!(await fileExists('package.json'))) throw messages.createError('errors.InvalidDir');
    await generate('command', {
      name: command,
      force: flags.force,
      nuts: flags.nuts,
      unit: flags.unit,
      org: flags['uses-org'],
      devHub: flags['uses-devhub-org'],
      resultType: flags['result-type'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private async validateCommandName(name: string, wantsHelp: boolean): Promise<string> {
    type UseFixOrQuit = { useFixOrQuit: string };
    const cmdHelper = new CommandTaxonomyHelper({ stopwords: false });
    const isConforming = await cmdHelper.isConformingCommand(name);
    if (!isConforming) {
      // non-conforming command, give the user a chance to keep or fix it
      const message = `${
        name
          ? messages.getMessage('message.non-conforming-command-name')
          : messages.getMessage('message.no-command-name-given')
      } ${messages.getMessage('message.need-help')}`;
      const whatToDoNext = (await this.prompt({
        type: 'list',
        name: 'useFixOrQuit',
        choices: this.getWantsHelpChoices(wantsHelp, name),
        message,
      })) as UseFixOrQuit;
      if (whatToDoNext.useFixOrQuit === 'quit') {
        throw messages.createError('errors.SessionTerminatedByUser');
      }
      if (whatToDoNext.useFixOrQuit === 'help') {
        return await cmdHelper.buildConformingCommand(name);
      } else {
        return name;
      }
    }
    return name;
  }

  private getWantsHelpChoices(wantsHelp: boolean, name: string): string[] {
    const choices = ['quit'];
    if (wantsHelp) {
      choices.push('help');
    }
    if (name) {
      choices.push('keep');
    }
    return choices;
  }
}
