/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
import { exec } from 'shelljs';
import { env } from '@salesforce/kit';
import { expect } from 'chai';

describe('dev generate flag NUTs', () => {
  let session: TestSession;

  before(async () => {
    env.setString('TESTKIT_EXECUTABLE_PATH', path.join(process.cwd(), 'bin', 'dev'));
    session = await TestSession.create();

    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.Yes,
        'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
        'Select the existing "sf" commands you plan to extend': Interaction.ENTER,
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );
  });

  after(async () => {
    await session?.clean();
  });

  it('should generate a new flag', async () => {
    await execInteractiveCmd(
      'dev generate flag',
      {
        'Select the command': ['hello world', Interaction.ENTER],
        'Select the type': ['boolean', Interaction.ENTER],
        "flag's name": ['my-flag', Interaction.ENTER],
        'short description': Interaction.ENTER,
        'single-character short name': ['m', Interaction.ENTER],
        'flag required': Interaction.Yes,
      },
      { cwd: path.join(session.dir, 'plugin-template-sf-external'), ensureExitCode: 0 }
    );

    const localBin = path.join(session.dir, 'plugin-template-sf-external', 'bin', 'dev');
    const helpOutput = exec(`${localBin} hello world --help`, { silent: true });
    expect(helpOutput.stdout).to.contain('-m, --my-flag       (required) Summary for my-flag.');
  });
});
