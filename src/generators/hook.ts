/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { camelCase } from 'change-case';
import * as Generator from 'yeoman-generator';
import yosay = require('yosay');
import { PackageJson } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export interface CommandGeneratorOptions extends Generator.GeneratorOptions {
  name: string;
  event: string;
}

function toArray(item: string | string[]): string[] {
  return Array.isArray(item) ? item : [item];
}

export default class Command extends Generator {
  public options: CommandGeneratorOptions;
  public pjson!: PackageJson;

  public constructor(args: string | string[], opts: CommandGeneratorOptions) {
    super(args, opts);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async prompting(): Promise<void> {
    this.pjson = this.fs.readJSON('package.json') as unknown as PackageJson;
    this.log(yosay(`Adding a ${this.options.event} hook to ${this.pjson.name} Version: ${version as string}`));
  }

  public writing(): void {
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const filename = camelCase(this.options.event.replace('sf:', ''));
    this.fs.copyTpl(
      this.templatePath(`src/hooks/${this.options.event.replace(/:/g, '.')}.ts.ejs`),
      this.destinationPath(`src/hooks/${filename}.ts`),
      { year: new Date().getFullYear() }
    );

    // TODO
    // this.fs.copyTpl(
    //   this.templatePath('test/hook.test.ts.ejs'),
    //   this.destinationPath(`test/hooks/${this.options.event}/${this.options.name}.test.ts`),
    //   this
    // );

    this.pjson.oclif.hooks = this.pjson.oclif.hooks || {};
    const hooks = this.pjson.oclif.hooks;
    const p = `./lib/hooks/${filename}`;
    if (hooks[this.options.event]) {
      hooks[this.options.event] = [...toArray(hooks[this.options.event]), p];
    } else {
      this.pjson.oclif.hooks[this.options.event] = p;
    }

    this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson);
  }
}
