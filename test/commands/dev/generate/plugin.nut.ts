/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { readJson } from '../../../../src/util.js';
import { NYC, PackageJson } from '../../../../src/types.js';

describe('dev generate plugin NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create();
  });

  after(async () => {
    await session?.clean();
  });

  it('should generate a 2PP plugin', async () => {
    await execInteractiveCmd(
      'dev generate plugin',
      {
        'internal Salesforce team': Interaction.Yes,
        'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
        'description for your plugin': ['a description', Interaction.ENTER],
      },
      { cwd: session.dir, ensureExitCode: 0 }
    );
    const pluginDir = path.join(session.dir, 'plugin-awesome');

    const packageJsonPath = path.join(pluginDir, 'package.json');
    expect(existsSync(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('@salesforce/plugin-awesome');
    expect(packageJson.version).to.equal('1.0.0');
    expect(packageJson.author).to.equal('Salesforce');
    expect(packageJson.description).to.equal('a description');
    expect(packageJson.bugs).to.equal('https://github.com/forcedotcom/cli/issues');
    expect(packageJson.repository).to.equal('salesforcecli/plugin-awesome');
    expect(packageJson.homepage).to.equal('https://github.com/salesforcecli/plugin-awesome');

    const testDependencyScripts = packageJson.wireit.test.dependencies;
    expect(testDependencyScripts).to.include('test:json-schema');
    expect(testDependencyScripts).to.include('test:deprecation-policy');
    expect(testDependencyScripts).to.include('test:command-reference');

    // assert files created
    [
      'CODE_OF_CONDUCT.md',
      'LICENSE.txt',
      'command-snapshot.json',
      path.join('schemas', 'hello-world.json'),
      path.join('.git2gus', 'config.json'),
    ].map((file) => {
      expect(existsSync(path.join(pluginDir, file)), `${file} does not exist!`).to.be.true;
    });

    expect(readFileSync(path.join(pluginDir, 'src', 'commands', 'hello', 'world.ts'), 'utf8')).to.include('Copyright');
    expect(readFileSync(path.join(pluginDir, '.eslintrc.cjs'), 'utf8')).to.include('eslint-config-salesforce-license');
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
    const pluginDir = path.join(session.dir, 'my-plugin');
    const packageJsonPath = path.join(pluginDir, 'package.json');
    expect(existsSync(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('my-plugin');
    expect(packageJson.version).to.equal('1.0.0');
    expect(packageJson.author).to.equal('me');
    expect(packageJson.description).to.equal('a description');

    const scripts = Object.keys(packageJson.scripts);
    expect(scripts).to.not.include('test:json-schema');
    expect(scripts).to.not.include('test:deprecation-policy');
    expect(scripts).to.not.include('test:command-reference');

    const keys = Object.keys(packageJson);
    expect(keys).to.not.include('homepage');
    expect(keys).to.not.include('repository');
    expect(keys).to.not.include('bugs');

    // assert files created
    expect(existsSync(path.join(pluginDir, 'src', 'commands', 'hello', 'world.ts'))).to.be.true;

    // assert files not created
    ['CODE_OF_CONDUCT.md', 'LICENSE.txt', 'command-snapshot.json', 'schemas', '.git2gus'].map((file) => {
      expect(existsSync(path.join(pluginDir, file))).to.be.false;
    });

    expect(readFileSync(path.join(pluginDir, 'src', 'commands', 'hello', 'world.ts'), 'utf8')).to.not.include(
      'Copyright'
    );

    const nycConfig = readJson<NYC>(path.join(pluginDir, '.nycrc'));
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
    expect(existsSync(packageJsonPath)).to.be.true;

    const packageJson = readJson<PackageJson>(packageJsonPath);

    expect(packageJson.name).to.equal('my-plugin');
    expect(packageJson.version).to.equal('1.0.0');
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
