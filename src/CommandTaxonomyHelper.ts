/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ensureArray } from '@salesforce/kit';
import * as inquirer from 'inquirer';
import { Answers, Question } from 'inquirer';
import { Messages } from '@salesforce/core';
import WordPOS = require('wordpos');

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'command.taxonomy.helper', [
  'messages.part-prompt',
  'messages.last-entry-empty',
  'messages.keep-entry',
]);

type Lookup = Record<string, string[]> & {
  pos: string;
  synonyms: string[];
};

export type POSResult = {
  index: number;
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  adverbs: string[];
  rest: string[];
  lookup: Lookup[];
};
export type SfThesaurus = {
  [key: string]: {
    nouns: string[];
    verbs: string[];
  };
};
export const SalesforceThesaurus: SfThesaurus = {
  org: {
    nouns: [
      'organization',
      'instance',
      'environment',
      'account',
      'customer',
      'tenant',
      'company',
      'scratch',
      'sandbox',
    ],
    verbs: [],
  },

  user: {
    nouns: ['person', 'account', 'customer', 'individual', 'member', 'owner', 'profile'],
    verbs: [],
  },
  sobject: {
    nouns: ['sobject', 'object', 'record', 'entity', 'instance', 'item', 'thing', 'resource'],
    verbs: [],
  },
};

type POS = 'noun' | 'verb' | 'all';

/* eslint-disable
   @typescript-eslint/no-unsafe-return,
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access
 */
type WordPOSOptions = typeof WordPOS.defaults;

export class CommandTaxonomyHelper {
  private wordPOS: typeof WordPOS;

  public constructor(options?: WordPOSOptions) {
    this.wordPOS = new WordPOS(options);
  }

  public async isConformingCommand(command: string): Promise<boolean> {
    if (!command) {
      return false;
    }
    const [product, action, resource, ..._] = await this.getPOS(command.split(':'));
    return product.nouns.length > 0 && action.verbs.length > 0 && resource.nouns.length > 0;
  }

  public async getPOS(text: string | string[]): Promise<POSResult[]> {
    return (
      await Promise.all(
        ensureArray(text).map(async (n, i) => {
          const lookup = await this.wordPOS.lookup(n);
          return { index: i, ...(await this.wordPOS.getPOS(n)), lookup };
        })
      )
    ).sort((a, b) => a.index - b.index);
  }

  public isNoun(text: string): Promise<boolean> {
    return this.wordPOS.isNoun(text).then((result) => {
      return result;
    });
  }

  public isVerb(text: string): Promise<boolean> {
    return this.wordPOS.isVerb(text).then((result) => {
      return result;
    });
  }

  /**
   * Build a conforming command name interactively, either starting with a command or from scratch.
   * The goal is to build a command that conforms to the taxonomy, of the form `product:action:resource`
   * where product and resource are nouns and action is a verb.
   *
   * The user is prompted for each part of the command, and the taxonomy is checked after each prompt.
   * Each part of the is checked to see if it is a noun or verb, based on the command part being entered.
   *
   * parts are:
   * 1. product noun
   * 2. action verb
   * 3. resource noun
   * 4. subresource any part of speech
   * 5. subresource any part of speech
   *
   *
   * @param command
   */
  public async buildConformingCommand(command: string | undefined): Promise<string> {
    const formatCommand = (pieces: string[]): string => pieces.filter((part) => part && part.length > 0).join(':');
    const partNames = ['product', 'action', 'resource', 'subresource', 'subresource'];
    const partsPOS: POS[] = ['noun', 'verb', 'noun', 'all', 'all'];
    const parts: string[] = command ? command.split(':') : Array(5).fill(undefined);
    const result = [...parts];
    // traverse the parts, prompting for each part
    let index = 0;
    for (index = 0; index < parts.length; index++) {
      const part = parts[index];
      const partName = partNames[index];
      const partPOS = partsPOS[index];
      const partPrompt = messages.getMessage('messages.part-prompt', [
        formatCommand(result),
        partPOS === 'all' ? 'name' : partPOS,
        partName,
      ]);
      const partResult = await this.resolvePart(part, partPrompt, partPOS);
      if (partResult) {
        result[index] = partResult;
      } else {
        const finished = (
          await inquirer.prompt({
            type: 'confirm',
            name: 'finished',
            message: messages.getMessage('messages.last-entry-empty'),
          })
        ).finished;
        if (finished) {
          break;
        } else {
          index--;
        }
      }
    }
    return formatCommand(result);
  }

  protected async isConformingPart(part: string, partPOS: POS): Promise<boolean> {
    if (partPOS === 'all') {
      return true;
    }
    if (partPOS === 'noun') {
      return this.isNoun(part);
    }
    return this.isVerb(part);
  }

  private async resolvePart(value: string, partPrompt: string, partPOS: POS): Promise<string> {
    const partValueQuestion: Question = {
      type: 'input',
      name: 'part',
      message: partPrompt,
      default: value ?? undefined,
    };
    let isConforming = false;
    let partResult: Answers;
    do {
      const synonyms = value ? await this.getSynonyms(value, partPOS) : [];
      partResult =
        synonyms.length > 0
          ? await inquirer.prompt([{ ...partValueQuestion, type: 'list', choices: synonyms }])
          : await inquirer.prompt([partValueQuestion]);
      isConforming = await this.isConformingPart(partResult.part as string, partPOS);
      if (!isConforming) {
        const keepAsIs = await inquirer.prompt({
          type: 'confirm',
          name: 'keep',
          message: messages.getMessage('messages.keep-entry', [partResult.part as string, partPOS]),
          default: false,
        });
        isConforming = keepAsIs.keep;
      }
    } while (!isConforming);

    if (isConforming) {
      return partResult.part;
    }

    return partResult.part;
  }

  private async getSynonyms(value: string, partPOS: POS): Promise<string[]> {
    const valuePOS = await this.getPOS(value);
    let synonyms: Set<string> = new Set();
    if (partPOS === 'all') {
      synonyms = new Set(valuePOS[0].lookup.map((lookup) => lookup.synonyms).flat());
    }
    if (partPOS === 'noun') {
      synonyms = new Set(
        valuePOS[0].lookup
          .filter((lookup) => lookup.pos === 'n')
          .map((lookup) => lookup.synonyms)
          .flat()
      );
    }
    if (partPOS === 'verb') {
      synonyms = new Set(
        valuePOS[0].lookup
          .filter((lookup) => lookup.pos === 'v')
          .map((lookup) => lookup.synonyms)
          .flat()
      );
    }
    return [...synonyms].sort();
  }
}
