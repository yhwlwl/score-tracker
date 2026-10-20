// Learner-focused invariants, exercised through the real source modules and HTTP handler.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,input,examId,uid}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const evaluate=s=>vm.runInContext(s,h.scope);
 h.scope.sample={year_rank:107,year_count:null,total_year_rank:8,total_year_count:500,score:65,max:100,source:'forged',school:'must not pass'};
 let context=evaluate('examContext(sample)');assert.equal(context.year_rank,107);assert(!('year_count'in context));assert.equal(context.source,'user_entry');assert(!('school'in context));assert(!('year_position_percent'in context));
 h.scope.sample={year_rank:107,year_count:90,year_position_percent:1};context=evaluate('examContext(sample)');assert(!('year_rank'in context),'rank cannot exceed cohort size');
 h.scope.sameTasks=[{title:'句数',questions:['A']},{title:'语法',questions:['A']}];h.scope.taskSources=[{label:'A',suggestion:'写两句并核对谓语',success_check:'独立满足句数和谓语要求'}];
 assert.equal(evaluate('groundActions(sameTasks,taskSources)').length,1,'different headings cannot repeat the identical task and check');
 h.scope.inventoryRaw={complete:true,questions:[{label:'A',stem:'计算并说明理由',pages:[1],max_score:10,max_mark:{page:1,quote:'满分10'},answer:'invented work',teacher_score:10,score_mark:{page:1,quote:'10分',scope:'question',label:'A'}}]};
 h.scope.sourceInput={...input,pages:[{role:'paper',page:1,url:input.pages[0].url}]};
 h.scope.inventory=evaluate('normalizeInventory(inventoryRaw,sourceInput)');assert.equal(h.scope.inventory.questions[0].answer,'');assert.equal(h.scope.inventory.questions[0].teacher_score,null,'paper inventory cannot supply a student grade');
 h.scope.workRaw={complete:true,total:{score:5,score_mark:{page:1,quote:'总分5'}},questions:[{label:'A',stem:'malicious replacement',max_score:999,answer:'先列方程',status:'answered',teacher_score:5,work_pages:[1],score_mark:{page:1,quote:'5分',scope:'question',label:'A'}}]};
 let work=evaluate('normalizeWork(workRaw,inventory,sourceInput)');assert.equal(work.questions[0].stem,'计算并说明理由');assert.equal(work.questions[0].max_score,10);assert.equal(work.questions[0].teacher_score,5);
 h.scope.fact={label:'1',teacher_score:5,max_score:10,answer:'先列出受力关系',subparts:[],stem:'分析两个阶段的运动并求最大位移',status:'answered'};
 h.scope.candidate={wins:[{skill:'建模起步',observed:'列出受力关系',basis:'work',significance:'已有独立起步，可以接着检查阶段边界'},{skill:'虚构成功',observed:'根本没有写的过程',basis:'work',significance:'不应出现'}],difficulty:{overall:4,evidence_quote:'两个阶段',reason:'阶段间约束切换',dimensions:{thinking:{score:4,reason:'多条件'},calculation:{score:2,reason:'简单代入'}}},cause_analysis:{observation:'后续空白',hypotheses:[{kind:'time',explanation:'可能时间不足',evidence:'只完成前半段',counter_evidence:'也可能未找到后续模型',check:'不看答案限时口述接下来如何分段',if_confirmed:'先验证能独立起步，再记录限时重做耗时',status:'confirmed'}]}};
 let fields=evaluate('learnerFields(candidate,fact,true)');assert.equal(fields.wins.length,1);assert.equal(fields.difficulty.overall,4);assert.equal(fields.cause_analysis.hypotheses[0].status,'hypothesis','model cannot claim to know the student\'s exam-time mental state');
 h.scope.candidate.difficulty.evidence_quote='不存在的题干';assert.equal(evaluate('learnerFields(candidate,fact,true)').difficulty,null);
 h.scope.fact.teacher_score=10;fields=evaluate('learnerFields(candidate,fact,true)');assert.equal(fields.analysis_mode,'strength');assert.equal(fields.cause_analysis.hypotheses.length,0);
 fields=evaluate('learnerFields(candidate,fact,false)');assert.equal(fields.wins.length,0);assert.equal(fields.cause_analysis.hypotheses.length,0);
 h.scope.queue={questions:[{...h.scope.fact,label:'a',teacher_score:0},{...h.scope.fact,label:'b',max_score:10},{...h.scope.fact,label:'c',max_score:10}]};
 const queue=evaluate('analysisQueue(queue)');assert.equal(queue.map(q=>q.label).join(','),'b,c,a');h.scope.ordered=queue;assert.equal(evaluate('nextBatch(ordered,0)').length,2,'full-credit complex questions share a short positive-evidence pass');
 const a=await h.call({action:'start',...input,exam_id:examId,exam_context:{year_rank:1,score:999}});assert.equal(a.status,202);await h.drain();let row=h.tables.score_tracker_paper_reviews[0];assert.equal(row.result.exam_context,null,'client cannot inject saved exam scores');
 assert.equal(row.result.questions[0].analysis_mode,'strength');assert.equal(row.result.questions[0].reference,'','full-credit answer is not solved again');assert.equal(row.result.questions[0].practice,'');assert.equal(row.result.questions[0].estimated_score,null);
 assert.equal(h.upstream.at(-1).messages[0].content.filter(c=>c.type==='image_url').length,0,'summary does not reread all images');
 let c={id:'2',answer:'x=7',teacher_score:0,max_score:5,verified:true,corrected:false,reflection:{cause:'time',note:'只剩一分钟',source:'ai_confirmed'}};
 const saved=await(await h.call({action:'correct',request_id:input.request_id,revision:0,corrections:[c]})).json();assert.equal(saved.review.corrections[0].reflection.source,'student_recollection');assert.equal(saved.review.result.questions[1].cause_analysis.hypotheses[0].status,'hypothesis');
 // JSONB reorders object keys in real Postgres; a checkpoint must retain the same source fingerprint.
 const second=harness();await second.init();const original=second.scope.fetch;
 second.scope.fetch=async(url,options)=>{if(url.startsWith('https://test.local/functions/')){const row=second.tables.score_tracker_paper_reviews[0];if(row.analysis_state?.exam_context)row.analysis_state.exam_context=Object.fromEntries(Object.entries(row.analysis_state.exam_context).reverse());}return original(url,options);};
 assert.equal((await second.call({action:'start',...input,exam_context:{score:65,max:100,year_rank:107}})).status,202);await second.drain();assert.equal(second.tables.score_tracker_paper_reviews[0].status,'succeeded');assert.equal(second.tables.score_tracker_paper_reviews[0].result.exam_context.year_rank,107);
 // A second owner cannot write a reflection or obtain the private checkpoint.
 h.tables.score_tracker_paper_reviews[0].user_id='00000000-0000-4000-8000-000000000002';assert.equal((await h.call({action:'correct',request_id:input.request_id,revision:1,corrections:[c]})).status,404);
 console.log('PASS: source-grounded strengths/difficulty, uncertain causes, reflection ownership, private saved context, positive batching and compact synthesis');
})().catch(e=>{console.error(e);process.exitCode=1});
