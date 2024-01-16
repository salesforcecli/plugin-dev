/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import input from '@inquirer/input';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.generate.flag');

export const optionsPrompt = async (accumulator: string[] = []): Promise<string[]> => {
  const option = await input({
    message: messages.getMessage('question.Options'),
  });
  if (!option) return accumulator;
  return optionsPrompt([...accumulator, option]);
};
