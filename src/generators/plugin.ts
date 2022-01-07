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

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export interface PluginGeneratorOptions extends Generator.GeneratorOptions {
  name: string;
}

export interface PackageJson {
  name: string;
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  oclif: {
    bin: string;
    dirname: string;
    hooks: Record<string, string | string[]>;
  };
  repository: string;
  homepage: string;
}

export default class Plugin extends Generator {
  private name: string;
  private answers!: {
    description: string;
  };

  public constructor(args: string | string[], opts: PluginGeneratorOptions) {
    super(args, opts);
    this.name = opts.name;
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    const msg = 'Time to build an sf plugin!';
    const directory = path.resolve(this.name);

    this.log(yosay(`${msg} Version: ${version as string}`));
    exec(`git clone git@github.com:salesforcecli/plugin-template-sf.git ${directory}`);
    fs.rmSync(`${path.resolve(this.name, '.git')}`, { recursive: true });

    this.destinationRoot(directory);
    this.env.cwd = this.destinationPath();
    this.answers = await this.prompt<{ description: string }>([
      {
        type: 'input',
        name: 'description',
        message: 'description',
      },
    ]);
  }

  public writing(): void {
    const pjsonRaw = fs.readFileSync(path.join(this.env.cwd, 'package.json'), 'utf-8');
    const pjson = JSON.parse(pjsonRaw) as PackageJson;
    const updated = {
      name: `@salesforce/${this.name}`,
      repository: `salesforcecli/${this.name}`,
      homepage: `https://github.com/salesforcecli/${this.name}`,
      description: this.answers.description,
    };
    const final = Object.assign({}, pjson, updated);
    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: /plugin-template-sf/g,
      to: this.name,
    });
  }
}
