// Generate repeatable, bounded SQL batches for importing the pinned directory.
// Usage: node tools/import-school-directory.mjs /path/to/batches
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schoolText, schoolSearchKey } from '../supabase/functions/score-tracker-setup/school-search.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2];
if (!output) throw new Error('请提供 SQL 批次输出目录');
const { schools } = JSON.parse(fs.readFileSync(path.join(root, 'data/high-schools.json'), 'utf8'));
fs.mkdirSync(output, { recursive: true });
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
for (let offset = 0; offset < schools.length; offset += 500) {
  const values = schools.slice(offset, offset + 500).map((row, i) => '(' + [...row, schoolText(row[0]), schoolSearchKey(row[0])].map(quote).concat(offset + i).join(',') + ')');
  const sql = 'with imported as (\ninsert into public.score_tracker_school_directory (name,province,city,area,name_search,name_key,sort_order) values\n' + values.join(',\n') + '\non conflict (name,province,city,area) do update set name_search=excluded.name_search,name_key=excluded.name_key,sort_order=excluded.sort_order\nreturning 1\n) select count(*) as imported from imported;\n';
  fs.writeFileSync(path.join(output, 'batch-' + String(offset / 500 + 1).padStart(3, '0') + '.sql'), sql);
}
console.log(JSON.stringify({ schools: schools.length, batches: Math.ceil(schools.length / 500) }));
