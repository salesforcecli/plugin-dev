/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Flags } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { GeneratorCommand } from '../../../generatorCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.command');

export default class GenerateCommand extends GeneratorCommand {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    force: Flags.boolean({
      description: messages.getMessage('flags.force.description'),
    }),
    nuts: Flags.boolean({
      description: messages.getMessage('flags.nuts.description'),
      allowNo: true,
      default: true,
    }),
    unit: Flags.boolean({
      description: messages.getMessage('flags.unit.description'),
      allowNo: true,
      default: false,
    }),
  };

  public static args = [{ name: 'name', required: true, description: messages.getMessage('args.name.description') }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenerateCommand);
    await super.generate('command', {
      name: args.name,
      force: flags.force,
      nuts: flags.nuts,
      unit: flags.unit,
    });
  }
}
