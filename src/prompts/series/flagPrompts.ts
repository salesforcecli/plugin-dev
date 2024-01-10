/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { Messages } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';
import { keysOf } from '@salesforce/ts-types';
import { kebabCase } from 'change-case';
import { Config, Command } from '@oclif/core';
import { FlagAnswers } from '../../types.js';

import { durationPrompts } from '../durationPrompts.js';
import { stringToChoice } from '../functions.js';
import { integerPrompts } from '../integerPrompts.js';
import { optionsPrompt } from '../optionsPrompt.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

const summaryPrompt = async (name: string): Promise<string> =>
  input({
    message: messages.getMessage('question.FlagSummary'),
    default: messages.getMessage('default.FlagSummary', [name]),
    validate: (i: string): string | boolean => {
      if (i[0].toLowerCase() === i[0] || !i.endsWith('.')) {
        return messages.getMessage('error.InvalidSummary');
      }

      return true;
    },
  });

const loadExistingFlags = async (commandId: string): Promise<Record<string, Command.Flag.Any>> => {
  const config = new Config({ root: process.cwd() });
  config.root = config.options.root;
  await config.load();
  const cmd = config.commands.find((c) => c.id === commandId);
  return cmd?.flags ?? {};
};

export const askQuestions = async (commandFilePath: string): Promise<FlagAnswers> => {
  const existingFlags = await loadExistingFlags(commandFilePath);

  const charToFlag = Object.entries(existingFlags).reduce<Record<string, string>>(
    (acc, [key, value]) => (value.char ? { ...acc, [value.char]: key } : acc),
    {}
  );

  const type = await select<FlagAnswers['type']>({
    message: messages.getMessage('question.FlagType'),
    choices: keysOf(Flags).sort().map(stringToChoice).map(addDescription),
  });
  const useStandard =
    ['requiredOrg', 'optionalOrg', 'requiredHub', 'optionalHub', 'orgApiVersion'].includes(type) &&
    (await confirm({
      message: messages.getMessage('question.UseStandard'),
      default: true,
    }));

  const name = await input({
    message: messages.getMessage('question.FlagName'),
    ...(useStandard ? getDefaultForStandardFlag(type) : {}),
    validate: (i: string): string | boolean => {
      if (!i) return messages.getMessage('error.FlagNameRequired');
      if (kebabCase(i) !== i) {
        return messages.getMessage('error.KebabCase');
      }
      if (Object.keys(existingFlags).includes(i)) {
        return messages.getMessage('error.FlagExists', [i]);
      }
      return true;
    },
  });
  return {
    type,
    name,
    ...(useStandard
      ? {}
      : {
          summary: await summaryPrompt(name),
          char: await input({
            message: messages.getMessage('question.FlagShortChar'),
            validate: (i: string): string | boolean => {
              if (!i) return true;
              if (charToFlag[i]) return messages.getMessage('error.FlagShortCharExists', [i, charToFlag[i]]);
              if (!/[A-Z]|[a-z]/g.test(i)) return messages.getMessage('error.InvalidFlagShortChar');
              if (i.length > 1) return messages.getMessage('error.InvalidFlagShortCharLength');
              return true;
            },
          }),
          required: await confirm({
            message: messages.getMessage('question.RequiredFlag'),
            default: false,
          }),
        }),
    ...(type !== 'boolean'
      ? {
          multiple: await confirm({
            message: messages.getMessage('question.AllowMultiple'),
            default: false,
          }),
        }
      : {}),
    ...(type === 'duration' ? await durationPrompts() : {}),
    ...(type === 'salesforceId' ? await salesforceIdPrompts() : {}),
    ...(type === 'file' || type === 'directory'
      ? {
          fileOrDirExists: await confirm({ message: messages.getMessage('question.FileDir.Exists'), default: false }),
        }
      : {}),
    ...(type === 'integer' ? await integerPrompts() : {}),
    ...(type === 'option' ? { options: await optionsPrompt() } : {}),
  };
};

const salesforceIdPrompts = async (): Promise<Pick<FlagAnswers, 'salesforceIdLength' | 'salesforceIdStartsWith'>> => ({
  salesforceIdLength: await select<FlagAnswers['salesforceIdLength']>({
    message: messages.getMessage('question.SalesforceId.Length'),
    choices: (['Both', '15', '18', 'None'] as const).map(stringToChoice),
  }),
  salesforceIdStartsWith: await input({
    message: messages.getMessage('question.SalesforceId.StartsWith'),
    validate: (i: string): string | boolean => {
      if (!i) return true;
      return i.length === 3 ? true : messages.getMessage('error.InvalidSalesforceIdPrefix');
    },
  }),
});

const addDescription = (choice: FlagChoice): FlagChoice => ({
  ...choice,
  description: flagDescriptions.get(choice.value) ?? '',
});

type SelectChoice<T> = {
  value: T;
  name?: string;
  description?: string;
  disabled?: boolean | string;
  type?: never;
};

type FlagChoice = SelectChoice<keyof typeof Flags>;

const getDefaultForStandardFlag = (type: keyof typeof Flags): { default: string } | Record<string, never> =>
  standardFlagDefaultNames.has(type) ? { default: standardFlagDefaultNames.get(type) as string } : {};

const standardFlagDefaultNames = new Map<keyof typeof Flags, string>([
  ['orgApiVersion', 'api-version'],
  ['requiredOrg', 'target-org'],
  ['requiredHub', 'target-dev-hub'],
  ['optionalOrg', 'target-org'],
  ['optionalHub', 'target-dev-hub'],
]);

const flagDescriptions = new Map<keyof typeof Flags, string>([
  ['duration', messages.getMessage('flagDescriptions.duration')],
  ['option', messages.getMessage('flagDescriptions.option')],
  ['integer', messages.getMessage('flagDescriptions.integer')],
  ['custom', messages.getMessage('flagDescriptions.custom')],
  ['salesforceId', messages.getMessage('flagDescriptions.salesforceId')],
  ['file', messages.getMessage('flagDescriptions.file')],
  ['directory', messages.getMessage('flagDescriptions.directory')],
  ['orgApiVersion', messages.getMessage('flagDescriptions.orgApiVersion')],
  ['requiredOrg', messages.getMessage('flagDescriptions.requiredOrg')],
  ['requiredHub', messages.getMessage('flagDescriptions.requiredHub')],
  ['optionalOrg', messages.getMessage('flagDescriptions.optionalOrg')],
  ['optionalHub', messages.getMessage('flagDescriptions.optionalHub')],
]);
