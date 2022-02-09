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
import { PackageJson } from '../types';
import { readJson } from '../util';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export default class Plugin extends Generator {
  private answers!: {
    name: string;
    description: string;
    org: string;
  };

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    const msg = 'Time to build a library!';

    this.log(yosay(`${msg} Version: ${version as string}`));

    this.answers = await this.prompt<{ name: string; description: string; org: string }>([
      {
        type: 'input',
        name: 'name',
        message: 'Name',
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
      name: `@salesforce/${this.answers.name}`,
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
  }

  public end(): void {
    exec('yarn build', { cwd: this.env.cwd });
  }
}
