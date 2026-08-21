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
    expect(toOptionalNumber('9007199254740991')).to.equal(9_007_199_254_740_991);
  });
});
