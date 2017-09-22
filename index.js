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
  if (length === 0) {
    return false;
  }

  if (string[length - 1] === '%') {
    return true;
  }
  if (length > 1 && string[length - 2] === '%') {
    return true;
  }
  if (length > 2 && string[length - 3] === '%') {
    return true;
  }

  return false;
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
  if (!hasPercent(string, length)) {
    return string;
  }

  let end = length;
  let num = 1;
  let sequence = 0;
  let high = '8';
  let low = '0';

  for (let pos = end - num; pos >= 0; pos = end - num) {
    const char = string[pos];
    if (char === '%') {
      const h = toHex(high);
      const l = toHex(low);
      if (h === 16 || l === 16) {
        // Attack detected.
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

      // If a single is full (has 3 chars), we don't need to truncate it.
      if (isSingle && num == 3) {
        break;
      }

      if (num === 3) {
        sequence++;
      }

      // If a continuation is full (chars depends on the offset of the leftmost
      // "0" bit), we don't need to truncate it.
      if (isContinuationStart) {
        let required = 1;
        if ((h & 2) === 0) {
          required = 2;
        } else if ((h & 1) === 0) {
          required = 3;
        } else if ((l & 8) === 0) {
          required = 4;
        } else if (num === 3) {
          // Attack detected.
          return '';
        }

        if (required === sequence) {
          end += (sequence - 1) * 3;
          break;
        }
      }

      // So, we're at a broken single, or a continuation. Update truncation
      // end position.
      end = pos;
      num = 1;

      // If we're at a broken single, or at the start of a continuation, we
      // don't need to look any farther, just truncate to here.
      if (isSingle || isContinuationStart) {
        break;
      }

      // Detect possible DOS attacks. Credible strings can never be worse than
      // the longest (4) escape sequence (3 chars) minus one (the trim):
      if (length - pos > (4 * 3 - 1)) {
        return '';
      }

      high = low = '0';
      continue;
    }

    // If we have backtracked 3 characters and we don't find a "%", we know the
    // string did not end in an encoding.
    if (num === 3) {
      break;
    }

    // Else, we need to keep backtracking.
    num++;
    low = high;
    high = char;
  }

  if (end === length) {
    return string;
  }

  return string.substr(0, end);
}

module.exports = strip;
