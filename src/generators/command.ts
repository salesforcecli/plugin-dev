/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as Generator from 'yeoman-generator';
import yosay = require('yosay');
import { pascalCase } from 'change-case';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const { version } = require('../../package.json');

export interface CommandGeneratorOptions extends Generator.GeneratorOptions {
  name: string;
}

export default class Command extends Generator {
  public options: CommandGeneratorOptions;
  public pjson!: { name: string };

  public constructor(args: string | string[], opts: CommandGeneratorOptions) {
    super(args, opts);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async prompting(): Promise<void> {
    this.pjson = this.fs.readJSON('package.json') as unknown as { name: string };
    this.log(yosay(`Adding a command to ${this.pjson.name} Version: ${version as string}`));
  }

  public writing(): void {
    this.writeCmdFile();
    this.writeMessageFile();
    // TODO: this.writeNutFile();
  }

  private getMessageFileName(): string {
    return this.options.name.replace(/:/g, '.');
  }

  private writeCmdFile(): void {
    const cmdPath = this.options.name.split(':').join('/');
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const commandPath = this.destinationPath(`src/commands/${cmdPath}.ts`);
    const className = pascalCase(this.options.name);
    const year = new Date().getFullYear();
    const opts = {
      ...this.options,
      className,
      returnType: `${className}Result`,
      commandPath,
      year,
      pluginName: this.pjson.name,
      messageFile: this.getMessageFileName(),
    };
    this.fs.copyTpl(this.templatePath('src/command.ts.ejs'), commandPath, opts);
  }

  private writeMessageFile(): void {
    this.sourceRoot(path.join(__dirname, '../../templates'));
    const filename = this.getMessageFileName();
    const messagePath = this.destinationPath(`messages/${filename}.md`);
    this.fs.copyTpl(this.templatePath('messages/message.md.ejs'), messagePath, this.options);
  }
}
