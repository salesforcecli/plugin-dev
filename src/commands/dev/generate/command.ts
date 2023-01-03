/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { fileExists, generate } from '../../../util';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.command', [
  'summary',
  'description',
  'examples',
  'flags.name.summary',
  'flags.force.summary',
  'flags.nuts.summary',
  'flags.unit.summary',
  'errors.InvalidDir',
]);

export default class GenerateCommand extends SfCommand<void> {
  public static readonly enableJsonFlag = false;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      required: true,
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
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateCommand);
    if (!(await fileExists('package.json'))) throw messages.createError('errors.InvalidDir');
    await generate('command', {
      name: flags.name,
      force: flags.force,
      nuts: flags.nuts,
      unit: flags.unit,
    });
  }
}
