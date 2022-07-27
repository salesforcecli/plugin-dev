/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

import { Config } from '@oclif/core';
import ModuleLoader from '@oclif/core/lib/module-loader';
import { fileExists } from '../../../util';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.flag', [
  'description',
  'errors.InvalidDir',
  'examples',
  'flags.command.description',
  'flags.name.description',
  'errors.FlagExists',
  'summary',
]);

export default class DevGenerateFlag extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      description: messages.getMessage('flags.name.description'),
      char: 'n',
      required: true,
    }),
    command: Flags.string({
      description: messages.getMessage('flags.command.description'),
      char: 'c',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DevGenerateFlag);
    if (!fileExists('package.json')) throw messages.createError('errors.InvalidDir');
    const config = new Config({ root: process.cwd() });
    config.root = config.options.root;

    const commandFilePath = path.join('.', 'src', 'commands', ...flags.command.split(':'));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await ModuleLoader.load(config, commandFilePath);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const existingFlags = module.default.flags;

    if (Object.keys(existingFlags).includes(flags.name)) {
      throw messages.createError('errors.FlagExists', [flags.name]);
    }

    const newFlag = `    ${flags.name}: Flags.string({
      summary: messages.getMessage('flags.${flags.name}.summary'),
    }),`.split('\n');

    const lines = (await fs.readFile(`${commandFilePath}.ts`, 'utf8')).split('\n');
    const flagsStartIndex = lines.findIndex(
      (line) => line.includes('public static flags') || line.includes('public static readonly flags')
    );
    const flagsEndIndex = lines.slice(flagsStartIndex).findIndex((line) => line.endsWith('};')) + flagsStartIndex;
    lines.splice(flagsEndIndex, 0, ...newFlag);

    const messagesStartIndex = lines.findIndex((line) => line.includes('Messages.load('));
    if (messagesStartIndex) {
      const messagesEndIndex =
        lines.slice(messagesStartIndex).findIndex((line) => line.endsWith(';')) + messagesStartIndex;
      lines.splice(messagesEndIndex, 0, `  'flags.${flags.name}.summary,'`);
    }

    this.log('New file contents:');
    this.log(lines.join('\n'));
  }
}
