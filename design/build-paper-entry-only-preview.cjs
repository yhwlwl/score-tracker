/* Synthetic data for the public preview; no historical user records. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'paper-entry-only-qa');
const samples = JSON.parse(fs.readFileSync(path.join(out, 'samples.json'), 'utf8'));
const prior = fs.readFileSync(path.join(__dirname, 'paper-record-flow-qa/index.html'), 'utf8');
const template = JSON.parse(prior.match(/window.__paperFlowDemo=(.*?);<\/script>/s)[1]).record;
const user = '00000000-0000-4000-8000-000000001001';
const clone = value => JSON.parse(JSON.stringify(value));
const scans = {};
const xml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(value){return String(value||'（此处未读清，保留待核对）').split('\n').flatMap(line=>Array.from({length:Math.max(1,Math.ceil(Array.from(line).length/36))},(_,i)=>Array.from(line).slice(i*36,(i+1)*36).join('')));}
function buildScans(row){
  const pages=[],folder=path.join(out,'scans');fs.mkdirSync(folder,{recursive:true});
  for(const kind of ['paper','work'])for(let start=0;start<row.result.questions.length;start+=4){
    const chunk=row.result.questions.slice(start,start+4),blocks=chunk.map(q=>({q,lines:wrap(kind==='paper'?q.stem:q.answer)}));
    const height=160+blocks.reduce((n,b)=>n+Math.max(170,b.lines.length*32+104),0),page=pages.length+1,file=(row.subject==='数学'?'math':'physics')+'-'+kind+'-'+(start/4+1)+'.svg';let top=120;
    let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+height+'" viewBox="0 0 1000 '+height+'"><rect width="1000" height="'+height+'" fill="white"/><text x="40" y="48" font-size="28" fill="#26334c" font-family="sans-serif">'+xml(row.subject+' · '+(kind==='paper'?'模拟原题扫描页':'模拟答题卡作答页'))+'</text><text x="40" y="86" font-size="18" fill="#7b879a" font-family="sans-serif">合成演示资料，无真实姓名、考号或成绩</text>';
    blocks.forEach(({q,lines})=>{const h=Math.max(170,lines.length*32+104);svg+='<rect x="30" y="'+top+'" width="940" height="'+(h-10)+'" rx="6" fill="white" stroke="#d7dfeb"/><text x="48" y="'+(top+34)+'" fill="#24324a" font-size="24" font-family="sans-serif">第 '+xml(q.label)+' 题 · '+xml(q.question_type)+'</text>'+(kind==='work'?'<text x="940" y="'+(top+34)+'" text-anchor="end" fill="#be4545" font-size="23" font-family="sans-serif">'+xml(q.teacher_score==null?'批改分待确认':q.teacher_score+' / '+q.max_score+' 分')+'</text>':'');lines.forEach((line,i)=>{svg+='<text x="48" y="'+(top+76+i*32)+'" fill="'+(kind==='paper'?'#24324a':'#294b94')+'" font-size="22" font-family="sans-serif">'+xml(line)+'</text>';});q.source_regions.push({kind,page,box:[.03,Math.round(top/height*10000)/10000,.94,Math.round((h-10)/height*10000)/10000]});q[kind==='paper'?'pages':'work_pages']=[page];top+=h;});
    svg+='</svg>';fs.writeFileSync(path.join(folder,file),svg);pages.push({page,role:kind,url:'./scans/'+file});
  }
  scans[row.subject]=pages;row.result.source_pages=pages.map(({page,role})=>({page,role}));
}
const records = samples.map((sample, i) => {
  const row = clone(template);
  const suffix = String(i + 1).padStart(3, '0');
  Object.assign(row, { request_id:'00000000-0000-4000-8000-000000002'+suffix, draft_id:'00000000-0000-4000-8000-000000003'+suffix,
    exam_id:'00000000-0000-4000-8000-000000004'+suffix, subject:sample.subject, title:sample.subject+' · 录入示例',
    created_at:sample.tested_on+'T00:00:00Z', completed_at:sample.tested_on+'T00:00:00Z', revision:0,
    options:{config_version:2,purpose:'record',modules:[],use_account_history:false,time_budget_minutes:15,review_before_analysis:false}, corrections:[] });
  row.result = Object.assign(clone(template.result), { record_only:true, screenshot_only:true, account_context:null, exam_context:null, context:{},
    source_pages:[], options:row.options, overview:'用于预览核对、保存和题型统计的合成试题。',
    total:{score:Number(sample.total_score),max:Number(sample.total_max)},
    coverage:'合成演示数据；不调用模型，不读取或修改真实账号。',
    score_groups:[],ai_grade_checks:[],score_check:{status:'incomplete',issues:[]},
    warnings:['示例中的缺失和歧义用于体验核对流程，不代表真实识别准确率。','此公开版本不包含真实测试数据。'],
    questions:sample.questions.map(raw => {
      const q = Object.assign(clone(template.result.questions[0]),raw);
      q.id=String(q.label);q.pages=[];q.work_pages=[];q.reference_pages=[];q.source_regions=[];
      q.score_mark=null;q.max_mark=null;q.reference_mark=null;q.record_only=true;q.question_difficulty='';
      q.question_type=raw.question_type||(q.kind==='single_choice'?'单选题':q.kind==='multiple_choice'?'多选题':'解答题');
      q.answer=(q.answer||'').replaceAll('\\n','\n');q.reference='';q.estimated_score=null;q.ai_grading=null;
      q.knowledge=[];q.score_evidence=q.teacher_score===null?'示例：未确认逐题批改分，保留为空。':'合成示例批改分。';
      q.analysis_mode='record';q.review_status='unresolved';q.evidence_verified=false;
      return q;
    }) });
  buildScans(row);row.result.questions.forEach(q=>{q.screenshot_only=true;q.work_expected=true;q.stem='原题见截图';q.answer='';q.analysis_mode='';q.confirmation_prompt='';});return row;
});
const exams=records.map(r=>({id:r.exam_id,name:r.subject+' · 示例考试',exam_date:r.created_at.slice(0,10),updated_at:r.created_at,
  scores:{[r.subject]:{actual:r.result.total.score,max:r.result.total.max,raw:r.result.total.score,rawMax:r.result.total.max}},question_type_scores:{}}));
const data={user,records,exams,scans};
const pre='<meta name="robots" content="noindex,nofollow,noarchive"><script>window.ScorePaperEntryOnly=true;window.__entryPreview='+JSON.stringify(data).replaceAll('<','\\u003c')+';</script><script src="./preview.js"></script><link rel="stylesheet" href="./preview.css">';
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(src|href)="\.\//g,'$1="../../').replace('<head>','<head>'+pre);
html=html.replace(/<title>[^<]*<\/title>/,'<title>试题录入预览 · 成绩轨迹</title>').replace('</body>','<script src="./boot.js"></script></body>');
fs.writeFileSync(path.join(out,'index.html'),html.trimEnd()+'\n');
console.log('Entry-only preview: '+records.length+' synthetic records, '+records.reduce((n,r)=>n+r.result.questions.length,0)+' questions.');
