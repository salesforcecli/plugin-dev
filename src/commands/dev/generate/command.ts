/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Flags } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { fileExists, generate } from '../../../util';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.command');

export default class GenerateCommand extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      required: true,
      description: messages.getMessage('flags.name.description'),
      char: 'n',
    }),
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

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateCommand);
    if (!fileExists('package.json')) throw messages.createError('errors.InvalidDir');
    await generate('command', {
      name: flags.name,
      force: flags.force,
      nuts: flags.nuts,
      unit: flags.unit,
    });
  }
}
