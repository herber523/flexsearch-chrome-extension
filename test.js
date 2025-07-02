
const { Index } = require('flexsearch');
const { tokenizer } = require('./src/tokenizer');

const index = new Index({
  encode: tokenizer,
  tokenize: 'forward', // 提升英文部分詞組的命中率
  cache: 100,
  async: false
});

// 測試資料
const docs = [
  { id: 1, content: "台灣小吃非常豐富多樣，牛肉麵、珍珠奶茶、小籠包都是必嚐美食。" },
  { id: 2, content: "日本 京都有美麗的寺廟，東京塔和秋葉原也很有名。" },
  { id: 3, content: "Learning JavaScript and Python is fun." }
];

// 加入索引
docs.forEach(doc => index.add(doc.id, doc.content));

// 測試搜尋
const queries = [
  "台灣美食", "日本", "牛肉麵", "牛肉", "美麗寺廟",
  "JavaScript", "小籠包", "小籠", "小籠包都是必嚐美食",
  "秋葉原誒東京塔"
];

for (const q of queries) {
  console.log(`\n[Query Tokenize] "${q}":`, tokenizer(q));
  const ids = index.search(q);
  console.log(`Query: "${q}" => Matched IDs:`, ids);
}