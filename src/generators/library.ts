/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Generator from 'yeoman-generator';
import { exec } from 'shelljs';
import replace = require('replace-in-file');
import { PackageJson } from '../types';
import { readJson } from '../util';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

type Answers = {
  name: string;
  description: string;
  org: string;
  scope: string;
};

function containsInvalidChars(input: string): boolean {
  return input.split('').some((i) => '!#$%^&*() ?/\\,.";\':|{}[]~`'.includes(i));
}

export default class Library extends Generator {
  private answers!: Answers;

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    const msg = 'Time to build a library!';

    this.log(`${msg} Version: ${version as string}`);

    this.answers = await this.prompt<Answers>([
      {
        type: 'input',
        name: 'scope',
        message: 'Npm Scope',
        default: '@salesforce',
        validate: (input: string): boolean | string => {
          if (!input) return 'You must provide a scope.';
          if (!input.startsWith('@')) return 'Scope must start with @.';
          if (containsInvalidChars(input)) return 'Scope must not contain invalid characters.';
          if (input.length < 2) return 'Scope length must be greater than one';
          return true;
        },
      },
      {
        type: 'input',
        name: 'name',
        message: 'Name',
        validate: (input: string): boolean | string => {
          if (!input) return 'You must provide a package name.';
          if (containsInvalidChars(input)) return 'Name must not contain invalid characters.';
          else return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description',
      },
      {
        type: 'input',
        name: 'org',
        message: 'Github Org',
        default: 'forcedotcom',
        validate: (input: string): boolean | string => {
          if (!input) return 'You must provide a Github Org.';
          if (containsInvalidChars(input)) return 'Github Org must not contain invalid characters.';
          else return true;
        },
      },
    ]);

    const directory = path.resolve(this.answers.name);
    exec(`git clone git@github.com:forcedotcom/library-template.git ${directory}`);
    fs.rmSync(`${path.resolve(this.answers.name, '.git')}`, { recursive: true });
    this.destinationRoot(directory);
    this.env.cwd = this.destinationPath();
  }

  public writing(): void {
    const pjson = readJson<PackageJson>(path.join(this.env.cwd, 'package.json'));

    this.sourceRoot(path.join(__dirname, '../../templates'));

    const updated = {
      name: `${this.answers.scope}/${this.answers.name}`,
      repository: `${this.answers.org}/${this.answers.name}`,
      homepage: `https://github.com/${this.answers.org}/${this.answers.name}`,
      description: this.answers.description,
    };
    const final = Object.assign({}, pjson, updated);
    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: /library-template/g,
      to: this.answers.name,
    });

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: /forcedotcom/g,
      to: this.answers.org,
    });

    replace.sync({
      files: `${this.env.cwd}/README.md`,
      from: /@salesforce/g,
      to: this.answers.scope,
    });
  }

  public end(): void {
    exec('yarn build', { cwd: this.env.cwd });
  }
}
