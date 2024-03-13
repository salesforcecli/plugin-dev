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
import input from '@inquirer/input';
import { PackageJson } from '../types.js';
import { readJson } from '../util.js';

type Answers = {
  name: string;
  description: string;
  org: string;
  scope: string;
};

const containsInvalidChars = (i: string): boolean =>
  i.split('').some((part) => '!#$%^&*() ?/\\,.";\':|{}[]~`'.includes(part));

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../templates');

export default class Library extends Generator {
  private answers!: Answers;

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    this.log('Time to build a library!');

    this.answers = {
      scope: await input({
        message: 'Npm Scope (should start with @)',
        default: '@salesforce',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a scope.';
          if (!i.startsWith('@')) return 'Scope must start with @.';
          if (containsInvalidChars(i)) return 'Scope must not contain invalid characters.';
          if (i.length < 2) return 'Scope length must be greater than one';
          return true;
        },
      }),
      name: await input({
        message: 'Name',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a package name.';
          if (containsInvalidChars(i)) return 'Name must not contain invalid characters.';
          else return true;
        },
      }),
      description: await input({ message: 'Description' }),
      org: await input({
        message: 'Github Org',
        default: 'forcedotcom',
        validate: (i: string): boolean | string => {
          if (!i) return 'You must provide a Github Org.';
          if (containsInvalidChars(i)) return 'Github Org must not contain invalid characters.';
          else return true;
        },
      }),
    };

    const directory = path.resolve(this.answers.name);
    shelljs.exec(`git clone -b ew/update-template git@github.com:forcedotcom/library-template.git ${directory}`);
    fs.rmSync(`${path.resolve(this.answers.name, '.git')}`, { recursive: true });
    this.destinationRoot(directory);
    this.env.cwd = this.destinationPath();
  }

  public writing(): void {
    const pjson = readJson<PackageJson>(path.join(this.env.cwd, 'package.json'));

    this.sourceRoot(TEMPLATES_DIR);

    const updated = {
      name: `${this.answers.scope}/${this.answers.name}`,
      repository: `${this.answers.org}/${this.answers.name}`,
      homepage: `https://github.com/${this.answers.org}/${this.answers.name}`,
      description: this.answers.description,
      bugs: { url: `https://github.com/${this.answers.org}/${this.answers.name}/issues` },
    };
    const final = Object.assign({}, pjson, updated);
    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    // Replace the message import
    replace.sync({
      files: `${this.env.cwd}/src/hello.ts`,
      from: /@salesforce\/library-template/g,
      to: `${this.answers.scope}/${this.answers.name}`,
    });

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
    shelljs.exec('yarn build', { cwd: this.env.cwd });
  }
}
