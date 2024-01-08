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
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('audit messages', () => {
  let session: TestSession;
  before(async () => {
    const fixtureDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      '..',
      'test',
      'fixtures',
      'plugin-test'
    );

    session = await TestSession.create({
      project: { sourceDir: fixtureDir },
    });

    await fs.promises.writeFile(
      path.join(session.project.dir, 'messages', 'my.unused.md'),
      '# unusedMessageInUnusedBundle\nunused message\n'
    );

    const messages =
      (await fs.promises.readFile(path.join(session.project.dir, 'messages', 'hello.world.md'))).toString() +
      '# unusedMessage\nunused message\n';
    await fs.promises.writeFile(path.join(session.project.dir, 'messages', 'hello.world.md'), messages, 'utf8');

    const helloWorldPath = path.join(session.project.dir, 'src', 'commands', 'hello', 'world.ts');

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
    await session.clean();
  });

  it('should audit messages via project', async () => {
    const result = execCmd(`dev audit messages -p ${session.project.dir} --json`, { ensureExitCode: 'nonZero' })
      .jsonOutput?.result;
    expect(result).to.deep.equal(expected);
  });

  it('should audit messages via messages-dir', async () => {
    const result = execCmd(`dev audit messages -m ${path.join(session.project.dir, 'messages')} --json`, {
      ensureExitCode: 'nonZero',
    }).jsonOutput?.result;
    expect(result).to.deep.equal(expected);
  });
});

const expected = {
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
} as const;
