/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import yeoman from 'yeoman-environment';
import { FlagAnswers } from './types.js';

export function generate(type: string, generatorOptions: Record<string, unknown> = {}): Promise<void> {
  const env = yeoman.createEnv();
  env.register(createRequire(import.meta.url).resolve(`./generators/${type}`), `sf:${type}`);
  return env.run(`sf:${type}`, generatorOptions);
}

export function readJson<T>(filePath: string): T {
  const pjsonRaw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(pjsonRaw) as T;
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.promises.access(file);
    return true;
  } catch {
    return false;
  }
}

export function validatePluginName(name: string, type: '2PP' | '3PP'): boolean {
  // This regex for valid npm package name is taken from https://github.com/dword-design/package-name-regex/blob/master/src/index.js
  const validNpmPackageName = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  const valid2PPName = /plugin-([a-z][a-z]*)(-[a-z]+)*$/;
  return type === '2PP' ? validNpmPackageName.test(name) && valid2PPName.test(name) : validNpmPackageName.test(name);
}

// eslint-disable-next-line complexity
export const build = (answers: FlagAnswers): string[] => {
  const flagOptions = [
    ...(answers.summary ? [`summary: messages.getMessage('flags.${answers.name}.summary')`] : []),
    ...(answers.char ? [`char: '${answers.char}'`] : []),
    ...(answers.required ? ['required: true'] : []),
    ...(answers.multiple ? ['multiple: true'] : []),
    ...(answers.durationUnit ? [`unit: '${answers.durationUnit}'`] : []),
    ...(answers.durationDefaultValue ? [`defaultValue: ${answers.durationDefaultValue}`] : []),
    ...(answers.durationMin ? [`min: ${answers.durationMin}`] : []),
    ...(answers.durationMax ? [`max: ${answers.durationMax}`] : []),
    ...(answers.salesforceIdLength && ['Both', '15', '18'].includes(answers.salesforceIdLength)
      ? [`length: ${answers.salesforceIdLength === 'Both' ? "'both'" : answers.salesforceIdLength}`]
      : []),
    ...(answers.salesforceIdStartsWith ? [`startsWith: '${answers.salesforceIdStartsWith}'`] : []),
    ...(answers.fileOrDirExists ? ['exists: true'] : []),
    ...(answers.integerMin ? [`min: ${answers.integerMin}`] : []),
    ...(answers.integerMax ? [`max: ${answers.integerMax}`] : []),
    ...(answers.integerDefault && !answers.multiple ? [`default: ${answers.integerDefault}`] : []),
    ...(answers.integerDefault && answers.multiple ? [`default: [${answers.integerDefault}]`] : []),
    ...(answers.options && answers.options.length > 0
      ? [`options: [${answers.options.map((o) => `'${o}'`).join(',')}] as const`]
      : []),
  ];

  const flagName = answers.name.includes('-') ? `'${answers.name}'` : answers.name;
  return flagOptions.length > 0
    ? [
        `    ${flagName}: Flags.${answers.type}({`,
        ...flagOptions.map((o) => `      ${o},`),
        // custom, option have function invocation
        ['custom', 'option'].includes(answers.type) ? '    })(),' : '    }),',
      ]
    : // single line "direct from import" with no invocation
      [`    ${flagName}: Flags.${answers.type}(),`];
};

export const apply = ({ flagParts, existing }: { flagParts: string[]; existing: string }): string => {
  const lines = existing.replace(/\r\n/g, '\n').split('\n');

  const flagsStartIndex = lines.findIndex(
    (line) => line.includes('public static flags') || line.includes('public static readonly flags')
  );

  // If index isn't found, that means that no flags are defined yet
  if (flagsStartIndex === -1) {
    const altFlagsStartIndex = lines.findIndex((line) => line.includes('public async run')) - 1;
    lines.splice(altFlagsStartIndex, 0, `public static readonly flags = {${flagParts.join(os.EOL)}};${os.EOL}`);
  } else {
    const flagsEndIndex = lines.slice(flagsStartIndex).findIndex((line) => line.endsWith('};')) + flagsStartIndex;
    lines.splice(flagsEndIndex, 0, ...flagParts);
  }

  const sfPluginsCoreImport = lines.findIndex((line) => line.includes("from '@salesforce/sf-plugins-core'"));

  const oclifCoreImport = lines.findIndex((line) => line.includes("from '@oclif/core'"));

  // add the Flags import from @salesforce/sf-plugins-core if it doesn't exist already
  if (!lines[sfPluginsCoreImport].includes('Flags')) {
    const line = lines[sfPluginsCoreImport];
    const endIndex = line.indexOf('}');
    lines[sfPluginsCoreImport] = line.substring(0, endIndex) + ', Flags' + line.substring(endIndex);
  }

  // ensure the Flags import is from @salesforce/sf-plugins-core
  if (oclifCoreImport !== -1 && lines[oclifCoreImport].includes('Flags')) {
    if (lines[oclifCoreImport] === "import { Flags } from '@oclif/core';") lines.splice(oclifCoreImport, 1);
    else {
      lines[oclifCoreImport] = lines[oclifCoreImport].replace('Flags,', '').replace(', Flags', '');
    }
  }

  return lines.join(os.EOL);
};
