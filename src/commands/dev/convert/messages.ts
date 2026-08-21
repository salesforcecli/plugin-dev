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
import fs from 'node:fs';
import { EOL } from 'node:os';
import path from 'node:path';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'dev.convert.messages');

export type DevConvertMessagesResult = {
  path: string;
  contents: string;
};

export type DevConvertMessagesResults = DevConvertMessagesResult[];

type ValueType = string | string[] | Record<string, string>;

const skip1Line = `${EOL}${EOL}`;
export default class DevConvertMessages extends SfCommand<DevConvertMessagesResults> {
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

  public async run(): Promise<DevConvertMessagesResults> {
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
