/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect, config } from 'chai';

config.truncateThreshold = 0;

describe('dev convert messsages NUTs', () => {
  const parentPath = path.join('test', 'commands', 'dev', 'convert', 'samples');
  const resultPath = path.join(parentPath, 'basic.md');

  after(async () => {
    await fs.promises.rm(resultPath);
  });

  it('converts a basic file', async () => {
    execCmd(`dev:convert:messages -f ${path.join(parentPath, 'basic.json')}`, { ensureExitCode: 0 });
    expect(fs.existsSync(resultPath)).to.be.true;

    // trim to control for EOL differences
    const result = (await fs.promises.readFile(resultPath, 'utf8')).trim();
    const expected = (await fs.promises.readFile(path.join(parentPath, 'expected.md'), 'utf8')).trim();
    expect(result).to.equal(expected);
  });
});
