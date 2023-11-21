/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { expect } from 'chai';
import helpers from 'yeoman-test';
import { Config } from '@oclif/core';
import AuditMessages, { fileReader, resolveFileContents } from '../../../../src/commands/dev/audit/messages.js';

describe('file reader', () => {
  const testDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmpFileReader');
  const subDir = path.join(testDir, 'subDir');
  before(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.writeFile(path.join(testDir, 'file.ts'), 'hi');
    await fs.promises.mkdir(subDir, { recursive: true });
    await fs.promises.writeFile(path.join(subDir, 'subFile.ts'), 'sub');
    await fs.promises.writeFile(path.join(subDir, 'subFile2.ts'), 'sub2');
    await fs.promises.mkdir(path.join(subDir, '1', '2', '3'), { recursive: true });
    await fs.promises.writeFile(path.join(subDir, '1', '2', '3', 'deepFile.ts'), 'deep');
  });
  it('should read files', async () => {
    const results = await Promise.all((await fileReader(testDir)).map(resolveFileContents));
    expect(results).to.deep.equal([
      {
        path: path.join(testDir, 'file.ts'),
        contents: 'hi',
      },
      {
        path: path.join(subDir, 'subFile.ts'),
        contents: 'sub',
      },
      {
        path: path.join(subDir, 'subFile2.ts'),
        contents: 'sub2',
      },
      {
        path: path.join(subDir, '1', '2', '3', 'deepFile.ts'),
        contents: 'deep',
      },
    ]);
  });

  after(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });
});

describe('audit messages', () => {
  let runResult: helpers.RunResult;
  const testDir = path.join(process.cwd(), 'tmp');
  before(async () => {
    try {
      await fs.promises.rm(path.join(testDir, 'plugin-test'), { recursive: true, force: true });
    } catch {
      // do nothing
    }

    await fs.promises.mkdir(testDir, { recursive: true });

    runResult = await helpers
      .create(
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          '..',
          '..',
          '..',
          '..',
          'src',
          'generators',
          'plugin.ts'
        )
      )
      .cd(testDir)
      .withPrompts({
        internal: true,
        name: 'plugin-test',
        description: 'my plugin description',
      })
      .run();

    await fs.promises.writeFile(
      path.join(runResult.cwd, 'plugin-test', 'messages', 'my.unused.md'),
      '# unusedMessageInUnusedBundle\nunused message\n'
    );
    let messages = (
      await fs.promises.readFile(path.join(runResult.cwd, 'plugin-test', 'messages', 'hello.world.md'))
    ).toString();
    messages += '# unusedMessage\nunused message\n';
    await fs.promises.writeFile(
      path.join(runResult.cwd, 'plugin-test', 'messages', 'hello.world.md'),
      messages,
      'utf8'
    );
    const helloWorldPath = path.join(runResult.cwd, 'plugin-test', 'src', 'commands', 'hello', 'world.ts');
    const helloWorld = (await fs.promises.readFile(helloWorldPath, 'utf8')).trim().split('\n');
    const checkMessageFunction = `
  public checkMissingMessage(): void {
    messages.getMessage('noWayYouFindThis');
    const msg = 'noWayYouFindThis';
    messages.getMessage(msg);
  }
}`;
    helloWorld[helloWorld.length - 1] = checkMessageFunction;
    await fs.promises.writeFile(helloWorldPath, helloWorld.join('\n'), 'utf8');
  });

  after(async () => {
    runResult.restore();

    try {
      await fs.promises.rm(path.join(testDir, 'plugin-test'), { recursive: true, force: true });
    } catch {
      // do nothing
    }
  });

  it('should audit messages', async () => {
    const cmd = new AuditMessages(['-p', path.join(runResult.cwd, 'plugin-test'), '--json'], {} as Config);
    const result = await cmd.run();
    expect(result).to.deep.equal({
      missingBundles: [],
      missingMessages: [
        {
          Bundle: 'hello.world',
          File: 'src/commands/hello/world.ts'.split('/').join(path.sep),
          IsLiteral: false,
          Name: 'msg',
          SourceVar: 'messages',
        },
        {
          Bundle: 'hello.world',
          File: 'src/commands/hello/world.ts'.split('/').join(path.sep),
          IsLiteral: true,
          Name: 'noWayYouFindThis',
          SourceVar: 'messages',
        },
      ],
      unusedBundles: ['my.unused'],
      unusedMessages: [
        {
          Bundle: 'hello.world',
          Name: 'unusedMessage',
          ReferencedInNonLiteral: '*',
        },
      ],
    });
  });
});
