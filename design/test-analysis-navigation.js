const assert = require('node:assert/strict');
const {classify,normalize,groups,displayTitle,cardOrder}=require('../analysis-navigation.js');
const cases=[
['① 总览','kpi','overview'],['② 智能提醒','','overview'],['⑤ 个人最佳殿堂','','overview'],
['⑧ 全量统计矩阵','matrix','overview'],['③ 趋势与进步','trend','trend'],['成绩含金量','worth','trend'],
['⑦ 名次竞争力','','trend'],['排名分布','distribution','trend'],['④ 学科结构','','subject'],
['进步速度榜','speed','subject'],['学科雷达图','','subject'],['题型分析','','subject'],
['⑥ 目标校准','','forecast'],['⑨ 深度分析','deep','forecast'],['相似轨迹与预测','peer','forecast'],
['⑩ 数据与计算方法','quality','methods'],['当前范围暂无可分析成绩','','overview']
];
for(const [title,key,expected] of cases) assert.equal(classify(title,key),expected,title);
assert.deepEqual(groups.map(g=>g.id),['overview','trend','subject','forecast']);
for(const g of groups) assert.equal(normalize(g.id),g.id);
assert.equal(normalize('all'),'all');assert.equal(normalize('methods'),'methods');
assert.equal(normalize(null),'overview');assert.equal(normalize('invalid'),'overview');
assert.equal(displayTitle('⑨ 深度分析','deep'),'学习状态预测');
assert.equal(displayTitle('⑥ 目标校准',''),'目标校准');
assert.equal(displayTitle('成绩含金量','worth'),'成绩含金量');
assert.equal(displayTitle('⑩ 数据与计算方法','quality'),'数据与计算方法');
assert.ok(cardOrder('目标校准','')<cardOrder('相似轨迹','peer'));
assert.ok(cardOrder('相似轨迹','peer')<cardOrder('学习状态预测','deep'));
console.log('analysis navigation classification, title and ordering: OK');
