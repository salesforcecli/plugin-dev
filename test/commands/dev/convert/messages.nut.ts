/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect, config } from 'chai';

config.truncateThreshold = 0;

describe('dev convert messsages NUTs', () => {
  const parentPath = path.resolve(path.join('test', 'commands', 'dev', 'convert', 'samples'));
  let resultPath: string;

  afterEach(async () => {
    await fs.promises.rm(resultPath);
  });

  it('converts a basic json file', async () => {
    resultPath = path.join(parentPath, 'messages', 'basic-json.md');
    execCmd(`dev:convert:messages -p ${parentPath} -f ${path.join(parentPath, 'messages', 'basic-json.json')}`, {
      ensureExitCode: 0,
    });
    expect(fs.existsSync(resultPath)).to.be.true;

    // works fine on windows, but can't make assertions about line endings

    if (process.platform !== 'win32') {
      // trim to control for EOL differences
      const result = (await fs.promises.readFile(resultPath, 'utf8')).trim();
      const expected = (await fs.promises.readFile(path.join(parentPath, 'expected.md'), 'utf8')).trim();
      expect(result).to.equal(expected);
    }
  });
  it('converts a basic js file', async () => {
    resultPath = path.join(parentPath, 'messages', 'basic-js.md');
    execCmd(`dev:convert:messages -p ${parentPath} -f ${path.join(parentPath, 'messages', 'basic-js.js')}`, {
      ensureExitCode: 0,
    });
    expect(fs.existsSync(resultPath)).to.be.true;

    // works fine on windows, but can't make assertions about line endings

    if (process.platform !== 'win32') {
      // trim to control for EOL differences
      const result = (await fs.promises.readFile(resultPath, 'utf8')).trim();
      const expected = (await fs.promises.readFile(path.join(parentPath, 'expected.md'), 'utf8')).trim();
      expect(result).to.equal(expected);
    }
  });
});
