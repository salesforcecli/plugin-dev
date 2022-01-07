/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfCommand } from '@salesforce/sf-plugins-core';
import { createEnv } from 'yeoman-environment';

/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

export abstract class GeneratorCommand extends SfCommand<void> {
  public static enableJsonFlag = false;
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async generate(type: string, generatorOptions: Record<string, unknown> = {}): Promise<void> {
    const env = createEnv();
    env.register(require.resolve(`./generators/${type}`), `sf:${type}`);
    // @ts-ignore
    await env.run(`sf:${type}`, generatorOptions);
  }
}
