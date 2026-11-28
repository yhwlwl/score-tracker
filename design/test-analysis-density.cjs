const assert=require('node:assert/strict');
const p=require('../page-display.js'),d=require('../analysis-density.js');
assert.deepEqual(p.migrateDisplay(null),{hidden:[],density:'standard'});
for(const mode of ['simple','standard','full']){
  const old=p.presetHidden(mode);
  const migrated=p.migrateDisplay({hidden:old});
  assert.equal(migrated.density,mode);
  assert.deepEqual(migrated.hidden,old.filter(x=>x.startsWith('home-')));
  const custom=['home-goal','stats-peer'];
  assert.deepEqual(p.migrateDisplay({density:mode,hidden:custom}),{density:mode,hidden:custom});
  assert.equal(d.defaultOpen(mode,'simple'),true);
  assert.equal(d.defaultOpen(mode,'standard'),mode!=='simple');
  assert.equal(d.defaultOpen(mode,'full'),mode==='full');
}
assert.deepEqual(p.migrateDisplay({hidden:['stats-peer','home-radar']}),{hidden:['home-radar','stats-peer'],density:'standard'});
assert.deepEqual(p.migrateDisplay({hidden:['stats-peer'],density:'invalid'}),{hidden:['stats-peer'],density:'standard'});
assert.equal(d.normalized('unknown'),'standard');
assert.deepEqual(d.insightCuts([] ,0),{simple:0,standard:0});
assert.deepEqual(d.insightCuts([false,false],2),{simple:2,standard:2});
assert.deepEqual(d.insightCuts(Array(10).fill(false),10),{simple:4,standard:6});
assert.deepEqual(d.insightCuts([false,false,false,false,false,false,true,false,false],9),{simple:7,standard:7});
assert.deepEqual(d.columnIndices('hall',['科目','历次小走势','最佳排名 / 参考','最佳得分','考到于','现在差','状态']),[1,4]);
assert.deepEqual(d.columnIndices('structure',['科目','当前排名','进步速度','比六科典型','一句话点评']),[3]);
assert.deepEqual(d.columnIndices('calib',['科目','目标/实际','最近战绩','下次建议','参照(你考过的场次)']),[4]);
assert.deepEqual(d.columnIndices('calib',['科目','目标/实际','最近战绩','下次建议']),[]);
assert.deepEqual(d.columnIndices('unknown',['最佳得分']),[]);
console.log('PASS: density defaults, legacy migration, custom visibility, priority reminders and table core safety');

for(const mode of ['simple','standard','full'])for(const expanded of [true,false])for(const level of ['simple','standard','full'])assert.equal(d.suppressSupplement(mode,expanded,level),mode==='simple'&&!expanded&&level!=='simple');
console.log('PASS: consolidated simple details preserve core content and never suppress other modes');

for(const mode of ['simple','standard','full','invalid'])assert.equal(d.layerDefault(mode),mode==='full');
console.log('PASS: history layer defaults to on only in full mode');

assert.deepEqual(d.columnIndices('hall',['科目','历次小走势','历史最佳排名','历史最佳得分','最近可比记录','距离历史最佳','状态']),[1]);
