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
