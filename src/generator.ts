/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFile } from 'ejs';
import { Ux } from '@salesforce/sf-plugins-core';
import { Logger, SfError } from '@salesforce/core';
import { AsyncOptionalCreatable } from '@salesforce/kit';
import { colorize } from '@oclif/core/ux';
import shelljs from 'shelljs';
import { fileExists } from './util.js';
import { PackageJson } from './types.js';

async function readPackageJson(): Promise<PackageJson> {
  try {
    return JSON.parse(await readFile('package.json', 'utf-8')) as PackageJson;
  } catch {
    throw new SfError('This command must be run inside a plugin directory');
  }
}

export class Generator extends AsyncOptionalCreatable {
  public pjson!: PackageJson;
  private templatesDir!: string;
  private force: boolean | undefined;
  private dryRun: boolean | undefined;
  private ux = new Ux();
  private logger = Logger.childFromRoot('dev-generator');

  public constructor(opts?: { dryRun?: boolean; force?: boolean }) {
    super(opts);
    this.dryRun = opts?.dryRun;
    this.force = opts?.dryRun ?? opts?.force;
    this.templatesDir = join(dirname(fileURLToPath(import.meta.url)), '../templates');
    this.logger = Logger.childFromRoot('dev-generator');
    this.logger.debug(`Templates directory: ${this.templatesDir}`);
  }

  public async render(source: string, destination: string, data?: Record<string, unknown>): Promise<void> {
    const fullSource = join(this.templatesDir, source);
    const dryRunMsg = this.dryRun ? '[DRY RUN] ' : '';
    this.logger.debug(`${dryRunMsg}Rendering template ${fullSource} to ${destination}`);

    const rendered = await new Promise<string>((resolve, reject) => {
      renderFile(fullSource, data ?? {}, (err, str) => {
        if (err) reject(err);
        return resolve(str);
      });
    });

    let verb = 'Creating';
    if (rendered) {
      const relativePath = relative(process.cwd(), destination);
      if (await fileExists(destination)) {
        const confirmation =
          this.force ??
          (await (
            await import('@inquirer/confirm')
          ).default({
            message: `Overwrite ${relativePath}?`,
          }));
        if (confirmation) {
          verb = 'Overwriting';
        } else {
          this.ux.log(`${dryRunMsg}${colorize('yellow', 'Skipping')} ${relativePath}`);
          return;
        }
      }

      this.ux.log(`${dryRunMsg}${colorize('yellow', verb)} ${relativePath}`);

      if (!this.dryRun) {
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, rendered);
      }
    }
  }

  public execute(cmd: string): void {
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${cmd}`);
      return;
    }

    this.logger.debug(`Executing command: ${cmd}`);
    shelljs.exec(cmd);
  }

  public async writePjson(): Promise<void> {
    const updating = colorize('yellow', 'Updating');
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${updating} package.json`);
      return;
    }

    this.ux.log(`${updating} package.json`);
    await writeFile('package.json', JSON.stringify(this.pjson, null, 2));
  }

  protected async init(): Promise<void> {
    this.pjson = await readPackageJson();
  }
}
