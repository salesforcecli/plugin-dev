/*
 * Copyright 2026, Salesforce, Inc.
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
import { fileReader, resolveFileContents } from '../../../../src/commands/dev/audit/messages.js';

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
