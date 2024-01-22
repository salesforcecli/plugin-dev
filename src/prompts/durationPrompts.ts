/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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

  const durationUnits = (Object.values(Duration.Unit).filter((unit) => typeof unit === 'string') as string[]).map(
    (unit) => unit.toLowerCase()
  );

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
