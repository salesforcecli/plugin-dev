/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
import shelljs from 'shelljs';
import { expect } from 'chai';

function getLocalBin(...parts: string[]): string {
  return path.join(...parts, 'bin', process.platform === 'win32' ? 'dev.cmd' : 'dev');
}

// Flag generator doesn't work on Windows (W-11823784)
(process.platform === 'win32' ? describe.skip : describe)('dev generate flag NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create();

    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.Yes,
        'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );
  });

  after(async () => {
    await session?.clean();
  });

  it('should generate a new boolean flag', async () => {
    await execInteractiveCmd(
      'dev generate flag',
      {
        'Select the command': ['hello world', Interaction.ENTER],
        'Select the type': ['boolean', Interaction.ENTER],
        "flag's name": ['my-boolean-flag', Interaction.ENTER],
        'short description': Interaction.ENTER,
        'single-character short name': ['m', Interaction.ENTER],
        'flag required': Interaction.Yes,
      },
      { cwd: path.join(session.dir, 'plugin-awesome'), ensureExitCode: 0 }
    );

    const localBin = getLocalBin(session.dir, 'plugin-awesome');
    const helpOutput = shelljs.exec(`${localBin} hello world --help`, { silent: false });
    expect(helpOutput.stdout).to.contain('-m, --my-boolean-flag');
  });

  it('should generate a new integer flag', async () => {
    await execInteractiveCmd(
      'dev generate flag',
      {
        'Select the command': ['hello world', Interaction.ENTER],
        'Select the type': ['integer', Interaction.ENTER],
        "flag's name": ['my-integer-flag', Interaction.ENTER],
        'short description': Interaction.ENTER,
        'single-character short name': ['i', Interaction.ENTER],
        'flag required': Interaction.No,
        'specified multiple times': Interaction.Yes,
        'minimum integer value': ['0', Interaction.ENTER],
        'maximum integer value': ['10', Interaction.ENTER],
        'default integer value': ['5', Interaction.ENTER],
      },
      { cwd: path.join(session.dir, 'plugin-awesome'), ensureExitCode: 0 }
    );

    const localBin = getLocalBin(session.dir, 'plugin-awesome');
    const helpOutput = shelljs.exec(`${localBin} hello world --help`, { silent: false });
    expect(helpOutput.stdout).to.contain('-i, --my-integer-flag=<value>...');
  });
});
