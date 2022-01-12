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
import { Hook, PackageJson } from '../types';
import { addHookToPackageJson, readJson } from '../util';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export interface HookGeneratorOptions extends Generator.GeneratorOptions {
  name: string;
  event: string;
}

export default class HookGenerator extends Generator {
  public declare options: HookGeneratorOptions;
  public pjson!: PackageJson;

  public constructor(args: string | string[], opts: HookGeneratorOptions) {
    super(args, opts);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async prompting(): Promise<void> {
    this.pjson = readJson<PackageJson>(path.join(this.env.cwd, 'package.json'));
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

    this.pjson = addHookToPackageJson(this.options.event as Hook, filename, this.pjson);
    this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson);
  }
}
