/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TestSession } from '@salesforce/cli-plugins-testkit';
import shelljs from 'shelljs';

export async function setup(repo: string): Promise<TestSession> {
  const session = await TestSession.create({
    project: {
      gitClone: repo,
    },
  });
  shelljs.exec('yarn', { cwd: session.project.dir, silent: true });
  shelljs.exec('yarn build', { cwd: session.project.dir, silent: true });
  return session;
}
