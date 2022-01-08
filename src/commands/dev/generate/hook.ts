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
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.hook');

export default class GenerateHook extends GeneratorCommand {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    force: Flags.boolean({
      description: messages.getMessage('flags.force.description'),
    }),
    event: Flags.string({
      description: messages.getMessage('flags.event.description'),
      options: ['sf:env:display', 'sf:env:list', 'sf:deploy', 'sf:logout'],
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateHook);
    await super.generate('hook', {
      force: flags.force,
      event: flags.event,
    });
  }
}
