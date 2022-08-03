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
import { Hook, PackageJson } from '../types';
import { addHookToPackageJson, readJson } from '../util';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export default class Plugin extends Generator {
  private answers!: {
    name: string;
    description: string;
    hooks: Hook[];
  };

  public constructor(args: string | string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
    this.env.options.nodePackageManager = 'yarn';
  }

  public async prompting(): Promise<void> {
    const msg = 'Time to build an sf plugin!';

    this.log(yosay(`${msg} Version: ${version as string}`));

    this.answers = await this.prompt<{ name: string; description: string; hooks: Hook[] }>([
      {
        type: 'input',
        name: 'name',
        message: 'Name (must start with plugin-)',
        validate: (input: string): boolean => /plugin-[a-z]+$/.test(input),
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description',
      },
      {
        type: 'checkbox',
        name: 'hooks',
        message: 'Which commands do you plan to extend',
        choices: Object.values(Hook),
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
    const hooks = this.answers.hooks.map((h) => h.split(' ').join(':')) as Hook[];
    for (const hook of hooks) {
      const filename = camelCase(hook.replace('sf:', ''));
      this.fs.copyTpl(
        this.templatePath(`src/hooks/${hook.replace(/:/g, '.')}.ts.ejs`),
        this.destinationPath(`src/hooks/${filename}.ts`),
        { year: new Date().getFullYear() }
      );

      pjson = addHookToPackageJson(hook, filename, pjson);
    }

    const updated = {
      name: `@salesforce/${this.answers.name}`,
      repository: `salesforcecli/${this.answers.name}`,
      homepage: `https://github.com/salesforcecli/${this.answers.name}`,
      description: this.answers.description,
    };
    const final = Object.assign({}, pjson, updated);
    this.fs.writeJSON(this.destinationPath('./package.json'), final);

    replace.sync({
      files: `${this.env.cwd}/**/*`,
      from: /plugin-template-sf/g,
      to: this.answers.name,
    });
  }

  public end(): void {
    exec('yarn build', { cwd: this.env.cwd });
    exec(`${path.join(path.resolve(this.env.cwd), 'bin', 'dev')} schema generate`, { cwd: this.env.cwd });
  }
}
