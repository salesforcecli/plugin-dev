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
import select from '@inquirer/select';
import input from '@inquirer/input';
import { Duration } from '@salesforce/kit';
import { Messages } from '@salesforce/core';
import { FlagAnswers } from '../types.js';
import { integerMinMaxValidation, toOptionalNumber } from './validations.js';
import { stringToChoice } from './functions.js';

export const durationPrompts = async (): Promise<
  Pick<FlagAnswers, 'durationUnit' | 'durationMin' | 'durationMax' | 'durationDefaultValue'>
> => {
  Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
  const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

  const durationUnits = Object.values(Duration.Unit)
    .filter((unit) => typeof unit === 'string')
    .map((unit) => unit.toLowerCase());

  const durationUnit = (await select({
    message: messages.getMessage('question.Duration.Unit'),
    choices: durationUnits.map(stringToChoice),
  })) as FlagAnswers['durationUnit'];

  const durationMin = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Duration.Minimum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return integerMinMaxValidation(Number(i));
      },
    })
  );
  const durationMax = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Duration.Maximum'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return integerMinMaxValidation(Number(i), durationMin);
      },
    })
  );
  const durationDefaultValue = toOptionalNumber(
    await input({
      message: messages.getMessage('question.Duration.DefaultValue'),
      validate: (i: string): string | boolean => {
        if (!i) return true;
        return integerMinMaxValidation(Number(i), durationMin, durationMax);
      },
    })
  );

  return { durationUnit, durationMin, durationMax, durationDefaultValue };
};
