/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import helpers = require('yeoman-test');
import { expect } from 'chai';
import { readJson } from '../../../../src/util';
import { PackageJson } from '../../../../src/types';

describe('dev generate plugin', () => {
  it('should generate a 3PP plugin', async () => {
    const runResult = await helpers
      .run(path.join(__dirname, '..', '..', '..', '..', 'src', 'generators', 'plugin.ts'))
      .withPrompts({
        internal: false,
        name: 'my-plugin',
        description: 'my plugin description',
        author: 'my name',
        codeCoverage: '50%',
      });

    runResult.assertFile(path.join(runResult.cwd, 'my-plugin', 'package.json'));
    runResult.assertFile(path.join(runResult.cwd, 'my-plugin', 'src', 'commands', 'hello', 'world.ts'));
    runResult.assertNoFile(path.join(runResult.cwd, 'my-plugin', 'CODE_OF_CONDUCT.md'));
    runResult.assertNoFile(path.join(runResult.cwd, 'my-plugin', 'LICENSE.txt'));
    runResult.assertNoFile(path.join(runResult.cwd, 'my-plugin', 'command-snapshot.json'));
    runResult.assertNoFile(path.join(runResult.cwd, 'my-plugin', 'schemas', 'hello-world.json'));
    runResult.assertNoFile(path.join(runResult.cwd, 'my-plugin', '.git2gus', 'config.json'));

    const packageJson = readJson<PackageJson>(path.join(runResult.cwd, 'my-plugin', 'package.json'));
    expect(packageJson.name).to.equal('my-plugin');
    expect(packageJson.author).to.equal('my name');
    expect(packageJson.description).to.equal('my plugin description');

    const scripts = Object.keys(packageJson.scripts);
    expect(scripts).to.not.include('test:json-schema');
    expect(scripts).to.not.include('test:deprecation-policy');
    expect(scripts).to.not.include('test:command-reference');

    const keys = Object.keys(packageJson);
    expect(keys).to.not.include('homepage');
    expect(keys).to.not.include('repository');
    expect(keys).to.not.include('bugs');

    runResult.assertNoFileContent(
      path.join(runResult.cwd, 'my-plugin', 'src', 'commands', 'hello', 'world.ts'),
      /Copyright/g
    );

    runResult.assertNoFileContent(
      path.join(runResult.cwd, 'my-plugin', '.eslintrc.js'),
      /eslint-config-salesforce-license/g
    );
  });

  it('should generate a 2PP plugin', async () => {
    const runResult = await helpers
      .run(path.join(__dirname, '..', '..', '..', '..', 'src', 'generators', 'plugin.ts'))
      .withPrompts({
        internal: true,
        name: 'plugin-test',
        description: 'my plugin description',
      });

    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', 'package.json'));
    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', 'src', 'commands', 'hello', 'world.ts'));
    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', 'CODE_OF_CONDUCT.md'));
    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', 'command-snapshot.json'));
    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', 'schemas', 'hello-world.json'));
    runResult.assertFile(path.join(runResult.cwd, 'plugin-test', '.git2gus', 'config.json'));

    const packageJson = readJson<PackageJson>(path.join(runResult.cwd, 'plugin-test', 'package.json'));
    expect(packageJson.name).to.equal('@salesforce/plugin-test');
    expect(packageJson.author).to.equal('Salesforce');
    expect(packageJson.description).to.equal('my plugin description');
    expect(packageJson.bugs).to.equal('https://github.com/forcedotcom/cli/issues');
    expect(packageJson.repository).to.equal('salesforcecli/plugin-test');
    expect(packageJson.homepage).to.equal('https://github.com/salesforcecli/plugin-test');

    const testDependencyScripts = packageJson.wireit.test.dependencies;
    expect(testDependencyScripts).to.include('test:json-schema');
    expect(testDependencyScripts).to.include('test:deprecation-policy');
    expect(testDependencyScripts).to.include('test:command-reference');

    runResult.assertFileContent(
      path.join(runResult.cwd, 'plugin-test', 'src', 'commands', 'hello', 'world.ts'),
      /Copyright/g
    );

    runResult.assertFileContent(
      path.join(runResult.cwd, 'plugin-test', '.eslintrc.js'),
      /eslint-config-salesforce-license/g
    );
  });
});
