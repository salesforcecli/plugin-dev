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

export class FlagBuilder {
  public constructor(private answers: FlagAnswers, private commandFilePath: string) {}

  // eslint-disable-next-line complexity
  public build(): string[] {
    const flagOptions = [`summary: messages.getMessage('flags.${this.answers.name}.summary')`];

    if (this.answers.char) flagOptions.push(`char: '${this.answers.char}'`);
    if (this.answers.required) flagOptions.push('required: true');
    if (this.answers.multiple) flagOptions.push('multiple: true');
    if (this.answers.durationUnit) flagOptions.push(`unit: '${this.answers.durationUnit}'`);
    if (this.answers.durationDefaultValue) flagOptions.push(`defaultValue: ${this.answers.durationDefaultValue}`);
    if (this.answers.durationMin) flagOptions.push(`min: ${this.answers.durationMin}`);
    if (this.answers.durationMax) flagOptions.push(`max: ${this.answers.durationMax}`);
    if (this.answers.salesforceIdLength && ['Both', '15', '18'].includes(this.answers.salesforceIdLength))
      flagOptions.push(
        `length: ${this.answers.salesforceIdLength === 'Both' ? "'both'" : this.answers.salesforceIdLength}`
      );
    if (this.answers.salesforceIdStartsWith) flagOptions.push(`startsWith: '${this.answers.salesforceIdStartsWith}'`);
    if (this.answers.fileOrDirExists) flagOptions.push('exists: true');
    if (this.answers.integerMin) flagOptions.push(`min: ${this.answers.integerMin}`);
    if (this.answers.integerMax) flagOptions.push(`max: ${this.answers.integerMax}`);
    if (this.answers.integerDefault && !this.answers.multiple)
      flagOptions.push(`default: ${this.answers.integerDefault}`);
    if (this.answers.integerDefault && this.answers.multiple)
      flagOptions.push(`default: [${this.answers.integerDefault}]`);

    const flagName = this.answers.name.includes('-') ? `'${this.answers.name}'` : this.answers.name;
    const newFlag = [
      `    ${flagName}: Flags.${this.answers.type}({`,
      ...flagOptions.map((o) => `      ${o},`),
      // custom has function invocation
      this.answers.type === 'custom' ? '    })(),' : '    }),',
    ];
    return newFlag;
  }

  public async apply(flagParts: string[]): Promise<string> {
    const lines = (await this.readFile()).replace(/\r\n/g, '\n').split('\n');

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
  }

  public async readFile(): Promise<string> {
    return fs.promises.readFile(this.commandFilePath, 'utf8');
  }
}
