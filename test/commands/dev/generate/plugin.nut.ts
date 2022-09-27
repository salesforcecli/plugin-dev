/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { fileExists, readJson } from '../../../../src/util';
import { NYC, PackageJson } from '../../../../src/types';

process.env.DEBUG = 'testkit:execInteractiveCmd';

describe('dev generate plugin NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create();
  });

  after(async () => {
    await session?.clean();
  });

  it.only('should generate a 2PP plugin', async () => {
    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.Yes,
        'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
        'Select the existing "sf" commands you plan to extend': [
          Interaction.SELECT,
          Interaction.DOWN,
          Interaction.SELECT,
          Interaction.ENTER,
        ],
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );

    const packageJsonPath = path.join(session.dir, 'plugin-awesome', 'package.json');
    expect(await fileExists(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('@salesforce/plugin-awesome');
    expect(packageJson.author).to.equal('Salesforce');
    expect(packageJson.description).to.equal('a description');
    expect(packageJson.bugs).to.equal('https://github.com/forcedotcom/cli/issues');
    expect(packageJson.repository).to.equal('salesforcecli/plugin-awesome');
    expect(packageJson.homepage).to.equal('https://github.com/salesforcecli/plugin-awesome');
  });

  it('should generate a 3PP plugin', async () => {
    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.No,
        'name of your new plugin': ['my-plugin', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
        'author of the plugin': ['me', Interaction.ENTER],
        'Select the % code coverage': [Interaction.DOWN, Interaction.ENTER],
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );

    const packageJsonPath = path.join(session.dir, 'my-plugin', 'package.json');
    expect(await fileExists(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('my-plugin');
    expect(packageJson.author).to.equal('me');
    expect(packageJson.description).to.equal('a description');

    const nycConfig = readJson<NYC>(path.join(session.dir, 'my-plugin', '.nycrc'));
    expect(nycConfig).to.deep.equal({
      'check-coverage': true,
      lines: 75,
      statements: 75,
      functions: 75,
      branches: 75,
    });
  });

  it('should show validation message if invalid plugin name', async () => {
    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.No,
        'name of your new plugin': ['my-plugin!', Interaction.ENTER],
        'name must be a valid npm package name': [Interaction.BACKSPACE, Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
        'author of the plugin': ['me', Interaction.ENTER],
        'Select the % code coverage': Interaction.ENTER,
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );

    const packageJsonPath = path.join(session.dir, 'my-plugin', 'package.json');
    expect(await fileExists(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('my-plugin');
    expect(packageJson.author).to.equal('me');
    expect(packageJson.description).to.equal('a description');

    const nycConfig = readJson<NYC>(path.join(session.dir, 'my-plugin', '.nycrc'));
    expect(nycConfig).to.deep.equal({
      'check-coverage': true,
      lines: 50,
      statements: 50,
      functions: 50,
      branches: 50,
    });
  });
});
