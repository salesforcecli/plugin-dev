/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';

/**
 * handle empty string as valid answer, make it mean undefined.
 *
 * relies on the i being validate to be convertible to an integer using the prompt `validate` function
 */
export const toOptionalNumber = (i: string): number | undefined => (i.length === 0 ? undefined : parseInt(i, 10));

/** validation function for integers */
export const integerMinMaxValidation = (num: number, min?: number, max?: number): boolean | string => {
  Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
  const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

  if (!Number.isInteger(num)) return messages.getMessage('error.InvalidInteger');
  if (min !== undefined && num < min) return messages.getMessage('error.InvalidDefaultInteger');
  if (max !== undefined && num > max) return messages.getMessage('error.InvalidDefaultInteger');
  return true;
};
