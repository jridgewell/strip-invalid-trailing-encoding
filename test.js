"use strict";

const assert = require('assert');
const strip = require('.');

describe('Strip Invalid Trailing Encoding', () => {
  const validChars = new Array(0xF7FF)
  for (let i = 0, j = 0; i < 0xFFFF; i++, j++) {
    // This skips the invalid range
    if (i === 0xD800) {
      i = 0xE000;
    }
    validChars[j] = encodeURIComponent(String.fromCharCode(i));
  }

  it('leaves non encoded strings alone', () => {
    assert.equal(strip('test'), 'test');
  });

  it('leaves correctly encoded strings alone', () => {
    for (const char of validChars) {
      assert.equal(strip(char), char);
    }
  });

  it('strips trailing %', () => {
    assert.equal(strip('test%'), 'test');
  });

  it('strips trailing % + single sequence high hex', () => {
    for (let i = 0; i < 16; i++) {
      const actual = 'test%' + i.toString(16);
      assert.equal(strip(actual), 'test', actual);
    }
  });

  it('does not strip valid encoding followed by %', () => {
    for (const char of validChars) {
      const actual = char + '%';
      assert.equal(strip(actual), char, actual);
    }
  });

  it('does not strip valid encoding followed by % + a hex char', () => {
    for (const char of validChars) {
      const actual = char + '%7';
      assert.equal(strip(actual), char, actual);
    }
  });

  it('strips broken encoding', () => {
    for (const char of validChars) {
      const actual = char.slice(0, -1);
      assert.equal(strip(actual), '', actual);
    }
  });

  it('does not strip valid encoding followed by strips broken encoding', () => {
    for (const char of validChars) {
      const actual = '%20' + char.slice(0, -1);
      assert.equal(strip(actual), '%20', actual);
    }
  });

  it('does not strip broken encoding anywhere but tail', () => {
    assert.equal(strip('%BE0'), '%BE0');
  });

  it('returns empty string if DOS detected', () => {
    assert.equal(strip('test%BE%BE%BE%BE'), '');
  });

  it('returns empty string if bad hex values detected', () => {
    assert.equal(strip('test%G'), '', 'test%G');
    assert.equal(strip('test%0G'), '', 'test%0G');
    assert.equal(strip('test%GG'), '', 'test%GG');
  });
});
