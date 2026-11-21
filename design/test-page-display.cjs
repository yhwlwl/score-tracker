const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),p=require('../page-display.js');
assert.equal(p.ids.length,14);
assert.deepEqual(p.normalize({hidden:['home-overview','home-goal']}),['home-goal']);
for(const [mode,n] of [['simple',11],['standard',4],['full',0]]){assert.equal(p.presetHidden(mode).length,n);assert.equal(p.currentMode(p.presetHidden(mode)),mode);}
assert.equal(p.charts.length,6);
assert.deepEqual(p.normalizePins(['best','bad','best','quad']),['best','quad']);
assert.deepEqual(p.setPin(['best'],'quad',true),['best','quad']);
assert.deepEqual(p.setPin(['best','quad'],'best',false),['quad']);
assert.deepEqual(p.movePin(['best','quad'],'quad',-1),['quad','best']);
assert.deepEqual(p.movePin(['best','quad'],'best',-1),['best','quad']);
assert.notEqual(p.storageKey('a'),p.storageKey('b'));
const src=fs.readFileSync(path.join(__dirname,'../app-v32.js'),'utf8');
for(const marker of ['id="sv31Quad"','id="sv31Scissor"','个人最佳殿堂','进步速度榜','worth-matrix-scroll','你的总分常落在哪个区间'])assert.ok(src.includes(marker),marker);
assert.ok(fs.readFileSync(path.join(__dirname,'../app-v5.js'),'utf8').includes('let html = homeHtmlV3();'));
console.log('PASS: display preferences, chart pins, order, migration and renderer source anchors');

// Unified responsive board: source order is stable and no half-row is left empty.
const layoutCases=[[["trend","quick","recent","radar","quad","compare","matrix","distribution"],[2,1,1,1,1,2,2,2]],[["trend","quick","radar","matrix"],[2,2,2,2]],[["trend","radar","quad","compare","distribution"],[2,1,1,1,1]],[["trend","recent","distribution"],[2,2,2]],[["trend","matrix","best","speed"],[2,2,2,2]],[["trend","quick","recent","radar"],[2,1,1,2]],[["trend","quad","matrix","compare","distribution"],[2,2,2,1,1]],[[],[]]];
for(const [keys,expected] of layoutCases)assert.deepEqual(p.layoutSpans(keys),expected);
const kinds=["quick","recent","radar","quad","compare","best","speed","matrix","distribution"];
for(let mask=0;mask<(1<<kinds.length);mask++){const visible=kinds.filter((_,i)=>mask&(1<<i));for(const order of [visible,visible.slice().reverse()]){let fill=0;for(const span of p.layoutSpans(['trend',...order])){fill+=span;assert.ok(fill<=2);if(fill===2)fill=0;}assert.equal(fill,0);}}
console.log('PASS: 1024 visibility/order combinations, no partial grid row');
