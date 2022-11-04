/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import helpers = require('yeoman-test');
import { Config } from '@oclif/core';
import AuditMessages from '../../../../lib/commands/dev/audit/messages';

describe('audit messages', () => {
  let runResult: helpers.RunResult;
  before(async () => {
    runResult = await helpers
      .run(path.join(__dirname, '..', '..', '..', '..', 'src', 'generators', 'plugin.ts'))
      .withPrompts({
        internal: true,
        name: 'plugin-test',
        description: 'my plugin description',
        hooks: ['sf:env:list', 'sf:env:display', 'sf:deploy', 'sf:logout'],
      });
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

  it('should have a test', async () => {
    const cmd = new AuditMessages(['-p', path.join(runResult.cwd, 'plugin-test'), '--json'], {} as Config);
    const result = await cmd.run();
    expect(result).to.deep.equal({
      unusedBundles: ['my.unused.md'],
      messageState: {
        'hello.world.md:summary': {
          found: true,
          files: ['src/commands/hello/world.ts'],
        },
        'hello.world.md:description': {
          found: true,
          files: ['src/commands/hello/world.ts'],
        },
        'hello.world.md:flags.name.summary': {
          found: true,
          files: ['src/commands/hello/world.ts'],
        },
        'hello.world.md:examples': {
          found: true,
          files: ['src/commands/hello/world.ts'],
        },
        'hello.world.md:info.hello': {
          found: true,
          files: ['src/commands/hello/world.ts'],
        },
        'hello.world.md:unusedMessage': {
          found: false,
          files: [],
        },
        'my.unused.md:unusedMessageInUnusedBundle': {
          found: false,
          files: [],
        },
      },
      missing: {
        summary: {
          isLiteral: true,
          missing: false,
          files: ['src/commands/hello/world.ts'],
        },
        description: {
          isLiteral: true,
          missing: false,
          files: ['src/commands/hello/world.ts'],
        },
        examples: {
          isLiteral: true,
          missing: false,
          files: ['src/commands/hello/world.ts'],
        },
        'flags.name.summary': {
          isLiteral: true,
          missing: false,
          files: ['src/commands/hello/world.ts'],
        },
        'info.hello': {
          isLiteral: true,
          missing: false,
          files: ['src/commands/hello/world.ts'],
        },
        noWayYouFindThis: {
          isLiteral: true,
          missing: true,
          files: ['src/commands/hello/world.ts'],
        },
        msg: {
          isLiteral: false,
          missing: true,
          files: ['src/commands/hello/world.ts'],
        },
      },
    });
  });
});
