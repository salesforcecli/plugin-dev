/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import shelljs from 'shelljs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';

// eslint-disable-next-line sf-plugin/no-oclif-flags-command-import
import { Config, Command, toStandardizedId } from '@oclif/core';
import fg from 'fast-glob';
import { fileExists, FlagBuilder } from '../../../util.js';
import { FlagAnswers } from '../../../types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

const toLowerKebabCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

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

    const ids = await this.findExistingCommands();

    const { command } = await this.prompt<{ command: string }>([
      {
        type: 'list',
        name: 'command',
        message: messages.getMessage('question.SelectCommand'),
        choices: ids,
      },
    ]);

    const standardizedCommandId = toStandardizedId(command, this.config);

    const answers = await this.askQuestions(standardizedCommandId);

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

  private async askQuestions(commandFilePath: string): Promise<FlagAnswers> {
    const existingFlags = await loadExistingFlags(commandFilePath);

    const charToFlag = Object.entries(existingFlags).reduce<Record<string, string>>(
      (acc, [key, value]) => (value.char ? { ...acc, [value.char]: key } : acc),
      {}
    );

    const durationUnits = (Object.values(Duration.Unit).filter((unit) => typeof unit === 'string') as string[]).map(
      (unit) => unit.toLowerCase()
    );

    return this.prompt<FlagAnswers>([
      {
        type: 'list',
        name: 'type',
        message: messages.getMessage('question.FlagType'),
        choices: Object.keys(Flags).sort(),
      },
      {
        type: 'input',
        name: 'name',
        message: messages.getMessage('question.FlagName'),
        validate: (input: string): string | boolean => {
          if (!input) return messages.getMessage('error.FlagNameRequired');

          if (toLowerKebabCase(input) !== input) {
            return messages.getMessage('error.KebabCase');
          }

          if (Object.keys(existingFlags).includes(input)) {
            return messages.getMessage('error.FlagExists', [input]);
          }

          return true;
        },
      },
      {
        type: 'input',
        name: 'summary',
        message: messages.getMessage('question.FlagSummary'),
        default: (ans: FlagAnswers) => messages.getMessage('default.FlagSummary', [ans.name]),
        validate: (input: string): string | boolean => {
          if (input[0].toLowerCase() === input[0] || !input.endsWith('.')) {
            return messages.getMessage('error.InvalidSummary');
          }

          return true;
        },
      },
      {
        type: 'input',
        name: 'char',
        message: messages.getMessage('question.FlagShortChar'),
        validate: (input: string): string | boolean => {
          if (!input) return true;
          if (charToFlag[input]) return messages.getMessage('error.FlagShortCharExists', [input, charToFlag[input]]);
          if (!/[A-Z]|[a-z]/g.test(input)) return messages.getMessage('error.InvalidFlagShortChar');
          if (input.length > 1) return messages.getMessage('error.InvalidFlagShortCharLength');
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'required',
        message: messages.getMessage('question.RequiredFlag'),
        default: false,
      },
      {
        type: 'confirm',
        name: 'multiple',
        message: messages.getMessage('question.AllowMultiple'),
        default: false,
        when: (ans: FlagAnswers): boolean => ans.type !== 'boolean',
      },
      {
        type: 'list',
        name: 'durationUnit',
        message: messages.getMessage('question.Duration.Unit'),
        choices: durationUnits,
        when: (ans: FlagAnswers): boolean => ans.type === 'duration',
      },
      {
        type: 'input',
        name: 'durationMin',
        message: messages.getMessage('question.Duration.Minimum'),
        when: (ans: FlagAnswers): boolean => ans.type === 'duration',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : messages.getMessage('error.InvalidInteger');
        },
      },
      {
        type: 'input',
        name: 'durationMax',
        message: messages.getMessage('question.Duration.Maximum'),
        when: (ans: FlagAnswers): boolean => ans.type === 'duration',
        validate: (input: string, ans: FlagAnswers): string | boolean => {
          if (!input) return true;
          if (!Number.isInteger(Number(input))) return messages.getMessage('error.InvalidInteger');
          return !ans.durationMin || Number(input) > ans.durationMin
            ? true
            : messages.getMessage('error.IntegerMaxLessThanMin');
        },
      },
      {
        type: 'input',
        name: 'durationDefaultValue',
        message: messages.getMessage('question.Duration.DefaultValue'),
        validate: (input: string, ans: FlagAnswers): string | boolean => {
          if (!input) return true;
          const num = Number(input);
          if (!Number.isInteger(num)) return messages.getMessage('error.InvalidInteger');
          return (!ans.durationMin || num >= ans.durationMin) && (!ans.durationMax || num <= ans.durationMax)
            ? true
            : messages.getMessage('error.InvalidDefaultInteger');
        },
        when: (ans: FlagAnswers): boolean => ans.type === 'duration',
      },
      {
        type: 'list',
        name: 'salesforceIdLength',
        message: messages.getMessage('question.SalesforceId.Length'),
        choices: ['Both', '15', '18', 'None'],
        when: (ans: FlagAnswers): boolean => ans.type === 'salesforceId',
      },
      {
        type: 'input',
        name: 'salesforceIdStartsWith',
        message: messages.getMessage('question.SalesforceId.StartsWith'),
        when: (ans: FlagAnswers): boolean => ans.type === 'salesforceId',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return input.length === 3 ? true : messages.getMessage('error.InvalidSalesforceIdPrefix');
        },
      },
      {
        type: 'confirm',
        name: 'fileOrDirExists',
        message: messages.getMessage('question.FileDir.Exists'),
        default: false,
        when: (ans: FlagAnswers): boolean => ['file', 'directory'].includes(ans.type),
      },
      {
        type: 'input',
        name: 'integerMin',
        message: messages.getMessage('question.Integer.Minimum'),
        when: (ans: FlagAnswers): boolean => ans.type === 'integer',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : messages.getMessage('error.InvalidInteger');
        },
      },
      {
        type: 'input',
        name: 'integerMax',
        message: messages.getMessage('question.Integer.Maximum'),
        when: (ans: FlagAnswers): boolean => ans.type === 'integer',
        validate: (input: string, ans: FlagAnswers): string | boolean => {
          if (!input) return true;
          if (!Number.isInteger(Number(input))) return messages.getMessage('error.InvalidInteger');
          return !ans.integerMin || Number(input) > ans.integerMin
            ? true
            : messages.getMessage('error.IntegerMaxLessThanMin');
        },
      },
      {
        type: 'input',
        name: 'integerDefault',
        message: messages.getMessage('question.Integer.Default'),
        when: (ans: FlagAnswers): boolean => ans.type === 'integer' && Boolean(ans.integerMin ?? ans.integerMax),
        validate: (input: string, ans: FlagAnswers): string | boolean => {
          if (!input) return true;
          const num = Number(input);
          if (!Number.isInteger(num)) return messages.getMessage('error.InvalidInteger');
          return (!ans.integerMin || num >= ans.integerMin) && (!ans.integerMax || num <= ans.integerMax)
            ? true
            : messages.getMessage('error.InvalidDefaultInteger');
        },
      },
    ]);
  }

  private async findExistingCommands(): Promise<string[]> {
    return (await fg('src/commands/**/*.ts'))
      .map((file) => {
        // fast-glob always returns posix paths so no need to use path.join here
        const p = path.parse(file.replace('src/commands', ''));
        const topics = p.dir.split('/');
        const command = p.name !== 'index' && p.name;
        const id = [...topics, command].filter((f) => f).join(this.config.topicSeparator);
        return id === '' ? '.' : id;
      })
      .sort();
  }
}

const updateMarkdownFile = async (answers: FlagAnswers, commandName: string): Promise<void> => {
  const filePath = path.join('messages', `${commandName.split(':').join('.')}.md`);
  await fs.appendFile(
    filePath,
    `${os.EOL}# flags.${answers.name}.summary${os.EOL}${os.EOL}${answers.summary}${os.EOL}`
  );
};

const loadExistingFlags = async (commandId: string): Promise<Record<string, Command.Flag.Any>> => {
  const config = new Config({ root: process.cwd() });
  config.root = config.options.root;
  await config.load();
  const cmd = config.commands.find((c) => c.id === commandId);
  return cmd?.flags ?? {};
};
