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
