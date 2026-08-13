/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { Generator } from '../src/generator.js';

describe('Generator.execute', () => {
  it('should throw when binary is not found on PATH', () => {
    const generator = new Generator();

    expect(() => generator.execute('nonexistent-binary-xyz --help')).to.throw(
      'Could not find "nonexistent-binary-xyz" on PATH'
    );
  });

  it('should not execute commands in dry-run mode', () => {
    const generator = new Generator({ dryRun: true });

    generator.execute('nonexistent-binary-xyz --help');
  });
});
