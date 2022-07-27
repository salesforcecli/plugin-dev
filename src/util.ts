/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { createEnv } from 'yeoman-environment';
import { Hook, PackageJson } from './types';

export async function generate(type: string, generatorOptions: Record<string, unknown> = {}): Promise<void> {
  const env = createEnv();
  env.register(require.resolve(`./generators/${type}`), `sf:${type}`);
  return new Promise((resolve, reject) => {
    env.run(`sf:${type}`, generatorOptions, (err: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function readJson<T>(filePath: string): T {
  const pjsonRaw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(pjsonRaw) as T;
}

export function toArray(item: string | string[]): string[] {
  return Array.isArray(item) ? item : [item];
}

export function addHookToPackageJson(hook: Hook, filename: string, pjson: PackageJson): PackageJson {
  pjson.oclif.hooks = pjson.oclif.hooks || {};
  const p = `./lib/hooks/${filename}`;
  if (pjson.oclif.hooks[hook]) {
    pjson.oclif.hooks[hook] = [...toArray(pjson.oclif.hooks[hook]), p];
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
