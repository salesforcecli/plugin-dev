/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';
import { GeneratorCommand } from '../../../generatorCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.plugin');

export default class GeneratePlugin extends GeneratorCommand {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {};

  public static args = [{ name: 'name', required: true, description: messages.getMessage('args.name.description') }];

  public async run(): Promise<void> {
    const { args } = await this.parse(GeneratePlugin);
    const pluginName = args.name as string;

    if (!pluginName.startsWith('plugin-')) {
      throw messages.createError('error.InvalidPluginName', [pluginName]);
    }

    await super.generate('plugin', {
      name: pluginName,
      force: true,
    });
  }
}
