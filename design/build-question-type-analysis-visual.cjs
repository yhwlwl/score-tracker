/* Synthetic acceptance harness: loads the shipped assets, no production requests. */
const fs=require('node:fs'),path=require('node:path'),{pre}=require('./build-exam-detail-visual.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'question-type-analysis-qa');
const exams=Array.from({length:12},(_,i)=>{
  const scale=i===2?2/3:1,mark=(name,score,max,extra={})=>({name,score:score===null?null:Math.round(score*scale*100)/100,max:Math.round(max*scale*100)/100,...extra});
  const rows=[mark('听力',20+i%7,30,{difficulty:'easy',cause:'careless'}),mark('阅读理解',i===7?null:6+i%4,10,{position:'阅读 A',difficulty:'medium'}),mark('阅读理解',20+i%6,30,{position:'阅读 B–D',difficulty:'hard',cause:'method'}),mark('完形填空',6+Math.min(6,i),15,{difficulty:'easy',cause:'knowledge'}),mark('语法填空',i===1?0:8+i%4,15,{cause:'time'}),mark('读后续写',22+i%3,25,{difficulty:'hard',cause:'method'})];
  const actual=Math.round((rows.reduce((s,r)=>s+(r.score||0),0)+12*scale)*100)/100;
  return {id:'33333333-3333-4333-8333-'+String(i+1).padStart(12,'0'),name:['九月摸底测验','第一阶段练习','百分制随堂测验','国庆阶段检测','周末巩固练习','高三上第一次月考','第二阶段练习','高三英语联考','专项复习测试','第二次月考','考前模拟练习','高三上学期期中考试'][i],exam_date:'2026-10-'+String(i*2+1).padStart(2,'0'),grade_level:i<4?'高二':'高三',scores:{英语:{actual,raw:actual,max:150*scale,rawMax:150*scale,target:135*scale},数学:{actual:130,max:150,rawMax:150}},question_type_scores:i===4?{}:{英语:rows,数学:[{name:'选择题',score:40,max:40,difficulty:'easy'},{name:'解答题',position:'第 21 题',score:9,max:12,difficulty:'hard'}]}};
});
const seed={user:{id:'11111111-1111-4111-8111-111111111111',username:'题型分析演示'},token:'synthetic-question-analysis',page:'stats',allExams:exams,exams,modulesV18:[],subjectConfigs:[{name:'英语',defaultMax:150},{name:'数学',defaultMax:150}]};
if(require.main===module){
  fs.mkdirSync(out,{recursive:true});
  const post=`<script>document.addEventListener('DOMContentLoaded',function(){Object.assign(state,${JSON.stringify(seed)});window.qaSeed=${JSON.stringify(seed)};applyExamSubjectsV10(state.exams,state.subjectConfigs);render();ScoreQuestionTypeAnalysis.open('英语');});</script>`;
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(src|href)="\.\//g,'$1="../../').replace('<head>','<head>'+pre).replace('</body>',post+'</body>');
  fs.writeFileSync(path.join(out,'index.html'),html);console.log(out);
}
module.exports={seed};
