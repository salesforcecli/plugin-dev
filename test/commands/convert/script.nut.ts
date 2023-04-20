/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('convert script NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create();
  });

  after(async () => {
    await session?.clean();
  });

  it('should display provided name', () => {
    const original = fs.readFileSync(path.join('test', 'commands', 'convert', 'script.sh'), 'utf8');

    execCmd(`convert:script --no-prompt --script ${path.join('test', 'commands', 'convert', 'script.sh')}`, {
      ensureExitCode: 0,
    });
    const script = fs.readFileSync(path.join('test', 'commands', 'convert', 'script.sh'), 'utf8');
    expect(script).to.not.contain('sfdx');
    expect(script).to.not.contain(':beta:');
    expect(script).to.contain('sf');
    expect(script).to.contain('--packages');
    expect(script).to.contain('--wait');
    expect(script).to.contain('--target-org');
    expect(script).to.contain('--target-org=myorg');
    expect(script).to.contain('--result-format=human');
    expect(script).to.contain('org:create:user');
    expect(script).to.contain('package:install');
    expect(script).to.contain('package:version:list');
    expect(script).to.contain('package:version:promote');
    expect(script).to.contain('apex:run:test');
    expect(script).to.contain(
      'sf project:deploy:start -p force-app --target-org=myorg # ERROR converting this line, human intervention required'
    );
    expect(script).to.not.contain(' -u ');
    expect(script).to.not.contain(' -o ');

    fs.writeFileSync(path.join('test', 'commands', 'convert', 'script.sh'), original, 'utf8');
  });
});
