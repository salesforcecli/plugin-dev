/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Generator from 'yeoman-generator';
import yosay = require('yosay');
import { exec } from 'shelljs';
import replace = require('replace-in-file');
import { camelCase } from 'change-case';
import { Hook, NYC, PackageJson } from '../types';
import { addHookToPackageJson, readJson } from '../util';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

type PluginAnswers = {
  internal: boolean;
  name: string;
  description: string;
  hooks?: Hook[];
  author?: string;
  codeCoverage?: string;
};

export default class Plugin extends Generator {
  private answers!: PluginAnswers;
  private githubUsername!: string;

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    const msg = 'Time to build an sf plugin!';

    this.log(yosay(`${msg} Version: ${version as string}`));
    this.githubUsername = await this.getGitUsername();

    this.answers = await this.prompt<PluginAnswers>([
      {
        type: 'confirm',
        name: 'internal',
        message: 'Are you building a plugin for an internal Salesforce team?',
      },
      {
        type: 'input',
        name: 'name',
        message: 'Name (must start with plugin-)',
        validate: (input: string): boolean => /plugin-[a-z]+$/.test(input),
        when: (answers: { internal: boolean }): boolean => answers.internal,
      },
      {
        type: 'input',
        name: 'name',
        message: 'Name',
        validate: (input: string): boolean => Boolean(input),
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description',
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: this.githubUsername,
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
      {
        type: 'list',
        name: 'codeCoverage',
        message: 'What % code coverage do you want to enforce',
        default: '50%',
        choices: ['0%', '25%', '50%', '75%', '90%', '100%'],
        when: (answers: { internal: boolean }): boolean => !answers.internal,
      },
      {
        type: 'checkbox',
        name: 'hooks',
        message: 'Which commands do you plan to extend',
        choices: Object.values(Hook),
        when: (answers: { internal: boolean }): boolean => answers.internal,
      },
    ]);

    const directory = path.resolve(this.answers.name);
    exec(`git clone https://github.com/salesforcecli/plugin-template-sf.git ${directory}`);
    fs.rmSync(`${path.resolve(this.answers.name, '.git')}`, { recursive: true });
    this.destinationRoot(directory);
    this.env.cwd = this.destinationPath();
  }

  public writing(): void {
    let pjson = readJson<PackageJson>(path.join(this.env.cwd, 'package.json'));

    this.sourceRoot(path.join(__dirname, '../../templates'));
    const hooks = (this.answers.hooks ?? []).map((h) => h.split(' ').join(':')) as Hook[];
    for (const hook of hooks) {
      const filename = camelCase(hook.replace('sf:', ''));
      this.fs.copyTpl(
        this.templatePath(`src/hooks/${hook.replace(/:/g, '.')}.ts.ejs`),
        this.destinationPath(`src/hooks/${filename}.ts`),
        { year: new Date().getFullYear() }
      );

      pjson = addHookToPackageJson(hook, filename, pjson);
    }

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

    if (!this.answers.internal) {
      // If we are building a 3PP plugin, we don't want to set defaults for these properties.
      // We could ask these questions in the prompt, but that would be too many questions for a good UX.
      // We want developers to be able to quickly get up and running with their plugin.
      delete final.homepage;
      delete final.repository;
      delete final.bugs;

      // 3PP plugins don't need these tests.
      delete final.scripts['test:json-schema'];
      delete final.scripts['test:deprecation-policy'];
      delete final.scripts['test:command-reference'];
      final.scripts.posttest = 'yarn lint';

      // 3PP plugins don't need these either.
      // Can't use the class's this.fs since it doesn't delete the directory, just the files in it.
      fs.rmSync(this.destinationPath('./schemas'), { recursive: true });
      fs.rmSync(this.destinationPath('./.git2gus'), { recursive: true });
      fs.rmSync(this.destinationPath('./.github'), { recursive: true });
      fs.rmSync(this.destinationPath('./command-snapshot.json'));

      // Remove /schemas from the published files.
      final.files = final.files.filter((f) => f !== '/schemas');

      this.fs.delete(this.destinationPath('./.circleci/config.yml'));
      this.fs.copy(
        this.destinationPath('./.circleci/external.config.yml'),
        this.destinationPath('./.circleci/config.yml')
      );

      const nycConfig = readJson<NYC>(path.join(this.env.cwd, '.nycrc'));
      const codeCoverage = Number.parseInt(this.answers.codeCoverage.replace('%', ''), 10);
      nycConfig['check-coverage'] = true;
      nycConfig.lines = codeCoverage;
      nycConfig.statements = codeCoverage;
      nycConfig.functions = codeCoverage;
      nycConfig.branches = codeCoverage;
      delete nycConfig.extends;

      this.fs.writeJSON(this.destinationPath('.nycrc'), nycConfig);
    }

    this.fs.delete(this.destinationPath('./.circleci/external.config.yml'));

    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: this.answers.internal ? /plugin-template-sf/g : /@salesforce\/plugin-template-sf/g,
      to: this.answers.name,
    });
  }

  public end(): void {
    exec('git init', { cwd: this.env.cwd });
    exec('yarn build', { cwd: this.env.cwd });
    // Run yarn install in case dev-scripts detected changes during yarn build.
    exec('yarn install', { cwd: this.env.cwd });
    if (this.answers.internal) {
      exec(`${path.join(path.resolve(this.env.cwd), 'bin', 'dev')} schema generate`, { cwd: this.env.cwd });
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
