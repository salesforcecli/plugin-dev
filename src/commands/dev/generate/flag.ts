/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'shelljs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';

import { Config, Interfaces, toStandardizedId } from '@oclif/core';
import * as fg from 'fast-glob';
import { fileExists, FlagBuilder } from '../../../util';
import { FlagAnswers } from '../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.flag', [
  'default.FlagSummary',
  'description',
  'error.FlagExists',
  'error.FlagNameRequired',
  'error.FlagShortCharExists',
  'error.IntegerMaxLessThanMin',
  'error.InvalidDefaultInteger',
  'error.InvalidDir',
  'error.InvalidFlagShortChar',
  'error.InvalidFlagShortCharLength',
  'error.InvalidInteger',
  'error.InvalidSalesforceIdPrefix',
  'error.InvalidSummary',
  'error.KebabCase',
  'examples',
  'flags.dry-run.summary',
  'question.AllowMultiple',
  'question.Duration.DefaultValue',
  'question.Duration.Maximum',
  'question.Duration.Minimum',
  'question.Duration.Unit',
  'question.FileDir.Exists',
  'question.FlagName',
  'question.FlagShortChar',
  'question.FlagSummary',
  'question.FlagType',
  'question.Integer.Default',
  'question.Integer.Maximum',
  'question.Integer.Minimum',
  'question.RequiredFlag',
  'question.SalesforceId.Length',
  'question.SalesforceId.StartsWith',
  'question.SelectCommand',
  'summary',
]);

const toLowerKebabCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

export default class DevGenerateFlag extends SfCommand<void> {
  public static enableJsonFlag = false;
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      char: 'd',
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
      this.log(newFlag.join('\n'));
      return;
    }

    const updatedFile = await flagBuilder.apply(newFlag);

    await fs.writeFile(commandFilePath, updatedFile);

    await this.updateMarkdownFile(answers, standardizedCommandId);

    exec(`yarn prettier --write ${commandFilePath}`);

    exec('yarn compile');

    this.log(`Added ${answers.name} flag to ${commandFilePath}`);
  }

  private async askQuestions(commandFilePath: string): Promise<FlagAnswers> {
    const existingFlags = await this.loadExistingFlags(commandFilePath);

    const charToFlag = Object.entries(existingFlags).reduce((acc, [key, value]) => {
      return value.char ? { ...acc, [value.char]: key } : acc;
    }, {} as Record<string, string>);

    const durationUnits = (Object.values(Duration.Unit).filter((unit) => typeof unit === 'string') as string[]).map(
      (unit) => unit.toLowerCase()
    );

    return await this.prompt<FlagAnswers>([
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
          if (input[0].toLowerCase() === input[0] || input[input.length - 1] !== '.') {
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
          return Number(input) > ans.durationMin ? true : messages.getMessage('error.IntegerMaxLessThanMin');
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
          return num >= ans.durationMin && num <= ans.durationMax
            ? true
            : messages.getMessage('error.InvalidDefaultInteger');
        },
        when: (ans: FlagAnswers): boolean => ans.type === 'duration',
      },
      {
        type: 'list',
        name: 'salesforceIdLength',
        message: messages.getMessage('question.SalesforceId.Length'),
        choices: ['15', '18', 'None'],
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
          return Number(input) > ans.integerMin ? true : messages.getMessage('error.IntegerMaxLessThanMin');
        },
      },
      {
        type: 'input',
        name: 'integerDefault',
        message: messages.getMessage('question.Integer.Default'),
        when: (ans: FlagAnswers): boolean => ans.type === 'integer' && Boolean(ans.integerMin || ans.integerMax),
        validate: (input: string, ans: FlagAnswers): string | boolean => {
          if (!input) return true;
          const num = Number(input);
          if (!Number.isInteger(num)) return messages.getMessage('error.InvalidInteger');
          return num >= ans.integerMin && num <= ans.integerMax
            ? true
            : messages.getMessage('error.InvalidDefaultInteger');
        },
      },
    ]);
  }

  private async loadExistingFlags(commandId: string): Promise<Record<string, Interfaces.Command.Flag>> {
    const config = new Config({ root: process.cwd() });
    config.root = config.options.root;
    await config.load();
    const cmd = config.commands.find((c) => c.id === commandId);
    return cmd.flags ?? {};
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

  private async updateMarkdownFile(answers: FlagAnswers, commandName: string): Promise<void> {
    const filePath = path.join('messages', `${commandName.split(':').join('.')}.md`);
    await fs.appendFile(filePath, `\n# flags.${answers.name}.summary\n\n${answers.summary}\n`);
  }
}
