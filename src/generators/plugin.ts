/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Generator from 'yeoman-generator';
import shelljs from 'shelljs';
import replace from 'replace-in-file';
import { Messages } from '@salesforce/core';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { stringToChoice } from '../prompts/functions.js';
import { NYC, PackageJson } from '../types.js';
import { readJson, validatePluginName } from '../util.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-dev', 'plugin.generator');

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../templates');

type PluginAnswers = {
  internal: boolean;
  name: string;
  description: string;
  author?: string;
  codeCoverage?: string;
};

function rm(filepath: string, options: { recursive?: boolean }): void {
  try {
    fs.rmSync(filepath, options);
  } catch {
    // do nothing
  }
}

/**
 * See https://yeoman.io/authoring/running-context.html for the overridable methods
 */
export default class Plugin extends Generator {
  private answers!: PluginAnswers;
  private githubUsername?: string;

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    this.log(messages.getMessage('info.start'));

    this.githubUsername = await this.getGitUsername();

    this.answers.internal = await confirm({ message: messages.getMessage('question.internal') });

    this.answers.name = await input({
      message: messages.getMessage(this.answers.internal ? 'question.internal.name' : 'question.external.name'),
      validate: (i: string): boolean | string => {
        const result = validatePluginName(i, this.answers.internal ? '2PP' : '3PP');
        if (result) return true;

        return messages.getMessage(this.answers.internal ? 'error.Invalid2ppName' : 'error.Invalid3ppName');
      },
    });
    this.answers.description = await input({ message: messages.getMessage('question.description') });
    if (!this.answers.internal) {
      this.answers.author = await input({
        message: messages.getMessage('question.author'),
        default: this.githubUsername,
      });
      this.answers.codeCoverage = await select({
        message: messages.getMessage('question.code-coverage'),
        default: '50%',
        choices: ['0%', '25%', '50%', '75%', '90%', '100%'].map(stringToChoice),
      });
    }

    const directory = path.resolve(this.answers.name);

    const templateRepo = this.answers.internal
      ? 'git clone https://github.com/salesforcecli/plugin-template-sf.git'
      : 'git clone https://github.com/salesforcecli/plugin-template-sf-external.git';
    shelljs.exec(`${templateRepo} ${directory}`);
    try {
      fs.rmSync(`${path.resolve(this.answers.name, '.git')}`, { recursive: true });
    } catch {
      // ignore
    }

    this.destinationRoot(directory);
    this.env.cwd = this.destinationPath();

    shelljs.exec('git init', { cwd: this.env.cwd });
  }

  public writing(): void {
    const pjson = readJson<PackageJson>(path.join(this.env.cwd, 'package.json'));

    this.sourceRoot(TEMPLATES_DIR);

    const updated: Partial<PackageJson> = this.answers.internal
      ? {
          name: `@salesforce/${this.answers.name}`,
          repository: `salesforcecli/${this.answers.name}`,
          homepage: `https://github.com/salesforcecli/${this.answers.name}`,
          description: this.answers.description,
        }
      : {
          name: this.answers.name,
          description: this.answers.description,
        };

    if (this.answers.author) updated.author = this.answers.author;

    const final = Object.assign({}, pjson, updated);

    if (!this.answers.internal && this.answers.codeCoverage) {
      const nycConfig = readJson<NYC>(path.join(this.env.cwd, '.nycrc'));
      const codeCoverage = Number.parseInt(this.answers.codeCoverage.replace('%', ''), 10);
      nycConfig['check-coverage'] = true;
      nycConfig.lines = codeCoverage;
      nycConfig.statements = codeCoverage;
      nycConfig.functions = codeCoverage;
      nycConfig.branches = codeCoverage;
      this.fs.writeJSON(this.destinationPath('.nycrc'), nycConfig);
    }

    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: this.answers.internal ? /plugin-template-sf/g : /plugin-template-sf-external/g,
      to: this.answers.name,
    });

    if (!this.answers.internal) {
      rm(path.join(this.env.cwd, 'CODE_OF_CONDUCT.md'), { recursive: true });
      rm(path.join(this.env.cwd, 'LICENSE.txt'), { recursive: true });
    }
  }

  public install(): void {
    try {
      shelljs.exec('yarn install', { cwd: this.env.cwd });
    } catch (e) {
      // Run yarn install in case dev-scripts detected changes during yarn build.
      shelljs.exec('yarn install', { cwd: this.env.cwd });
    }
  }
  public end(): void {
    shelljs.exec('yarn build', { cwd: this.env.cwd });

    if (this.answers.internal) {
      const dev = process.platform === 'win32' ? 'dev.cmd' : 'dev.js';
      shelljs.exec(`${path.join(path.resolve(this.env.cwd), 'bin', dev)} schema generate`, { cwd: this.env.cwd });
    }
  }

  private async getGitUsername(): Promise<string | undefined> {
    try {
      return await this.user.github.username();
    } catch {
      return undefined;
    }
  }
}
