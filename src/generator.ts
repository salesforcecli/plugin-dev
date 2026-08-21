/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFile } from 'ejs';
import { Ux } from '@salesforce/sf-plugins-core';
import { Logger } from '@salesforce/core';
import { colorize } from '@oclif/core/ux';
import shelljs from 'shelljs';
import spawn from 'cross-spawn';
import replace from 'replace-in-file';
import { fileExists } from './util.js';
import { PackageJson } from './types.js';

export class Generator {
  public pjson!: PackageJson;
  private templatesDir!: string;
  private force: boolean | undefined;
  private dryRun: boolean | undefined;
  private ux = new Ux();
  private logger = Logger.childFromRoot('dev-generator');
  private workingDir: string = process.cwd();

  public constructor(opts?: { dryRun?: boolean; force?: boolean }) {
    this.dryRun = opts?.dryRun;
    this.force = opts?.dryRun ?? opts?.force;
    this.templatesDir = join(dirname(fileURLToPath(import.meta.url)), '../templates');
    this.logger = Logger.childFromRoot('dev-generator');
    this.logger.debug(`Templates directory: ${this.templatesDir}`);
  }

  public get cwd(): string {
    return this.workingDir;
  }

  public set cwd(value: string) {
    this.workingDir = normalize(value);
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

    // Tokenize into discrete argv entries so arguments are passed to the child
    // process individually rather than as one shell-interpreted string. Callers
    // double-quote arguments that may contain spaces (e.g. paths), so keep a
    // quoted span as a single token and strip its surrounding quotes.
    const [bin, ...args] = (cmd.match(/"[^"]*"|\S+/g) ?? []).map((token) => token.replace(/^"|"$/g, ''));
    const isBinPath = bin.includes('/') || bin.includes('\\');
    const resolved = isBinPath ? bin : shelljs.which(bin)?.toString();
    if (!resolved) {
      throw new Error(`Could not find "${bin}" on PATH`);
    }

    this.logger.debug(`Executing command: ${[resolved, ...args].join(' ')}`);

    // Pass argv as an array with no shell so a value like `C:\path\repo&calc.exe&\`
    // is treated as literal data and cannot break out to hijack the shell.
    // cross-spawn handles Windows .cmd/.bat shims (e.g. yarn.cmd) safely.
    spawn.sync(resolved, args, { cwd: this.cwd, stdio: 'inherit' });
  }

  public async loadPjson(): Promise<PackageJson> {
    try {
      this.pjson = JSON.parse(await readFile(join(this.cwd, 'package.json'), 'utf-8')) as PackageJson;
    } catch {
      if (this.dryRun) {
        this.pjson = {
          name: '',
          description: '',
          dependencies: {},
          devDependencies: {},
          files: [],
          bugs: '',
          homepage: '',
          repository: '',
          oclif: {
            bin: '',
            topics: {},
            dirname: '',
          },
          author: '',
          // @ts-expect-error - not all properties are required
          scripts: {},
          // @ts-expect-error - not all properties are required
          wireit: {},
        };
      }
    }

    return this.pjson;
  }

  public async writePjson(): Promise<void> {
    const updating = colorize('yellow', 'Updating');
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${updating} package.json`);
      return;
    }

    this.ux.log(`${updating} package.json`);
    await writeFile(join(this.cwd, 'package.json'), JSON.stringify(this.pjson, null, 2));
  }

  public replace({ from, to, files }: { files: string; from: RegExp; to: string }): void {
    const replacing = colorize('yellow', 'Replacing');
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${replacing} ${from} with ${to} in ${files}`);
      return;
    }

    this.logger.debug(`${replacing} ${from} with ${to} in ${files}`);
    replace.sync({
      files,
      from,
      to,
    });
  }

  public async remove(path: string): Promise<void> {
    const fullPath = join(this.cwd, path);
    const removing = colorize('yellow', 'Removing');
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${removing} ${fullPath}`);
      return;
    }

    this.ux.log(`${removing} ${fullPath}`);
    await rm(fullPath, { recursive: true, force: true });
  }

  public async readJson<T>(path: string): Promise<T> {
    if (this.dryRun) {
      return {} as T;
    }

    return JSON.parse(await readFile(join(this.cwd, path), 'utf-8')) as T;
  }

  public async writeJson<T>(path: string, data: T): Promise<void> {
    const fullPath = join(this.cwd, path);
    const writing = colorize('yellow', 'Writing');
    if (this.dryRun) {
      this.ux.log(`[DRY RUN] ${writing} to ${fullPath}`);
      return;
    }

    this.ux.log(`${writing} to ${fullPath}`);
    await writeFile(fullPath, JSON.stringify(data, null, 2));
  }
}
