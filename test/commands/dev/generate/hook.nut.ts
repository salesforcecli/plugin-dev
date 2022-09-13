/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';
import { expect } from 'chai';
import { PackageJson } from '../../../../src/types';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('dev generate hook NUTs', () => {
  let session: TestSession;

  before(async () => {
    env.setString('TESTKIT_EXECUTABLE_PATH', path.join(process.cwd(), 'bin', 'dev'));
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/plugin-template-sf.git',
      },
    });
    execCmd('yarn', { cwd: session.project.dir });
    execCmd('yarn build', { cwd: session.project.dir });
  });

  after(async () => {
    await session?.clean();
  });

  describe('generated hook', () => {
    const event = 'sf:env:list';
    const command = `dev generate hook --event ${event} --force`;

    before(async () => {
      execCmd(command, { ensureExitCode: 0, cli: 'sf', cwd: session.project.dir });
    });

    it('should generate a hook file', async () => {
      const hookFile = path.join(session.project.dir, 'src', 'hooks', 'envList.ts');
      expect(await fileExists(hookFile)).to.be.true;
    });

    it('should update hooks in package.json', async () => {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(session.project.dir, 'package.json'), 'utf8')
      ) as unknown as PackageJson;
      expect(packageJson.oclif.hooks).to.deep.equal({
        'sf:env:list': './lib/hooks/envList',
      });
    });
  });
});
