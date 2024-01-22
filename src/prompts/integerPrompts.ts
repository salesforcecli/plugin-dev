/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import input from '@inquirer/input';
import { Messages } from '@salesforce/core';
import { FlagAnswers } from '../types.js';
import { integerMinMaxValidation, toOptionalNumber } from './validations.js';

export const integerPrompts = async (): Promise<Pick<FlagAnswers, 'integerMin' | 'integerMax' | 'integerDefault'>> => {
  Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
  const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

  const integerMin = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Integer.Minimum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return integerMinMaxValidation(Number(i));
      },
    })
  );
  const integerMax = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Integer.Maximum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return integerMinMaxValidation(Number(i), integerMin);
      },
    })
  );
  const integerDefault = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Integer.Default'),
      validate: (i: string): string | boolean => {
        if (!i)
          return typeof integerMax === 'number' || typeof integerMin === 'number'
            ? messages.getMessage('error.RequiredIntegerDefault')
            : true;
        return integerMinMaxValidation(Number(i), integerMin, integerMax);
      },
    })
  );

  return { integerMin, integerMax, integerDefault };
};
