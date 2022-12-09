/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { EOL } from 'os';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-dev', 'dev.convert.messages', [
  'summary',
  'description',
  'examples',
  'flags.filename.summary',
]);

export type DevConvertMessagesResult = {
  path: string;
  contents: string;
};

const skip1Line = `${EOL}${EOL}`;
export default class DevConvertMessages extends SfCommand<DevConvertMessagesResult[]> {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');

  public static flags = {
    filename: Flags.file({
      exists: true,
      summary: messages.getMessage('flags.filename.summary'),
      char: 'f',
      required: true,
      multiple: true,
    }),
  };

  public async run(): Promise<DevConvertMessagesResult[]> {
    const { flags } = await this.parse(DevConvertMessages);

    return Promise.all(
      flags.filename.map(async (filename) => {
        const original = JSON.parse(await fs.promises.readFile(filename, 'utf8')) as Record<
          string,
          string | Record<string, string> | string[]
        >;
        const newName = filename.replace('.json', '.md');
        const contents = Object.entries(original)
          // .map(([key, value]) => `# ${key}\n\n${Array.isArray(value) ? value.join('\n\n') : value}\n\n`)
          .map(([key, value]) => convertValue(key, value))
          .join(`${skip1Line}`);
        await fs.promises.writeFile(newName, contents, 'utf8');
        return {
          path: newName,
          contents,
        };
      })
    );
  }
}

const convertValue = (key: string, value: string | string[] | Record<string, string>): string => {
  if (typeof value === 'string') {
    // trim, and also convert any internal new line characters to os EOL
    return `# ${key}${skip1Line}${value.trim()}`;
  } else if (Array.isArray(value)) {
    return [`# ${key}`, `${skip1Line}- ` + value.join(`${skip1Line}- `)].join('');
  } else {
    return Object.entries(value)
      .map(([subkey, subvalue]) => convertValue(`${key}.${subkey}`, subvalue))
      .join(`${skip1Line}`);
  }
};
