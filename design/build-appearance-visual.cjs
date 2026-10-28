// Synthetic data with the production markup and assets; never reads login credentials.
const fs = require('node:fs'), path = require('node:path');
const { seed, pre } = require('./build-exam-detail-visual.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'appearance-qa');
fs.mkdirSync(out, {recursive:true});
const example = {...seed, page:'account'};
const presets = [['cloud','云间天蓝'],['notebook','方格笔记'],['garden','薄荷花园'],['dawn','晨光奶油'],['night','星河夜读'],['journal','复古手账']];
const options=Array.from({length:28},(_,i)=>({id:'example-'+i,key:'example-'+i,label:['成绩对比','目标跟踪','数据导出','自定义科目'][i%4]+' · 示例 '+(i+1),isActive:true,votes:70-i,votedByMe:i<3}));
const fixture = `<script>
var params=new URLSearchParams(location.search);
localStorage.setItem('st_reading_v1',JSON.stringify({font:params.get('font')||'system',size:params.get('size')||'standard'}));
try{var look=JSON.parse(params.get('look')||'null');if(look&&typeof look==='object'){localStorage.setItem('st_studio_v1',JSON.stringify(look));}}catch(e){}
window.fetch=async function(url,opts){
 var action=JSON.parse(opts&&opts.body||'{}').action,result={ok:true,enabled:false,exams:[],subjects:[],modules:[],rows:[],reviews:[],drafts:[],profile:{completed_at:'2026-01-01',school_prompted_at:'2026-01-01'},user:{username:'视觉验收示例',originalUsername:'视觉验收示例'}};
 if(action==='community_public')result={config:{enabled:true,qr_image:'/community-qr-20261024.jpg',title:'交流与反馈 · 预览',intro:'此页为界面预览，使用合成数据。',expires_at:null}};
 if(action==='feature_vote_overview')result={options:${JSON.stringify(options)},myVotes:${JSON.stringify(options.slice(0,3))},suggestions:[{id:'example-request',content:'希望记录自定义题型的得分情况',status:'new'}],availableCount:25,totalVoters:126};
 if(action==='get_goal')result={goal:{}};
 return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
};
</script>`;
const post = `<script>
document.addEventListener('DOMContentLoaded',function(){
 Object.assign(state,${JSON.stringify(example)});applyExamSubjectsV10(state.exams,state.subjectConfigs);
 var mode=params.get('page')||'appearance';state.page=mode==='appearance'||mode==='editor'?'account':mode;render();
 var preset=params.get('preset');
 requestAnimationFrame(function(){
  if(preset&&${JSON.stringify(presets.map(x=>x[0]))}.includes(preset)){
   ScoreAppearance.open();document.querySelector('[data-preset="'+preset+'"]').click();document.querySelector('[data-apply]').click();
  }
  if(mode==='editor')openExam(state.allExams[0]);
  if(params.get('studio'))ScoreAppearance.open();
  if(mode==='appearance'&&!params.get('studio'))document.getElementById('appearanceCardV29').scrollIntoView({block:'start'});
 });
});
</script>`;
const frame=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(src|href)="\.\//g,'$1="../').replace('<head>','<head><base href="../">'+pre+fixture).replace('</body>',post+'</body>');
fs.writeFileSync(path.join(out,'frame.html'),frame);
const select=(id,label,values)=>`<label>${label}<select id="${id}">${values.map(([value,name])=>`<option value="${value}">${name}</option>`).join('')}</select></label>`;
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>外观设置预览 · 成绩轨迹</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e8eef5;color:#21364b;font:14px/1.5 system-ui}header{background:#fff;border-bottom:1px solid #d9e3ef;padding:14px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}header>b{margin-right:8px}label{display:flex;align-items:center;gap:6px}select{font:inherit;padding:6px;border:1px solid #d4dfeb;border-radius:8px;background:#fff;color:inherit}header small{color:#65758a}main{padding:20px;width:max-content;min-width:100%}iframe{display:block;border:1px solid #c6d7e8;border-radius:18px;background:#fff;box-shadow:0 18px 55px #24445f16;margin:auto}@media(max-width:620px){header{padding:12px;gap:9px;font-size:12px}header>b{width:100%}main{padding:12px}}</style>
<header><b>成绩轨迹 · 外观预览</b>
${select('page','页面',[['appearance','外观设置'],['account','完整账号页'],['home','概览'],['records','考试记录'],['stats','分析'],['editor','考试录入']])}
${select('viewport','尺寸',[['390,844','手机 390'],['320,740','窄屏 320'],['430,932','大屏手机 430'],['768,1024','平板 768'],['1280,900','桌面 1280']])}
${select('preset','成套主题',[['','自由搭配'],...presets])}
${select('theme','基础配色',[['sky','天蓝'],['sunny','晴白'],['paper','暖纸'],['sakura','樱粉'],['violet','淡紫'],['mint','青屿'],['night','墨夜']])}
${select('font','正文',[['system','系统默认'],['sans','清晰黑体'],['serif','书卷宋体'],['wenkai','霞鹜文楷'],['fangsong','朱雀仿宋']])}
${select('size','字号',[['standard','标准'],['compact','小字'],['large','大字']])}
<small>合成数据 · 不连接真实账号</small></header><main><iframe id="preview" title="外观和设置预览" width="390" height="844"></iframe></main>
<script>
const f=document.getElementById('preview'),controls=['page','theme','font','size','preset'].map(id=>document.getElementById(id));
const p=new URLSearchParams(location.search);let carry=null;
try{carry=JSON.parse(p.get('look')||'null')}catch(e){}
controls.forEach(el=>{if(p.has(el.id)&&[...el.options].some(o=>o.value===p.get(el.id)))el.value=p.get(el.id)});
function reload(event){
 try{const latest=f.contentWindow.localStorage.getItem('st_studio_v1');if(latest)carry=JSON.parse(latest)}catch(e){}
 const id=event&&event.target.id;
 if(id==='preset')carry=null;
 if(id==='theme'){document.getElementById('preset').value='';if(carry){carry.theme='';carry.palette=document.getElementById('theme').value;}}
 if((id==='font'||id==='size')&&carry){carry.reading={font:document.getElementById('font').value,size:document.getElementById('size').value};}
 const q=new URLSearchParams(Object.fromEntries(controls.map(el=>[el.id,el.value])));
 if(carry){q.set('look',JSON.stringify(carry));q.delete('preset');}
 if(document.getElementById('page').value==='appearance')q.set('studio','1');
 f.src='./frame.html?'+q;history.replaceState(null,'','?'+q);
}
controls.forEach(el=>el.onchange=reload);
const view=document.getElementById('viewport');function size(){let[w,h]=view.value.split(',');f.width=w;f.height=h;}view.onchange=size;
if(innerWidth<620){const value=Math.max(280,innerWidth-24)+','+Math.max(600,innerHeight-100);const option=new Option('当前屏幕',value);view.add(option);view.value=value;}
size();reload();
</script></html>`);
console.log('Generated appearance-qa/ using synthetic data and production assets.');
