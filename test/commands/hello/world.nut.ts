/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';
import { expect } from 'chai';
import { HelloWorldResult } from '../../../src/commands/hello/world';

let testSession: TestSession;

describe('hello world NUTs', () => {
  before('prepare session', async () => {
    env.setString('TESTKIT_EXECUTABLE_PATH', path.join(process.cwd(), 'bin', 'dev'));
    testSession = await TestSession.create({ authStrategy: 'NONE' });
  });

  after(async () => {
    await testSession?.clean();
  });

  it('should say hello to the world', () => {
    const { result } = execCmd<HelloWorldResult>('hello world --json', { ensureExitCode: 0, cli: 'sf' }).jsonOutput;
    expect(result.name).to.equal('World');
  });

  it('should say hello to a given person', () => {
    const { result } = execCmd<HelloWorldResult>('hello world --name Astro --json', {
      ensureExitCode: 0,
      cli: 'sf',
    }).jsonOutput;
    expect(result.name).to.equal('Astro');
  });
});
