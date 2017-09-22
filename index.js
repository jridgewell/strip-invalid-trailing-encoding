"use strict";

/**
 * Parses a (possibly) hex char into its int value.
 * If the char is not valid hex char, returns 16.
 *
 * @param {string} char
 * @return {number}
 */
function toHex(char) {
  const i = char.charCodeAt(0);
  // 0 - 9
  if (i >= 48 && i <= 57) {
    return i - 48;
  }

  const a = (i | 0x20);
  // Normalize A-F into a-f.
  if (a >= 97 && a <= 102) {
    return a - 87;
  }

  // Invalid Hex
  return 16;
}

/**
 * Determines if a '%' character occurs in the last 3 characters of a string.
 *
 * @param {string} string
 * @param {number} length
 * @return {boolean}
 */
function hasPercent(string, length) {
  if (length > 0 && string[length - 1] === '%') {
    return 1;
  }
  if (length > 1 && string[length - 2] === '%') {
    return 2;
  }
  if (length > 2 && string[length - 3] === '%') {
    return 0;
  }

  return 3;
}

/**
 * Strips invalid Percent Encodings that occur at the end of a string.
 * This is highly optimized to trim only _broken_ sequences at the end.
 *
 * Note that this **IS NOT** a string sanitizer. It will not prevent native
 * decodeURIComponent from throwing errors. This is only to prevent "good"
 * strings that were invalidly truncated in the middle of a percent encoding
 * from throwing. Attackers can craft strings will not be "fixed" by stripping.
 *
 * @param {string} string
 * @return {string}
 */
function strip(string) {
  const length = string.length;
  const shift = hasPercent(string, length);

  // A shift of 3 means that there's no % in the last 3 chars. Nothing to do.
  if (shift === 3) {
    return string;
  }

  let end = length - shift;
  let num = -shift;
  let high = '8';
  let low = '0';
  let continuation = false;

  for (let pos = length - 1; pos >= 0; pos--) {
    const char = string[pos];
    num++;

    if (char !== '%') {
      // If we have backtracked 3 characters and we don't find a "%", we know the
      // string did not end in an encoding.
      if (num % 3 === 0) {
        if (continuation) {
          // Someone put extra continuations.
          return '';
        }

        break;
      }

      // Else, we need to keep backtracking.
      low = high;
      high = char;
      continue;
    }

    const h = toHex(high);
    const l = toHex(low);
    if (h === 16 || l === 16) {
      // Someone put non hex values.
      return '';
    }

    // &    %26
    // %26  00100110
    // α    %CE%B1
    // %CE  11001110
    // %B1  10110001
    // ⚡   %E2%9A%A1
    // %E2  11100010
    // %9A  10011010
    // %A1  10100001
    // 𝝰    %F0%9D%9D%B0
    // %F0  11110000
    // %9D  10011101
    // %9D  10011101
    // %B0  10110000
    // Single encodings are guaranteed to have a leading "0" bit in the byte.
    // The first of a multi sequence always starts with "11" bits, while the
    // "continuation"s always start with "10" bits.
    // Spec: http://www.ecma-international.org/ecma-262/6.0/#table-43
    const isSingle = (h & 8) === 0;
    const isContinuationStart = (~h & 12) === 0;

    if (isSingle || isContinuationStart) {
      continuation = false;

      // If a single is full (has 3 chars), we don't need to truncate it.
      // If a continuation is full (chars depends on the offset of the leftmost
      // "0" bit), we don't need to truncate it.
      let escapes = 3;
      if (isContinuationStart) {
        if ((h & 2) === 0) {
          escapes = 6;
        } else if ((h & 1) === 0) {
          escapes = 9;
        } else if ((l & 8) === 0) {
          escapes = 12;
        } else if (num > 0 && num % 3 === 0) {
          // Someone put random hex values together.
          return '';
        }
      }

      if (num > escapes) {
        // Someone put extra continuations.
        return '';
      }

      if (num < escapes) {
        // We're at a broken sequence, truncate to here.
        end = pos;
      }

      break;
    } else {
      // A trailing % does not count as a continuation.
      if (pos < length - 1) {
        continuation = true;
      }
    }

    // Detect possible DOS attacks. Credible strings can never be worse than
    // the longest (4) escape sequence (3 chars) minus one (the trim).
    if (num > 4 * 3 - 1) {
      return '';
    }

    // Intentionally set a bad hex value
    high = low = 'e';
  }

  if (end === length) {
    return string;
  }

  return string.substr(0, end);
}

module.exports = strip;
