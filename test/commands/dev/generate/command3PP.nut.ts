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

import path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect, config } from 'chai';
import shelljs from 'shelljs';
import { PackageJson } from '../../../../src/types.js';
import { readJson, fileExists } from '../../../../src/util.js';
import { setup } from './pluginGenerateSetup.js';

config.truncateThreshold = 0;

describe('3PP', () => {
  let session: TestSession;
  let pluginExecutable: string;

  before(async () => {
    session = await setup('https://github.com/salesforcecli/plugin-template-sf-external.git');
    pluginExecutable =
      process.platform === 'win32'
        ? path.join(session.project.dir, 'bin', 'dev.cmd')
        : path.join(session.project.dir, 'bin', 'dev.js');
  });

  after(async () => {
    await session?.clean();
  });

  describe('generated command', () => {
    const name = 'do:awesome:stuff';
    const command = `dev generate command --name ${name} --force --nuts --unit`;

    before(async () => {
      execCmd(command, { ensureExitCode: 0, cwd: session.project.dir, silent: true });
    });

    it('should generate a command that can be executed', () => {
      const result = shelljs.exec(`${pluginExecutable} do awesome stuff --name Astro`, { silent: true });
      expect(result.code).to.equal(0);
      expect(result.stdout).to.contain('hello Astro');
    });

    it('should generate a markdown message file', async () => {
      const messagesFile = path.join(session.project.dir, 'messages', `${name.replace(/:/g, '.')}.md`);
      expect(await fileExists(messagesFile)).to.be.true;
    });

    it('should generate a passing NUT', async () => {
      const parts = name.split(':');
      const cmd = parts.pop();
      const nutFile = path.join(session.project.dir, 'test', 'commands', ...parts, `${cmd}.nut.ts`);
      expect(await fileExists(nutFile)).to.be.true;

      const result = shelljs.exec('yarn test:nuts', {
        cwd: session.project.dir,
        silent: true,
        env: {
          ...process.env,
          TESTKIT_EXECUTABLE_PATH: pluginExecutable,
          // Disable wireit's GitHub Actions cache for the generated sub-project. In CI the
          // outer job sets WIREIT_CACHE=github (plus cache credentials), which this child
          // process would otherwise inherit and use to hit GitHub's cache service — a source
          // of transient HTTP failures. Locally WIREIT_CACHE is unset (local disk cache).
          WIREIT_CACHE: 'none',
        },
      });
      expect(result.code).to.equal(0);
      expect(result.stdout).include(`${name.replace(/:/g, ' ')} NUTs`);
    });

    it('should generate a passing unit test', async () => {
      const parts = name.split(':');
      const cmd = parts.pop();
      const unitTestFile = path.join(session.project.dir, 'test', 'commands', ...parts, `${cmd}.test.ts`);
      expect(await fileExists(unitTestFile)).to.be.true;
      const result = shelljs.exec('yarn test:only', {
        cwd: session.project.dir,
        env: {
          ...process.env,
          // See note above: avoid inheriting WIREIT_CACHE=github in CI, which makes the
          // generated sub-project hit GitHub's flaky cache service.
          WIREIT_CACHE: 'none',
        },
      });
      expect(result.code).to.equal(0);
      expect(result.stdout).include(name.replace(/:/g, ' '));
    });

    it('should add new topics in package.json', async () => {
      const packageJson = readJson<PackageJson>(path.join(session.project.dir, 'package.json'));
      expect(packageJson.oclif.topics.do).to.deep.equal({
        description: 'description for do',
        subtopics: {
          awesome: {
            description: 'description for do.awesome',
          },
        },
      });
    });
  });
});
