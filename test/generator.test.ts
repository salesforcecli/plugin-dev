/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import spawn from 'cross-spawn';
import shelljs from 'shelljs';
import { Generator } from '../src/generator.js';

type SpawnCall = { bin: string; args: readonly string[]; options: { cwd?: string } };

// `spawn.sync` is typed read-only, so mutate through a mutable view of the module.
const spawnModule = spawn as { sync: typeof spawn.sync };

describe('Generator.execute', () => {
  let calls: SpawnCall[];
  const originalSpawnSync = spawn.sync;
  const originalWhich = shelljs.which;

  beforeEach(() => {
    calls = [];
    // Intercept cross-spawn so no real process runs and we can assert on argv.
    spawnModule.sync = ((bin: string, args: readonly string[], options: { cwd?: string }) => {
      calls.push({ bin, args, options });
      return {} as ReturnType<typeof spawn.sync>;
    }) as typeof spawn.sync;
  });

  afterEach(() => {
    spawnModule.sync = originalSpawnSync;
    shelljs.which = originalWhich;
  });

  it('should throw when binary is not found on PATH', () => {
    const generator = new Generator();

    expect(() => generator.execute('nonexistent-binary-xyz --help')).to.throw(
      'Could not find "nonexistent-binary-xyz" on PATH'
    );
    expect(calls).to.have.length(0);
  });

  it('should not execute commands in dry-run mode', () => {
    const generator = new Generator({ dryRun: true });

    generator.execute('nonexistent-binary-xyz --help');

    expect(calls).to.have.length(0);
  });

  it('should pass argv as an array without a shell so metacharacters cannot break out', () => {
    const generator = new Generator();
    generator.cwd = '/tmp/project';

    // This is the hijack path from the original vulnerability. `&` must land in
    // a single argv entry, never as a shell command separator. The bin is an
    // absolute path, so PATH resolution is bypassed.
    generator.execute('/usr/bin/git clone https://x.git "/repo/dir&calc.exe&"');

    expect(calls).to.have.length(1);
    expect(calls[0].bin).to.equal('/usr/bin/git');
    expect(calls[0].args).to.deep.equal(['clone', 'https://x.git', '/repo/dir&calc.exe&']);
    expect(calls[0].options).to.include({ cwd: '/tmp/project' });
  });

  it('should keep a quoted argument containing spaces as a single token', () => {
    const generator = new Generator();

    generator.execute('/bin/yarn prettier --write "/My Docs/a.ts"');

    expect(calls[0].bin).to.equal('/bin/yarn');
    expect(calls[0].args).to.deep.equal(['prettier', '--write', '/My Docs/a.ts']);
  });

  it('should resolve a bare binary name via PATH', () => {
    shelljs.which = (() => '/resolved/path/to/yarn') as unknown as typeof shelljs.which;
    const generator = new Generator();

    generator.execute('yarn install');

    expect(calls[0].bin).to.equal('/resolved/path/to/yarn');
    expect(calls[0].args).to.deep.equal(['install']);
  });
});
