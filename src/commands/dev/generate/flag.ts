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
import { Nullable } from '@salesforce/ts-types';
import { Duration } from '@salesforce/kit';

import { Config, Interfaces, toConfiguredId, toStandardizedId } from '@oclif/core';
import * as fg from 'fast-glob';
import { fileExists } from '../../../util';

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

type Answers = {
  char: Nullable<string>;
  type: keyof typeof Flags;
  name: string;
  summary: string;
  required: boolean;
  multiple: boolean;
  durationUnit: Lowercase<keyof typeof Duration.Unit>;
  durationDefaultValue: number;
  durationMin: number;
  durationMax: number;
  salesforceIdLength: '15' | '18' | 'None';
  salesforceIdStartsWith: string;
  fileOrDirExists: boolean;
  integerMin: number;
  integerMax: number;
  integerDefault: number;
};

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

    if (!fileExists('package.json')) throw messages.createError('error.InvalidDir');

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

    const newFlag = this.constructFlag(answers);

    if (flags['dry-run']) {
      this.styledHeader('New flag:');
      this.log(newFlag.join('\n'));
      return;
    }

    const commandFilePath = path.join('.', 'src', 'commands', ...standardizedCommandId.split(':'));
    const lines = (await fs.readFile(`${commandFilePath}.ts`, 'utf8')).split('\n');
    const flagsStartIndex = lines.findIndex(
      (line) => line.includes('public static flags') || line.includes('public static readonly flags')
    );

    // If index isn't found, that means that no flags are defined yet
    if (flagsStartIndex === -1) {
      const altFlagsStartIndex = lines.findIndex((line) => line.includes('public async run')) - 1;
      lines.splice(altFlagsStartIndex, 0, `public static flags = {${newFlag.join('\n')}};\n`);
    } else {
      const flagsEndIndex = lines.slice(flagsStartIndex).findIndex((line) => line.endsWith('};')) + flagsStartIndex;
      lines.splice(flagsEndIndex, 0, ...newFlag);
    }

    const messagesStartIndex = lines.findIndex((line) => line.includes('Messages.load('));
    if (messagesStartIndex) {
      const messagesEndIndex =
        lines.slice(messagesStartIndex).findIndex((line) => line.endsWith(';')) + messagesStartIndex;

      // if the indices are equal that means that the messages are on the same line
      if (messagesEndIndex === messagesStartIndex) {
        const line = lines[messagesStartIndex];
        const endIndex = line.indexOf(']');
        const updated = line.substring(0, endIndex) + `, 'flags.${answers.name}.summary'` + line.substring(endIndex);
        lines[messagesStartIndex] = updated;
      } else {
        lines.splice(messagesEndIndex, 0, `'flags.${answers.name}.summary',`);
      }
    }

    const sfPluginsCoreImport = lines.findIndex((line) => line.includes("from '@salesforce/sf-plugins-core'"));

    const oclifCoreImport = lines.findIndex((line) => line.includes("from '@oclif/core'"));

    // add the Flags import from @salesforce/sf-plugins-core if it doesn't exist already
    if (!lines[sfPluginsCoreImport].includes('Flags')) {
      const line = lines[sfPluginsCoreImport];
      const endIndex = line.indexOf('}');
      lines[sfPluginsCoreImport] = line.substring(0, endIndex) + ', Flags' + line.substring(endIndex);
    }

    // ensure the Flags import is from @salesforce/sf-plugins-core
    if (oclifCoreImport !== -1 && lines[oclifCoreImport].includes('Flags')) {
      if (lines[oclifCoreImport] === "import { Flags } from '@oclif/core';") lines.splice(oclifCoreImport, 1);
      else {
        lines[oclifCoreImport] = lines[oclifCoreImport].replace('Flags,', '').replace(', Flags', '');
      }
    }

    await fs.writeFile(`${commandFilePath}.ts`, lines.join('\n'));

    await this.updateMarkdownFile(answers, standardizedCommandId);

    exec(`yarn prettier --write ${commandFilePath}.ts`);
    this.log(`Added ${answers.name} flag to ${commandFilePath}.ts`);
  }

  private async askQuestions(commandFilePath: string): Promise<Answers> {
    const existingFlags = await this.loadExistingFlags(commandFilePath);

    const charToFlag = Object.entries(existingFlags).reduce((acc, [key, value]) => {
      return value.char ? { ...acc, [value.char]: key } : acc;
    }, {} as Record<string, string>);

    const durationUnits = (Object.values(Duration.Unit).filter((unit) => typeof unit === 'string') as string[]).map(
      (unit) => unit.toLowerCase()
    );

    return await this.prompt<Answers>([
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
        default: (ans: Answers) => messages.getMessage('default.FlagSummary', [ans.name]),
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
        when: (ans: Answers): boolean => ans.type !== 'boolean',
      },
      {
        type: 'list',
        name: 'durationUnit',
        message: messages.getMessage('question.Duration.Unit'),
        choices: durationUnits,
        when: (ans: Answers): boolean => ans.type === 'duration',
      },
      {
        type: 'input',
        name: 'durationDefaultValue',
        message: messages.getMessage('question.Duration.DefaultValue'),
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : messages.getMessage('error.InvalidInteger');
        },
        when: (ans: Answers): boolean => ans.type === 'duration',
      },
      {
        type: 'input',
        name: 'durationMin',
        message: messages.getMessage('question.Duration.Minimum'),
        when: (ans: Answers): boolean => ans.type === 'duration',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : messages.getMessage('error.InvalidInteger');
        },
      },
      {
        type: 'input',
        name: 'durationMax',
        message: messages.getMessage('question.Duration.Maximum'),
        when: (ans: Answers): boolean => ans.type === 'duration',
        validate: (input: string, ans: Answers): string | boolean => {
          if (!input) return true;
          if (!Number.isInteger(Number(input))) return messages.getMessage('error.InvalidInteger');
          return Number(input) > ans.integerMin ? true : messages.getMessage('error.IntegerMaxLessThanMin');
        },
      },
      {
        type: 'list',
        name: 'salesforceIdLength',
        message: messages.getMessage('question.SalesforceId.Length'),
        choices: ['15', '18', 'None'],
        when: (ans: Answers): boolean => ans.type === 'salesforceId',
      },
      {
        type: 'input',
        name: 'salesforceIdStartsWith',
        message: messages.getMessage('question.SalesforceId.StartsWith'),
        when: (ans: Answers): boolean => ans.type === 'salesforceId',
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
        when: (ans: Answers): boolean => ['file', 'directory'].includes(ans.type),
      },
      {
        type: 'input',
        name: 'integerMin',
        message: messages.getMessage('question.Integer.Minimum'),
        when: (ans: Answers): boolean => ans.type === 'integer',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : messages.getMessage('error.InvalidInteger');
        },
      },
      {
        type: 'input',
        name: 'integerMax',
        message: messages.getMessage('question.Integer.Maximum'),
        when: (ans: Answers): boolean => ans.type === 'integer',
        validate: (input: string, ans: Answers): string | boolean => {
          if (!input) return true;
          if (!Number.isInteger(Number(input))) return messages.getMessage('error.InvalidInteger');
          return Number(input) > ans.integerMin ? true : messages.getMessage('error.IntegerMaxLessThanMin');
        },
      },
      {
        type: 'input',
        name: 'integerDefault',
        message: messages.getMessage('question.Integer.Default'),
        when: (ans: Answers): boolean => ans.type === 'integer' && Boolean(ans.integerMin || ans.integerMax),
        validate: (input: string, ans: Answers): string | boolean => {
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
        const p = path.parse(file.replace(path.join('.', 'src', 'commands'), ''));
        const topics = p.dir.split('/');
        const command = p.name !== 'index' && p.name;
        const id = [...topics, command].filter((f) => f).join(':');
        return id === '' ? '.' : id;
      })
      .sort()
      .map((c) => toConfiguredId(c, this.config));
  }

  private async updateMarkdownFile(answers: Answers, commandName: string): Promise<void> {
    const filePath = path.join('messages', `${commandName.split(':').join('.')}.md`);
    await fs.appendFile(filePath, `\n# flags.${answers.name}.summary\n\n${answers.summary}\n`);
  }

  private constructFlag(answers: Answers): string[] {
    const flagOptions = [`summary: messages.getMessage('flags.${answers.name}.summary')`];

    if (answers.char) flagOptions.push(`char: '${answers.char}'`);
    if (answers.required) flagOptions.push('required: true');
    if (answers.multiple) flagOptions.push('multiple: true');
    if (answers.durationUnit) flagOptions.push(`unit: '${answers.durationUnit}'`);
    if (answers.durationDefaultValue) flagOptions.push(`defaultValue: ${answers.durationDefaultValue}`);
    if (answers.durationMin) flagOptions.push(`min: ${answers.durationMin}`);
    if (answers.durationMax) flagOptions.push(`max: ${answers.durationMax}`);
    if (['15', '18'].includes(answers.salesforceIdLength)) flagOptions.push(`length: ${answers.salesforceIdLength}`);
    if (answers.salesforceIdStartsWith) flagOptions.push(`startsWith: '${answers.salesforceIdStartsWith}'`);
    if (answers.fileOrDirExists) flagOptions.push('exists: true');
    if (answers.integerMin) flagOptions.push(`min: ${answers.integerMin}`);
    if (answers.integerMax) flagOptions.push(`max: ${answers.integerMax}`);
    if (answers.integerDefault && !answers.multiple) flagOptions.push(`default: ${answers.integerDefault}`);
    if (answers.integerDefault && answers.multiple) flagOptions.push(`default: [${answers.integerDefault}]`);
    if (answers.type === 'enum') flagOptions.push('options: []');

    const newFlag = `    ${answers.name}: Flags.${answers.type}({
      ${flagOptions.join(',\n      ')},
    }),`.split('\n');

    return newFlag;
  }
}
