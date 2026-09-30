// Merge a pinned GitHub school export with the existing curated directory.
// Usage: node tools/build-school-directory.js /path/to/学校-28610-只有省市区.json
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const input = process.argv[2];
if (!input) throw new Error('请提供学校源数据 JSON 路径');
const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(raw)) throw new Error('源数据必须是学校数组');
const output = path.join(root, 'data/high-schools.json');
const existing = JSON.parse(fs.readFileSync(output, 'utf8')).schools;
const secondaryName = /中学|中學|高中|初中|国中|國中|高级中学|高級中學|附中|[一二三四五六七八九十百\d]+中(?:$|[（(])/;
const clean = value => String(value || '').normalize('NFKC').trim();
const rows = new Map();
function add(row) {
  const normalized = row.map(clean);
  if (!normalized[0] || !normalized[1] || !normalized[2]) return;
  rows.set(normalized.join('\t'), normalized);
}
for (const school of raw) {
  if (secondaryName.test(school.name || '')) add([school.name, school.province, school.city, school.area]);
}
// Keep previously curated schools, including high schools without 中学 in the name.
for (const school of existing) add(school);
const collator = new Intl.Collator('zh-Hans-CN');
const schools = [...rows.values()].sort((a, b) => {
  for (const field of [1, 2, 3, 0]) {
    const result = collator.compare(a[field], b[field]);
    if (result) return result;
  }
  return 0;
});
fs.writeFileSync(output, JSON.stringify({ schools }) + '\n');
const metaPath = path.join(root, 'data/school-sources.json');
const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
metadata.sources[0].processing = '按中学、中學、高中、初中、国中、附中及数字中学简称扩展收录；包含初中、完全中学与职业中学，不按校名推断高中学段。';
metadata.count = schools.length;
metadata.coverage = '31 个省级地区的部分中学与高中名称，包括初中和职业中学，并保留原有高中名单；非全国完整名录，支持手动填写。';
metadata.deduplication = '按规范化校名、省、市、区县去重；保留不同地区的同名学校与不同校区。';
fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ count: schools.length, provinces: new Set(schools.map(s => s[1])).size, bytes: fs.statSync(output).size }));
