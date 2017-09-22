"use strict";

const expect = require('chai').expect;
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
    expect(strip('test')).to.equal('test');
  });

  it('leaves correctly encoded strings alone', () => {
    for (const char of validChars) {
      expect(strip(char)).to.equal(char);
    }
  });

  it('strips trailing %', () => {
    expect(strip('test%')).to.equal('test');
  });

  it('strips trailing % + a hex char', () => {
    for (let i = 0; i < 16; i++) {
      expect(strip('test%' + i.toString(16))).to.equal('test');
    }
  });

  it('does not strip valid encoding followed by %', () => {
    for (const char of validChars) {
      expect(strip(char + '%')).to.equal(char);
    }
  });

  it('does not strip valid encoding followed by % + a hex char', () => {
    for (const char of validChars) {
      expect(strip(char + '%7')).to.equal(char);
    }
  });

  it('strips broken encoding', () => {
    for (const char of validChars) {
      expect(strip(char.slice(0, -1))).to.equal('');
    }
  });

  it('does not strip valid encoding followed by strips broken encoding', () => {
    for (const char of validChars) {
      expect(strip('%20' + char.slice(0, -1))).to.equal('%20');
    }
  });

  it('does not strip broken encoding anywhere but tail', () => {
    expect(strip('%BE0')).to.equal('%BE0');
  });

  it('returns empty string if DOS detected', () => {
    expect(strip('test%BE%BE%BE%BE%BE')).to.equal('');
  });

  it('returns empty string if bad hex values detected', () => {
    expect(strip('test%G')).to.equal('');
    expect(strip('test%0G')).to.equal('');
    expect(strip('test%GG')).to.equal('');
  });
});
