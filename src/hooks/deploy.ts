/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { basename } from 'path';
import { Deployable, Deployer, generateTableChoices, SfHook } from '@salesforce/sf-plugins-core';

class MyEnvDeployable extends Deployable {
  public constructor(public myEnvDir: string, private parent: Deployer) {
    super();
  }

  public getName(): string {
    return basename(this.myEnvDir);
  }

  public getType(): string {
    return 'myEnv';
  }

  public getPath(): string {
    return basename(this.myEnvDir);
  }

  public getParent(): Deployer {
    return this.parent;
  }
}

export class MyEnvDeployer extends Deployer {
  public static NAME = 'Salesforce MyEnvs';

  private username!: string;

  public constructor(myEnvDir: string) {
    super();
    this.deployables = [new MyEnvDeployable(myEnvDir, this)];
  }

  public getName(): string {
    return MyEnvDeployer.NAME;
  }

  public async setup(flags: Deployer.Flags, options: Deployer.Options): Promise<Deployer.Options> {
    if (flags.interactive) {
      this.username = await this.promptForUsername();
    } else {
      this.username = (options.username as string) || (await this.promptForUsername());
    }
    return { username: this.username };
  }

  public async deploy(): Promise<void> {
    this.log(`Deploying to ${this.username}.`);
    await Promise.resolve();
  }

  public async promptForUsername(): Promise<string> {
    const columns = { name: 'Env' };
    const options = [{ name: 'Env1' }, { name: 'Env2' }];
    const { username } = await this.prompt<{ username: string }>([
      {
        name: 'username',
        message: 'Select the environment you want to deploy to:',
        type: 'list',
        choices: generateTableChoices(columns, options, false),
      },
    ]);
    return username;
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
const hook: SfHook.Deploy<MyEnvDeployer> = async function () {
  return [new MyEnvDeployer('myEnvs/')];
};

export default hook;
