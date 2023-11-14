/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

// because we're loading information from `this.config.commands/plugins` we need to be running from a CLI that knows about all of
// the commands and plugins (sfdx/sf) and so running from './bin/dev' won't work :/

describe.skip('convert script NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create();
  });

  after(async () => {
    await session?.clean();
  });

  it('should display provided name', () => {
    const scriptPath = path.join('test', 'commands', 'dev', 'convert', 'samples', 'script.sh');

    execCmd(`dev:convert:script --no-prompt --script ${scriptPath}`, {
      ensureExitCode: 0,
    });
    const script = fs.readFileSync(
      path.join('test', 'commands', 'dev', 'convert', 'samples', 'script-converted.sh'),
      'utf8'
    );
    expect(script).to.not.contain('sfdx');
    expect(script).to.not.contain(':beta:');
    expect(script).to.not.contain('config:set');
    expect(script).to.contain('sf');
    expect(script).to.contain('--packages');
    expect(script).to.contain('--wait');
    expect(script).to.contain('--target-org');
    expect(script).to.contain('--target-org=myorg');
    expect(script).to.contain('--result-format=human');
    expect(script).to.contain('package install');
    expect(script).to.contain('package version list');
    expect(script).to.contain('package version promote');
    expect(script).to.contain('apex run test');
    expect(script).to.contain(
      'sf project deploy start -p force-app --target-org=myorg # ERROR converting this line, human intervention required'
    );
    expect(script).to.not.contain(' -u ');
    expect(script).to.not.contain(' -o ');

    fs.unlinkSync(path.join('test', 'commands', 'dev', 'convert', 'samples', 'script-converted.sh'));
  });
});
