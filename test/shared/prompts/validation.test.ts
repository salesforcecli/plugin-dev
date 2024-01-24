/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { integerMinMaxValidation, toOptionalNumber } from '../../../src/prompts/validations.js';

describe('integerMinMaxValidation', () => {
  it('good int', () => {
    expect(integerMinMaxValidation(1)).to.be.true;
    expect(integerMinMaxValidation(0)).to.be.true;
    expect(integerMinMaxValidation(-1)).to.be.true;
    expect(integerMinMaxValidation(Number.MAX_SAFE_INTEGER)).to.be.true;
  });

  it('not int', () => {
    expect(integerMinMaxValidation(1.1)).to.be.a('string');
    expect(integerMinMaxValidation(-1.1)).to.be.a('string');
    expect(integerMinMaxValidation(NaN)).to.be.a('string');
  });

  it('min ok', () => {
    expect(integerMinMaxValidation(0, undefined)).to.be.true;
    expect(integerMinMaxValidation(1, undefined)).to.be.true;
    expect(integerMinMaxValidation(-1, undefined)).to.be.true;
    expect(integerMinMaxValidation(0, 0)).to.be.true;
    expect(integerMinMaxValidation(5, 1)).to.be.true;
    expect(integerMinMaxValidation(-1, -5)).to.be.true;
    expect(integerMinMaxValidation(-1, -1)).to.be.true;
  });

  it('min not ok', () => {
    expect(integerMinMaxValidation(0, 1)).to.be.a('string');
    expect(integerMinMaxValidation(1, 2)).to.be.a('string');
    expect(integerMinMaxValidation(-1, 0)).to.be.a('string');
  });

  it('min max ok', () => {
    expect(integerMinMaxValidation(0, undefined, undefined)).to.be.true;
    expect(integerMinMaxValidation(1, undefined, 2)).to.be.true;
    expect(integerMinMaxValidation(-1, undefined, 0)).to.be.true;
    expect(integerMinMaxValidation(0, 0, 0)).to.be.true;
    expect(integerMinMaxValidation(2, 2, 2)).to.be.true;
    expect(integerMinMaxValidation(1, 0, 2)).to.be.true;
  });

  it('min max not ok', () => {
    expect(integerMinMaxValidation(5, 1, 3)).to.be.a('string');
    expect(integerMinMaxValidation(1, 2, 3)).to.be.a('string');
    expect(integerMinMaxValidation(-1, 0)).to.be.a('string');
    expect(integerMinMaxValidation(1, 2, 0)).to.be.a('string');
    expect(integerMinMaxValidation(1, 2, 1)).to.be.a('string');
  });
});

describe('toOptionalNumber', () => {
  it('empty string => undefined', () => {
    expect(toOptionalNumber('')).to.be.undefined;
  });

  it('not a number', () => {
    expect(toOptionalNumber('foo')).to.be.NaN;
  });

  it('number string', () => {
    expect(toOptionalNumber('1')).to.equal(1);
    expect(toOptionalNumber('0')).to.equal(0);
    expect(toOptionalNumber('-1')).to.equal(-1);
    expect(toOptionalNumber('9007199254740991')).to.equal(9007199254740991);
  });
});
