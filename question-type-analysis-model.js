/* Deterministic, inspectable statistics over optional raw-score breakdowns. */
(function (root) {
  'use strict';
  function num(v) { if (v == null || v === '' || !['number','string'].includes(typeof v) || (typeof v === 'string' && !v.trim())) return null; var n=Number(v); return Number.isFinite(n) && n >= 0 ? n : null; }
  function ratio(points) { var max=points.reduce(function(s,p){return s+p.max;},0); return max ? points.reduce(function(s,p){return s+p.score;},0)/max : null; }
  function chronological(a,b) { return String(a.exam_date||'').localeCompare(String(b.exam_date||'')) || String(a.created_at||'').localeCompare(String(b.created_at||'')) || String(a.id||'').localeCompare(String(b.id||'')); }
  function subjectMark(e, subject) {
    var r=(e.scores||{})[subject]||{}, max=num(r.rawMax), score=num(r.raw);
    if (max===null) max=num(r.max);
    if (score===null && max===num(r.max)) score=num(r.actual);
    return max>0 && score!==null && score<=max ? {score:score,max:max} : null;
  }
  function groupKey(r, group) { return JSON.stringify([r.name.trim(), group==='position' ? (r.position||'').trim() : '']); }
  function analyze(source, options) {
    var o=options||{}, subject=o.subject, seen=new Set();
    var exams=(source||[]).filter(function(e){
      if (!e || !Object.prototype.hasOwnProperty.call(e.scores||{},subject) || (!o.includeHidden && e.is_hidden)) return false;
      if (o.category != null && o.category!=='*' && (e.grade_level||'')!==o.category) return false;
      if(e.id && seen.has(String(e.id)))return false;if(e.id)seen.add(String(e.id));return true;
    }).slice().sort(chronological);
    if (Number(o.limit)>0) exams=exams.slice(-Number(o.limit));
    var groups=new Map(), incomplete=0, invalid=0, recorded=0, coverageMax=0, subjectMax=0, coverageExams=0;
    exams.forEach(function(e,index){
      var rows=(e.question_type_scores||{})[subject], cells=new Map();
      if(!Array.isArray(rows))rows=[];
      if(rows.length)recorded++;
      var identities=new Set(), namesWithTotal=new Set(rows.filter(function(r){return r&&typeof r.name==='string'&&!r.position;}).map(function(r){return r.name.trim();}));
      rows.forEach(function(r){
        if(!r || typeof r.name!=='string' || !r.name.trim() || (r.position!=null&&typeof r.position!=='string')){invalid++;return;}
        var id=groupKey(r,'position');
        if(identities.has(id) || (r.position && namesWithTotal.has(r.name.trim()))){invalid++;return;}identities.add(id);
        var key=groupKey(r,o.group), name=r.name.trim();
        if(!groups.has(key))groups.set(key,{key:key,name:name,position:o.group==='position'?(r.position||'').trim():'',cells:new Array(exams.length).fill(null)});
        if(!cells.has(key))cells.set(key,{score:0,max:0,complete:true,difficulties:[],causes:[],parts:0});
        var c=cells.get(key), score=num(r.score), max=num(r.max);
        c.parts++;
        var valid=score!==null&&max>0&&score<=max;
        if(!valid){c.complete=false;incomplete++;}else{c.score+=score;c.max+=max;}
        if(['easy','medium','hard'].includes(r.difficulty))c.difficulties.push(r.difficulty);
        if(['knowledge','method','careless','time'].includes(r.cause))c.causes.push(r.cause);
      });
      cells.forEach(function(c,key){c.rate=c.complete?c.score/c.max:null;c.index=index;groups.get(key).cells[index]=c;});
      var r=(e.scores||{})[subject]||{}, rawMax=num(r.rawMax);if(rawMax===null)rawMax=num(r.max);
      if(rawMax>0){coverageExams++;subjectMax+=rawMax;coverageMax+=Math.min(rawMax,Array.from(cells.values()).filter(function(c){return c.complete;}).reduce(function(s,c){return s+c.max;},0));}
    });
    var rows=Array.from(groups.values()), totalLost=0, totalScore=0, totalMax=0;
    rows.forEach(function(g){
      var valid=g.cells.filter(function(c){return c&&c.complete;}), last=valid.slice(-3), half=Math.min(3,Math.floor(valid.length/2));
      g.count=valid.length;g.score=valid.reduce(function(s,c){return s+c.score;},0);g.max=valid.reduce(function(s,c){return s+c.max;},0);
      g.lost=g.max-g.score;g.rate=g.max?g.score/g.max:null;g.lossRate=g.rate===null?null:1-g.rate;
      g.lossCount=valid.filter(function(c){return c.score<c.max-0.000001;}).length;g.frequency=g.count?g.lossCount/g.count:null;
      g.recentRate=ratio(last);g.recentLossCount=last.filter(function(c){return c.score<c.max-0.000001;}).length;
      g.latest=valid.at(-1)||null;
      // At least two observations in each non-overlapping window; missing entries do not become zeroes.
      g.change=valid.length>=4 ? ratio(valid.slice(-half))-ratio(valid.slice(-half*2,-half)) : null;
      var dif=last.flatMap(function(c){return c.difficulties;}), cause=last.flatMap(function(c){return c.causes;});
      var distinct=Array.from(new Set(dif));g.difficulty=distinct.length===1?distinct[0]:distinct.length?'mixed':null;
      g.difficultyCount=dif.length;g.difficultyComplete=last.length>0&&dif.length===last.reduce(function(s,c){return s+c.parts;},0);
      // Never turn an unlabelled portion into a confirmed easy/hard recommendation.
      g.rankDifficulty=g.difficultyComplete?g.difficulty:null;
      g.cause=cause.length?cause.sort(function(a,b){return cause.filter(function(c){return c===b;}).length-cause.filter(function(c){return c===a;}).length;})[0]:null;
      totalLost+=g.lost;totalScore+=g.score;totalMax+=g.max;
    });
    var marks=exams.slice(-5).map(function(e){return subjectMark(e,subject);}).filter(Boolean), levelRate=ratio(marks), target=num(o.targetRate);
    if(target!==null&&(target<=0||target>100))target=null;
    var latestSubject=exams.length?(exams.at(-1).scores||{})[subject]:null;
    if(target===null&&latestSubject){var t=num(latestSubject.target), m=num(latestSubject.max), rm=num(latestSubject.rawMax);if(t!==null&&m>0&&t<=m&&(rm===null||rm===m))target=t/m*100;}
    var level=['foundation','balanced','advanced'].includes(o.level)?o.level:levelRate===null?'unknown':levelRate>=0.85?'advanced':levelRate<0.7?'foundation':'balanced';
    var maxLoss=Math.max(1,...rows.map(function(g){return g.count?g.lost/g.count:0;}));
    rows.forEach(function(g){
      g.contribution=g.count&&totalLost>0?g.lost/totalLost:null;
      if(!g.count||g.lost<=0){g.priority={quick:0,breakthrough:0,all:0};return;}
      var loss=g.lost/g.count/maxLoss, freq=0.5+0.5*g.frequency, recent=0.4+0.6*(1-g.recentRate), falling=g.change!==null&&g.change<-.03?1.15:1;
      var d=g.rankDifficulty, easy={easy:1,medium:.65,hard:level==='advanced'?.3:.12}[d]||.35, hard={hard:1,medium:.55,easy:.15}[d]||.3;
      var causeBoost=['careless','time'].includes(g.cause)?1.2:1;
      var readiness=level==='foundation'?.65:level==='advanced'?1.2:1;
      if(target!==null&&target>=90)readiness*=1.1;
      g.priority={quick:loss*easy*freq*recent*falling*causeBoost,breakthrough:hard*Math.sqrt(loss)*freq*(.6+.4*g.recentRate)*readiness,all:loss*freq*recent*falling};
    });
    return {exams:exams,rows:rows,subject:subject,recorded:recorded,incomplete:incomplete,invalid:invalid,totalLost:totalLost,rate:totalMax?totalScore/totalMax:null,coverage:subjectMax?coverageMax/subjectMax:null,coverageExams:coverageExams,level:level,levelRate:levelRate,levelCount:marks.length,targetRate:target,recommended:level==='advanced'||(target>=90&&level!=='foundation')?'breakthrough':level==='foundation'?'quick':'all'};
  }
  function ranked(result,view){return result.rows.slice().sort(function(a,b){return (b.priority[view]||0)-(a.priority[view]||0)||b.lost-a.lost||a.name.localeCompare(b.name);});}
  var api={analyze:analyze,ranked:ranked,num:num,subjectMark:subjectMark,groupKey:groupKey};root.ScoreQuestionTypeAnalysisModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
