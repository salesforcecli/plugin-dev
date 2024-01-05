/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import input from '@inquirer/input';
import { Messages } from '@salesforce/core';
import { FlagAnswers } from '../types.js';

export const integerPrompts = async (): Promise<Pick<FlagAnswers, 'integerMin' | 'integerMax' | 'integerDefault'>> => {
  Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
  const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

  const integerMin = Number(
    await input({
      message: messages.getMessage('question.Integer.Minimum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return Number.isInteger(Number(i)) ? true : messages.getMessage('error.InvalidInteger');
      },
    })
  );
  const integerMax = Number(
    await input({
      message: messages.getMessage('question.Integer.Maximum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        if (!Number.isInteger(Number(i))) return messages.getMessage('error.InvalidInteger');
        return !integerMin || Number(i) > integerMin ? true : messages.getMessage('error.IntegerMaxLessThanMin');
      },
    })
  );
  const integerDefault = Number(
    await input({
      message: messages.getMessage('question.Integer.Default'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        const num = Number(i);
        if (!Number.isInteger(num)) return messages.getMessage('error.InvalidInteger');
        return (!integerMin || num >= integerMin) && (!integerMax || num <= integerMax)
          ? true
          : messages.getMessage('error.InvalidDefaultInteger');
      },
    })
  );

  return { integerMin, integerMax, integerDefault };
};
