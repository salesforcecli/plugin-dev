/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';

describe('dev generate plugin NUTs', () => {
  let session: TestSession;

  before(async () => {
    env.setString('TESTKIT_EXECUTABLE_PATH', path.join(process.cwd(), 'bin', 'dev'));
    session = await TestSession.create({});
  });

  after(async () => {
    await session?.clean();
  });

  it('should do interactive things', async () => {
    const result = await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.Yes,
        'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
        'Select the existing "sf" commands you plan to extend': [
          Interaction.SELECT,
          Interaction.DOWN,
          Interaction.SELECT,
          Interaction.ENTER,
        ],
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );

    // eslint-disable-next-line no-console
    console.log('result', result);
  });
});
