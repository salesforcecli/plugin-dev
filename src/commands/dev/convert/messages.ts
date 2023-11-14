/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import { EOL } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(path.dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.convert.messages');

export type DevConvertMessagesResult = {
  path: string;
  contents: string;
};

type ValueType = string | string[] | Record<string, string>;

const skip1Line = `${EOL}${EOL}`;
export default class DevConvertMessages extends SfCommand<DevConvertMessagesResult[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'project-dir': Flags.directory({
      summary: messages.getMessage('flags.project-dir.summary'),
      char: 'p',
      default: '.',
      aliases: ['projectdir'],
    }),
    'file-name': Flags.file({
      exists: true,
      summary: messages.getMessage('flags.file-name.summary'),
      char: 'f',
      required: true,
      multiple: true,
      aliases: ['filename'],
    }),
  };

  public async run(): Promise<DevConvertMessagesResult[]> {
    const { flags } = await this.parse(DevConvertMessages);
    const projectDir = path.resolve(flags['project-dir']);
    const { name: pluginName } = JSON.parse(
      await fs.promises.readFile(path.resolve(projectDir, 'package.json'), 'utf8')
    ) as {
      name: string;
    };
    const loadedMessageDirectories: Set<string> = new Set();
    return Promise.all(
      flags['file-name']
        .filter((fileName) => !fileName.endsWith('.md'))
        .map(async (filename) => {
          const messageDirectory = path.dirname(path.resolve(filename));
          if (!loadedMessageDirectories.has(messageDirectory)) {
            Messages.importMessagesDirectory(messageDirectory);
            loadedMessageDirectories.add(messageDirectory);
          }
          const bundle: Messages<string> = Messages.loadMessages(pluginName, path.parse(filename).name);
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const contents = ([...bundle.messages.keys()] as string[])
            .map((key) =>
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              convertValue(key, bundle.messages.get(key) as ValueType)
            )
            .join(skip1Line);
          const newName = filename.replace(/\.js$|\.json$/, '.md');
          await fs.promises.writeFile(newName, contents, 'utf8');
          return {
            path: newName,
            contents,
          };
        })
    );
  }
}

const convertValue = (key: string, value: ValueType): string => {
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
