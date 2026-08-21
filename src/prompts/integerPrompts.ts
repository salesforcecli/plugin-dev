/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
