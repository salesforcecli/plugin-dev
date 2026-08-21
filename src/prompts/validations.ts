/*
 * Copyright 2025, Salesforce, Inc.
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
