/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import select from '@inquirer/select';
import shelljs from 'shelljs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { toStandardizedId } from '@oclif/core';
import fg from 'fast-glob';
import { askQuestions } from '../../../prompts/series/flagPrompts.js';
import { fileExists, FlagBuilder } from '../../../util.js';
import { FlagAnswers } from '../../../types.js';
import { stringToChoice } from '../../../prompts/functions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

export default class DevGenerateFlag extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      char: 'd',
      aliases: ['dryrun'],
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DevGenerateFlag);

    if (!(await fileExists('package.json'))) throw messages.createError('error.InvalidDir');

    const command = await select({
      message: messages.getMessage('question.SelectCommand'),
      choices: (await findExistingCommands(this.config.topicSeparator)).map(stringToChoice),
    });

    const standardizedCommandId = toStandardizedId(command, this.config);

    const answers = await askQuestions(standardizedCommandId);

    const commandFilePath = `${path.join('.', 'src', 'commands', ...standardizedCommandId.split(':'))}.ts`;

    const flagBuilder = new FlagBuilder(answers, commandFilePath);

    const newFlag = flagBuilder.build();

    if (flags['dry-run']) {
      this.styledHeader('New flag:');
      this.log(newFlag.join(os.EOL));
      return;
    }

    const updatedFile = await flagBuilder.apply(newFlag);

    await fs.writeFile(commandFilePath, updatedFile);

    await updateMarkdownFile(answers, standardizedCommandId);

    shelljs.exec(`yarn prettier --write ${commandFilePath}`);

    shelljs.exec('yarn compile');

    this.log(`Added ${answers.name} flag to ${commandFilePath}`);
  }
}

const findExistingCommands = async (topicSeparator: string): Promise<string[]> =>
  (await fg('src/commands/**/*.ts'))
    .map((file) => {
      // fast-glob always returns posix paths so no need to use path.join here
      const p = path.parse(file.replace('src/commands', ''));
      const topics = p.dir.split('/');
      const command = p.name !== 'index' && p.name;
      const id = [...topics, command].filter((f) => f).join(topicSeparator);
      return id === '' ? '.' : id;
    })
    .sort();

const updateMarkdownFile = async (answers: FlagAnswers, commandName: string): Promise<void> =>
  fs.appendFile(
    path.join('messages', `${commandName.split(':').join('.')}.md`),
    `${os.EOL}# flags.${answers.name}.summary${os.EOL}${os.EOL}${answers.summary}${os.EOL}`
  );
