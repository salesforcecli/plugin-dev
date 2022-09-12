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
import { Nullable } from '@salesforce/ts-types';
import { Duration } from '@salesforce/kit';

import { Config, toConfiguredId, toStandardizedId } from '@oclif/core';
import ModuleLoader from '@oclif/core/lib/module-loader';
import * as fg from 'fast-glob';
import { fileExists } from '../../../util';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.generate.flag', [
  'description',
  'errors.InvalidDir',
  'examples',
  'flags.dry-run.summary',
  'summary',
]);

type Answers = {
  char: Nullable<string>;
  type: keyof typeof Flags;
  name: string;
  required: boolean;
  multiple: boolean;
  durationUnit: Lowercase<keyof typeof Duration.Unit>;
  durationDefaultValue: number;
  salesforceIdLength: '15' | '18' | 'None';
  salesforceIdStartsWith: string;
  fileOrDirExists: boolean;
  integerMin: number;
  integerMax: number;
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

    if (!fileExists('package.json')) throw messages.createError('errors.InvalidDir');

    const ids = (await fg('src/commands/**/*.ts')).map((file) => {
      const p = path.parse(file.replace(path.join('.', 'src', 'commands'), ''));
      const topics = p.dir.split('/');
      const command = p.name !== 'index' && p.name;
      const id = [...topics, command].filter((f) => f).join(':');
      return id === '' ? '.' : id;
    });

    const { command } = await this.prompt<{ command: string }>([
      {
        type: 'list',
        name: 'command',
        message: 'Select a command to add a flag to',
        choices: ids.map((c) => toConfiguredId(c, this.config)),
      },
    ]);

    const commandFilePath = path.join('.', 'src', 'commands', ...toStandardizedId(command, this.config).split(':'));

    const existingFlags = await this.loadExistingFlags(commandFilePath);

    const charToFlag = Object.entries(existingFlags).reduce((acc, [key, value]) => {
      return value.char ? { ...acc, [value.char]: key } : acc;
    }, {} as Record<string, string>);

    const durationUnits = (Object.values(Duration.Unit).filter((unit) => typeof unit === 'string') as string[]).map(
      (unit) => unit.toLowerCase()
    );

    const answers = await this.prompt<Answers>([
      {
        type: 'list',
        name: 'type',
        message: 'What type of flag is this',
        choices: Object.keys(Flags).sort(),
      },
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the flag',
        validate: (input: string): string | boolean => {
          if (toLowerKebabCase(input) !== input) {
            return 'Flag name must be in kebab case (example: my-flag)';
          }

          if (Object.keys(existingFlags).includes(input)) {
            return `The ${input} flag already exists`;
          }

          return true;
        },
      },
      {
        type: 'input',
        name: 'char',
        message: 'Flag short character (optional)',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          if (charToFlag[input]) return `The ${input} character is already used by the ${charToFlag[input]} flag`;
          if (!/[A-Z]|[a-z]/g.test(input)) return 'Flag short character must be a letter';
          if (input.length > 1) return 'Must be a single character';
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'required',
        message: 'Is this flag required',
        default: false,
      },
      {
        type: 'confirm',
        name: 'multiple',
        message: 'Can this flag be specified multiple times',
        default: false,
      },
      {
        type: 'list',
        name: 'durationUnit',
        message: 'What unit should be used for duration',
        choices: durationUnits,
        when: (ans: Answers): boolean => ans.type === 'duration',
      },
      {
        type: 'input',
        name: 'durationDefaultValue',
        message: 'Default value for this duration (optional)',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : 'Must be an integer';
        },
        when: (ans: Answers): boolean => ans.type === 'duration',
      },
      {
        type: 'list',
        name: 'salesforceIdLength',
        message: 'Required length for salesforceId',
        choices: ['15', '18', 'None'],
        when: (ans: Answers): boolean => ans.type === 'salesforceId',
      },
      {
        type: 'input',
        name: 'salesforceIdStartsWith',
        message: 'Required prefix for salesforceId (optional)',
        when: (ans: Answers): boolean => ans.type === 'salesforceId',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return input.length === 3 ? true : 'Must be 3 characters';
        },
      },
      {
        type: 'confirm',
        name: 'fileOrDirExists',
        message: 'Does this flag require the file or directory to exist',
        default: false,
        when: (ans: Answers): boolean => ['file', 'directory'].includes(ans.type),
      },
      {
        type: 'input',
        name: 'integerMin',
        message: 'Minimum required value for integer flag (optional)',
        when: (ans: Answers): boolean => ans.type === 'integer',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : 'Must be an integer';
        },
      },
      {
        type: 'input',
        name: 'integerMax',
        message: 'Maximum required value for integer flag (optional)',
        when: (ans: Answers): boolean => ans.type === 'integer',
        validate: (input: string): string | boolean => {
          if (!input) return true;
          return Number.isInteger(Number(input)) ? true : 'Must be an integer';
        },
      },
    ]);

    const flagOptions = [`summary: messages.getMessage('flags.${answers.name}.summary')`];

    if (answers.char) flagOptions.push(`char: '${answers.char}'`);
    if (answers.required) flagOptions.push('required: true');
    if (answers.multiple) flagOptions.push('multiple: true');
    if (answers.durationUnit) flagOptions.push(`unit: ${answers.durationUnit}`);
    if (answers.durationDefaultValue) flagOptions.push(`defaultValue: ${answers.durationDefaultValue}`);
    if (['15', '18'].includes(answers.salesforceIdLength)) flagOptions.push(`length: ${answers.salesforceIdLength}`);
    if (answers.salesforceIdStartsWith) flagOptions.push(`startsWith: ${answers.salesforceIdStartsWith}`);
    if (answers.fileOrDirExists) flagOptions.push('exists: true');
    if (answers.integerMin) flagOptions.push(`min: ${answers.integerMin}`);
    if (answers.integerMax) flagOptions.push(`max: ${answers.integerMax}`);

    const newFlag = `    ${answers.name}: Flags.${answers.type}({
      ${flagOptions.join(',\n      ')},
    }),`.split('\n');

    if (flags['dry-run']) {
      this.styledHeader('New flag:');
      this.log(newFlag.join('\n'));
      return;
    }

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
      lines.splice(messagesEndIndex, 0, `  'flags.${answers.name}.summary',`);
    }

    await fs.writeFile(`${commandFilePath}.ts`, lines.join('\n'));

    this.log(`Added ${answers.name} flag to ${commandFilePath}.ts`);
  }

  private async loadExistingFlags(
    commandFilePath: string
  ): Promise<Record<string, { type: 'boolean' | 'option'; char?: string }>> {
    const config = new Config({ root: process.cwd() });
    config.root = config.options.root;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await ModuleLoader.load(config, commandFilePath);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const existingFlags = module.default.flags as Record<string, { type: 'boolean' | 'option'; char?: string }>;

    return existingFlags;
  }
}