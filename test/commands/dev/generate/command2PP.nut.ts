/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect, config } from 'chai';
import shelljs from 'shelljs';
import { PackageJson } from '../../../../src/types.js';
import { readJson, fileExists } from '../../../../src/util.js';
import { setup } from './pluginGenerateSetup.js';

config.truncateThreshold = 0;

describe('2PP', () => {
  let session: TestSession;
  let pluginExecutable: string;

  before(async () => {
    session = await setup('https://github.com/salesforcecli/plugin-template-sf.git');
    pluginExecutable = path.join(session.project.dir, 'bin', 'dev');
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
      shelljs.exec('bin/dev snapshot:generate', { silent: true });
      shelljs.exec('bin/dev schema:generate', { silent: true });
      const result = shelljs.exec('yarn test:only', { cwd: session.project.dir });
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

  describe('generated command under existing topic', () => {
    before(async () => {
      execCmd('dev generate command --name project:awesome:stuff --force --nuts --unit', {
        ensureExitCode: 0,
        cwd: session.project.dir,
      });

      execCmd('dev generate command --name hello:every:one --force --nuts --unit', {
        ensureExitCode: 0,
        cwd: session.project.dir,
      });
    });

    it('should add new subtopics in package.json', async () => {
      const packageJson = readJson<PackageJson>(path.join(session.project.dir, 'package.json'));
      expect(packageJson.oclif.topics.hello).to.deep.equal({
        description: 'Commands to say hello.',
        subtopics: {
          every: {
            description: 'description for hello.every',
          },
        },
      });
    });

    it('should add new topics in package.json', async () => {
      const packageJson = readJson<PackageJson>(path.join(session.project.dir, 'package.json'));
      expect(packageJson.oclif.topics.project).to.deep.equal({
        external: true,
        subtopics: {
          awesome: {
            description: 'description for project.awesome',
          },
        },
      });
    });
  });
});
