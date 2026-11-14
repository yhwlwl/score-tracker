const assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,input,rid}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();
 const settings={config_version:2,modules:[],analysis_scope:'selected',review_before_analysis:false,detail:'brief',goal:'分析最后一题',exam_experience:{completion:'unfinished',checked:'no',note:'最后两分钟'},grade:'高二',learning_range:'未学导数',priorities:['speed','accuracy'],practice_level:'transfer',practice_count:2,study_minutes:10};
 const call=async(body,status=200)=>{const res=await h.call(body),data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;};
 await call({action:'preferences',settings});const pref=(await call({action:'preferences'})).settings;
 assert.equal(pref.exam_experience.note,'');assert.equal(pref.goal,'');assert.deepEqual(pref.selected_questions,[]);assert.equal(pref.grade,'高二');assert.equal(pref.study_minutes,10);
 await call({action:'start',...input,options:settings},202);await h.drain();
 let r=(await call({action:'get',request_id:rid})).review;assert(r.input_review,'selected scope forces the OCR checkpoint');
 await call({action:'confirm_input',request_id:rid,questions:r.recovery.questions,analysis_selection:{analysis_scope:'selected',selected_questions:['missing']}},400);
 await call({action:'confirm_input',request_id:rid,questions:r.recovery.questions,analysis_selection:{analysis_scope:'selected',selected_questions:['2']}});
 await call({action:'resume',request_id:rid,mode:'saved'},202);await h.drain();
 r=(await call({action:'get',request_id:rid})).review;assert.equal(r.status,'succeeded');assert.equal(r.result.record_only,false,'no extensions still produces a basic analysis');
 assert(r.result.overall.difficulty.length);assert(r.result.overall.strengths.length);assert.equal(r.result.questions[0].detail_level,'overview');assert.equal(r.result.questions[1].detail_level,'detailed');assert.deepEqual(r.result.options.selected_questions,['2']);assert.equal(r.result.options.exam_experience.note,'最后两分钟');
 const p=h.upstream.filter(r=>r.messages[0].content[0].text.includes('阶段二：'));assert(p.length);assert(p.some(r=>r.messages[0].content[0].text.includes('未学导数')));assert(p.every(r=>r.reasoning_effort!=='low'||r.messages[0].content[0].text.includes('strength_only')),'brief output does not automatically lower diagnostic reasoning');
 h.scope.legacy={purpose:'analysis',modules:['difficulty'],detail:'standard',focus:'balanced',time_budget_minutes:15,review_before_analysis:false,goal:''};assert.equal(vm.runInContext('JSON.stringify(reviewSettings(legacy))===JSON.stringify(legacy)',h.scope),true,'legacy request fingerprints remain stable');
 console.log('PASS: scoped OCR selection, invalid label rejection, basic overview without extensions, per-exam context isolation, prompt preferences, legacy fingerprint compatibility');
})().catch(e=>{console.error(e);process.exit(1)});
