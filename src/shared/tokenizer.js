// src/tokenizer.js
// 共用分詞器：中日韓單字 + 歐文單詞

// 支援多語系的字元範圍
const ALPHABETS = [
  [0x30, 0x39],    // 0-9
  [0x41, 0x5a],    // A-Z
  [0x61, 0x7a],    // a-z
  [0xc0, 0x2af],   // Latin-1 supplement / Latin extended A/B / IPA
  [0x370, 0x52f],  // Greek / Cyrillic / Cyrillic supplement
];
function isAlphabet(n) {
  return ALPHABETS.some(([start, end]) => n >= start && n <= end);
}

const SINGLE_CHARS = [
  [0xe00, 0xe5b],     // Thai
  [0x3040, 0x309f],   // Hiragana
  [0x4e00, 0x9fff],   // CJK
  [0xac00, 0xd7af],   // Hangul syllables
];
function isSingleChar(n) {
  return SINGLE_CHARS.some(([start, end]) => n >= start && n <= end);
}

// 綜合分詞器：中日韓單字、歐文單詞
function tokenizer(str) {
  const tokens = [];
  let last = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (isSingleChar(code)) {
      if (last.length > 1) tokens.push(last.toLowerCase());
      last = '';
      tokens.push(str[i]);
    } else if (isAlphabet(code)) {
      last += str[i];
    } else {
      if (last.length > 1) tokens.push(last.toLowerCase());
      last = '';
    }
  }
  if (last.length > 1) tokens.push(last.toLowerCase());
  return tokens;
}


// 讓 Node.js 及 ES module 都能匯入
export { tokenizer };
// Node.js require 相容
if (typeof module !== 'undefined') {
  module.exports = { tokenizer };
}
