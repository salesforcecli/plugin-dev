/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { createEnv } from 'yeoman-environment';
import { ensureArray } from '@salesforce/kit';
import { Hook, PackageJson } from './types';

export function generate(type: string, generatorOptions: Record<string, unknown> = {}): Promise<void> {
  const env = createEnv();
  env.register(require.resolve(`./generators/${type}`), `sf:${type}`);
  return env.run(`sf:${type}`, generatorOptions);
}

export function readJson<T>(filePath: string): T {
  const pjsonRaw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(pjsonRaw) as T;
}

export function addHookToPackageJson(hook: Hook, filename: string, pjson: PackageJson): PackageJson {
  pjson.oclif.hooks = pjson.oclif.hooks || {};
  const p = `./lib/hooks/${filename}`;
  if (pjson.oclif.hooks[hook]) {
    pjson.oclif.hooks[hook] = [...ensureArray(pjson.oclif.hooks[hook]), p];
  } else {
    pjson.oclif.hooks[hook] = p;
  }
  return pjson;
}

export function fileExists(file: string): boolean {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}
