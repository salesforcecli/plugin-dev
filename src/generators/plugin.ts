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
import replace = require('replace-in-file');
import { Messages } from '@salesforce/core';
import { NYC, PackageJson } from '../types.js';
import { readJson, validatePluginName } from '../util.js';

Messages.importMessagesDirectory(path.dirname(fileURLToPath(import.meta.url)));
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
  private githubUsername?: string | null;

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    this.log(messages.getMessage('info.start'));

    this.githubUsername = await this.getGitUsername();

    this.answers = await this.prompt<PluginAnswers>([
      {
        type: 'confirm',
        name: 'internal',
        message: messages.getMessage('question.internal'),
      },
      {
        type: 'input',
        name: 'name',
        message: messages.getMessage('question.internal.name'),
        validate: (input: string): boolean | string => {
          const result = validatePluginName(input, '2PP');
          if (result) return true;

          return messages.getMessage('error.Invalid2ppName');
        },
        when: (answers: { internal: boolean }): boolean => answers.internal,
      },
      {
        type: 'input',
        name: 'name',
        message: messages.getMessage('question.external.name'),
        validate: (input: string): string | boolean => {
          const result = validatePluginName(input, '3PP');
          if (result) return true;

          return messages.getMessage('error.Invalid3ppName');
        },
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
      {
        type: 'input',
        name: 'description',
        message: messages.getMessage('question.description'),
      },
      {
        type: 'input',
        name: 'author',
        message: messages.getMessage('question.author'),
        default: this.githubUsername,
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
      {
        type: 'list',
        name: 'codeCoverage',
        message: messages.getMessage('question.code-coverage'),
        default: '50%',
        choices: ['0%', '25%', '50%', '75%', '90%', '100%'],
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
    ]);

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
      shelljs.exec(`${path.join(path.resolve(this.env.cwd), 'bin', 'dev')} schema generate`, { cwd: this.env.cwd });
    }
  }

  private async getGitUsername(): Promise<string | null> {
    try {
      return await this.user.github.username();
    } catch {
      return null;
    }
  }
}
