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
  type: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
const hook: SfHook.EnvList<MyEnv> = async function (opts) {
  const allEnvs = [
    { username: 'Env1', alias: 'myenv', id: '12345', type: 'main' },
    { username: 'Env2', id: '67890', type: 'other' },
  ];
  const envs = opts.all ? allEnvs : allEnvs.filter((e) => e.type === 'main');

  return [
    {
      type: 'myEnv', // Required. The JSON key your envs will be placed under
      title: 'MyEnvs', // Required. The title that will placed above the table
      data: envs, // Required. List of environments
      keys: { username: 'Environment Name' }, // Optional. A mapping of keys to human readable names.
    },
  ];
};

export default hook;
