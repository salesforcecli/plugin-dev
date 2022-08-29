/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as Generator from 'yeoman-generator';
import yosay = require('yosay');
import got from 'got';
import { pascalCase } from 'change-case';
import { set } from '@salesforce/kit';
import { get } from '@salesforce/ts-types';
import { PackageJson, Topic } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export interface CommandGeneratorOptions extends Generator.GeneratorOptions {
  name: string;
  nuts: boolean;
  unit: boolean;
}

export function addTopics(newCmd: string, commands: string[] = []): Record<string, Topic> {
  const updated: Record<string, Topic> = {};

  const paths: string[] = [];
  const parts = newCmd.split(':').slice(0, -1);
  while (parts.length > 0) {
    const name = parts.join('.');
    if (name) paths.push(name);
    parts.pop();
  }

  for (const p of paths) {
    const isExternal = commands.includes(p);
    const existing = get(updated, p);
    if (existing) {
      const merged = isExternal
        ? {
            external: true,
            subtopics: existing,
          }
        : {
            description: `description for ${p}`,
            subtopics: existing,
          };
      set(updated, p, merged);
    } else {
      const entry = isExternal ? { external: true } : { description: `description for ${p}` };
      set(updated, p, entry);
    }
  }

  return updated;
}

export default class Command extends Generator {
  public declare options: CommandGeneratorOptions;
  public pjson!: PackageJson;

  public constructor(args: string | string[], opts: CommandGeneratorOptions) {
    super(args, opts);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async prompting(): Promise<void> {
    this.pjson = this.fs.readJSON('package.json') as unknown as PackageJson;
    this.log(yosay(`Adding a command to ${this.pjson.name} Version: ${version as string}`));

    if (this.pjson.scripts['test:command-reference']) {
      const commandSnapshotUrl = 'https://raw.githubusercontent.com/salesforcecli/cli/main/command-snapshot.json';
      const commandSnapshot = await got(commandSnapshotUrl).json<Array<{ command: string }>>();
      const commands = commandSnapshot.map((c) => c.command.replace(/:/g, '.'));
      const newTopics = addTopics(this.options.name, commands);
      this.pjson.oclif.topics = { ...this.pjson.oclif.topics, ...newTopics };
    } else {
      const newTopics = addTopics(this.options.name);
      this.pjson.oclif.topics = { ...this.pjson.oclif.topics, ...newTopics };
    }

    this.fs.writeJSON('package.json', this.pjson);
  }

  public writing(): void {
    this.writeCmdFile();
    this.writeMessageFile();
    this.writeNutFile();
    this.writeUnitTestFile();
  }

  private getMessageFileName(): string {
    return this.options.name.replace(/:/g, '.');
  }

  private writeCmdFile(): void {
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const cmdPath = this.options.name.split(':').join('/');
    const commandPath = this.destinationPath(`src/commands/${cmdPath}.ts`);
    const className = pascalCase(this.options.name);
    const opts = {
      ...this.options,
      className,
      returnType: `${className}Result`,
      commandPath,
      year: new Date().getFullYear(),
      pluginName: this.pjson.name,
      messageFile: this.getMessageFileName(),
    };
    this.fs.copyTpl(this.templatePath('src/command.ts.ejs'), commandPath, opts);
  }

  private writeMessageFile(): void {
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const filename = this.getMessageFileName();
    const messagePath = this.destinationPath(`messages/${filename}.md`);
    this.fs.copyTpl(this.templatePath('messages/message.md.ejs'), messagePath, this.options);
  }

  private writeNutFile(): void {
    if (!this.options.nuts) return;
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const cmdPath = this.options.name.split(':').join('/');
    const nutPah = this.destinationPath(`test/commands/${cmdPath}.nut.ts`);
    const opts = {
      cmd: this.options.name.split(':').join(' '),
      year: new Date().getFullYear(),
      pluginName: this.pjson.name,
      messageFile: this.getMessageFileName(),
    };
    this.fs.copyTpl(this.templatePath('test/command.nut.ts.ejs'), nutPah, opts);
  }

  private writeUnitTestFile(): void {
    if (!this.options.unit) return;
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const cmdPath = this.options.name.split(':').join('/');
    const unitPath = this.destinationPath(`test/commands/${cmdPath}.test.ts`);
    this.fs.copyTpl(this.templatePath('test/command.test.ts.ejs'), unitPath, {
      ...this.options,
      year: new Date().getFullYear(),
    });
  }
}
