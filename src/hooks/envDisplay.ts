/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfHook } from '@salesforce/sf-plugins-core';

export type MyEnv = {
  username: string;
  id: string;
  alias?: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
const hook: SfHook.EnvDisplay<MyEnv> = async function (opts) {
  const envs = [
    { username: 'Env1', alias: 'myenv', id: '12345' },
    { username: 'Env2', id: '67890' },
  ];
  const env = envs.find((e) => e.username === opts.targetEnv || e.alias === opts.targetEnv) ?? null;
  return {
    data: env, // Required. The environment that matches the provided target env (opt.targetEnv). Return null if there are no matching envs
    keys: { username: 'Environment Name' }, // Optional. A mapping of keys to human readable names.
  };
};

export default hook;
