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
import { Hook } from '../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.hook', [
  'summary',
  'description',
  'examples',
  'flags.force.summary',
  'flags.event.summary',
  'errors.InvalidDir',
]);

export default class GenerateHook extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
    }),
    event: Flags.string({
      summary: messages.getMessage('flags.event.summary'),
      options: Object.keys(Hook),
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateHook);
    if (!fileExists('package.json')) throw messages.createError('errors.InvalidDir');
    await generate('hook', {
      force: flags.force,
      event: flags.event,
    });
  }
}
