const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const scope={};vm.createContext(scope);vm.runInContext(read('notice-layout.js'),scope);
const layout=scope.ScoreNoticeLayout,notice=read('design/release-v10.0-notice.md'),d=layout.parse(notice);
assert(layout.isStructured(notice));const ai=d.items.find(x=>x.title==='账号等级与 AI 积分');assert(ai.desc.includes('识别题目、分析试卷'));assert(ai.desc.includes('控制整体预算'));assert(ai.desc.includes('其他功能不会因此受到任何限制'));assert(ai.desc.includes('网站目前仍然完全免费'));assert.equal(layout.validate(d),'');assert.equal(d.items.length,11);assert.equal(d.items.filter(x=>x.featured).length,3);assert.deepEqual(JSON.parse(JSON.stringify(layout.parse(layout.encode(d)))),JSON.parse(JSON.stringify(d)));
assert(!read('natural-entry.js').includes('识别成功后，图片和结果会保存下来，仅供管理员核对准确性。'));assert(read('natural-entry.js').includes('图片及识别结果留存说明'));
for(const [path,events] of Object.entries({'account-growth.js':['account_growth_view','account_growth_refresh','account_ai_usage_opened'],'exam-averages.js':['reference_scores_saved'],'app-v25.js':['radar_picker_opened','radar_picker_confirmed'],'page-display.js':['home_chart_detail'],'release-notices.js':['notice_feature_opened']}))for(const e of events)assert(read(path).includes(e),path+' '+e);
assert(read('exam-averages.js').includes('refMeta.mean_count'));assert(read('exam-averages.js').includes('refMeta.highest_count'));assert(read('app-v25.js').includes('selection_count:state.radarSelection.length'));
console.log('PASS: structured release notice round trip, concise retention disclosure, release telemetry anchors');
