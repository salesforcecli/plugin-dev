/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Deauthorizer, SfHook } from '@salesforce/sf-plugins-core';

export type MyEnv = {
  username: string;
  id: string;
  alias?: string;
};

export class MyEnvDeauthorizer extends Deauthorizer<MyEnv> {
  // eslint-disable-next-line @typescript-eslint/require-await
  public async find(): Promise<Record<string, MyEnv>> {
    return {
      'myEnv@salesforce.com': {
        username: 'myEnv@salesforce.com',
        id: '12345',
        alias: 'myenv',
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  public async remove(username: string): Promise<boolean> {
    try {
      // do something to remove myEnv auth auth
      return true;
    } catch {
      return false;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
const hook: SfHook.Logout = async function () {
  return new MyEnvDeauthorizer();
};

export default hook;
