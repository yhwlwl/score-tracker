/* Subject-level paper review. Scores and the existing vision quota are untouched. */
(function () {
  'use strict';
  var support = window.ScorePaperSupport;
  var ENDPOINT = '/api/score-tracker-paper-review', MAX_PAGES = 15;
  var roleNames = { paper: '试卷', work: '答题卡 / 作答', reference: '参考答案' };
  var esc = function (v) { return escapeHtml(String(v == null ? '' : v)); };
  function number(v) { return v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v); }
  function owner() { return String(state.user && state.user.id || ''); }
  function key(user) { return 'st_paper_drafts_v1_' + user; }
  function drafts(user) { try { return JSON.parse(localStorage.getItem(key(user)) || '{}'); } catch (_) { return {}; } }
  function putDraft(user, name, value) { var all = drafts(user); if (value) all[name] = value; else delete all[name]; try { localStorage.setItem(key(user), JSON.stringify(all)); } catch (_) {} }
  function draftFor(user, id) { var all = drafts(user), slot = id || 'new'; if (!all[slot]) { all[slot] = crypto.randomUUID(); putDraft(user, slot, all[slot]); } return all[slot]; }
  function current(ctx) { return ctx.user === owner() && ctx.token === state.token; }
  async function api(ctx, action, payload) {
    if (!current(ctx)) throw new Error('账号已切换，请重新打开考试');
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify(Object.assign({ action: action, token: ctx.token }, payload || {})) });
      var data = await res.json().catch(function () { return {}; });
      if (!current(ctx)) throw new Error('账号已切换，请重新打开考试');
      if (!res.ok) { var err = new Error(data.error || '试卷分析服务暂不可用，请稍后重试'); err.status = res.status; throw err; }
      return data;
    } catch (e) { if (e.name === 'AbortError') throw new Error('连接超时，请稍后查看分析记录'); throw e; }
    finally { clearTimeout(timer); }
  }
  function prepare(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error('第一版支持 JPG、PNG、WebP 图片；PDF 请先导出为图片'));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('单张图片请控制在 10MB 以内'));
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), image = new Image();
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('这张图片打不开，请重新选择')); };
      image.onload = function () {
        var canvas = document.createElement('canvas');
        try {
          var w = image.naturalWidth, h = image.naturalHeight;
          if (!w || !h || w * h > 40000000) throw new Error('图片尺寸过大，请分成几页上传');
          var scale = Math.min(1, 3600 / Math.max(w, h));
          canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
          var c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(image, 0, 0, canvas.width, canvas.height);
          var encoded = canvas.toDataURL('image/jpeg', 0.92);
          if (encoded.length > 2800000) encoded = canvas.toDataURL('image/jpeg', 0.82);
          if (encoded.length > 2800000) throw new Error('图片内容过多，请裁剪成单页后再选');
          resolve({ url: encoded, name: file.name, regions: detailRegions(image, w, h) });
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); canvas.width = canvas.height = 1; }
      };
      image.src = url;
    });
  }
  function detailRegions(source, w, h) {
    // Wide answer sheets keep their whole-page context and get overlapping close-ups.
    if (w < 1800 || w / h < 1.25) return [];
    var regions = [], canvas = document.createElement('canvas');
    for (var i = 0; i < 3; i++) { for (var row = 0; row < 2; row++) {
      var left = Math.max(0, Math.floor(w * (i / 3 - 0.035))), right = Math.min(w, Math.ceil(w * ((i + 1) / 3 + 0.035)));
      var top = Math.max(0, Math.floor(h * (row / 2 - 0.08))), bottom = Math.min(h, Math.ceil(h * ((row + 1) / 2 + 0.08)));
      var scale = Math.min(1, 2600 / Math.max(right - left, bottom - top));
      canvas.width = Math.round((right - left) * scale); canvas.height = Math.round((bottom - top) * scale);
      canvas.getContext('2d').drawImage(source, left, top, right - left, bottom - top, 0, 0, canvas.width, canvas.height);
      regions.push(canvas.toDataURL('image/jpeg', 0.9));
    } }
    canvas.width = canvas.height = 1; return regions;
  }
  async function rotate(page) {
    var image = new Image();
    await new Promise(function (resolve, reject) { image.onload = resolve; image.onerror = reject; image.src = page.url; });
    var canvas = document.createElement('canvas'); canvas.width = image.height; canvas.height = image.width;
    var c = canvas.getContext('2d'); c.translate(canvas.width, 0); c.rotate(Math.PI / 2); c.drawImage(image, 0, 0);
    page.url = canvas.toDataURL('image/jpeg', 0.92); page.regions = detailRegions(canvas, canvas.width, canvas.height); canvas.width = canvas.height = 1;
  }
  function button(label, action, cls) { return '<button type="button" class="pr-button ' + (cls || '') + '" data-pr="' + action + '">' + label + '</button>'; }
  function summary(report) {
    var verified = 0, score = 0, max = 0, scored = 0, losses = [];
    report.result.questions.forEach(function (q) {
      var c = (report.corrections || []).find(function (c) { return c.id === q.id; });
      if (!c || !c.verified) return;
      verified++;
      if (c.teacher_score !== null && c.max_score !== null) {
        score += c.teacher_score; max += c.max_score; scored++;
        if (c.teacher_score < c.max_score) losses.push({ label: q.label, loss: c.max_score - c.teacher_score });
      }
    });
    return { verified: verified, score: Math.round(score * 100) / 100, max: Math.round(max * 100) / 100, scored: scored, losses: losses.sort(function (a, b) { return b.loss - a.loss; }) };
  }
  function bullets(items) { return '<ul>' + (items || []).map(function (s) { return '<li class="pr-text">' + esc(s) + '</li>'; }).join('') + '</ul>'; }
  function prose(value) { return support.prose(value); }
  function fold(title, content, cls) { return content ? '<details class="pr-fold ' + (cls || '') + '"><summary>' + title + '</summary><div class="pr-fold-body">' + content + '</div></details>' : ''; }
  function questionLinks(labels, report) {
    return (labels || []).map(function (label) { var q = report.questions.find(function (q) { return q.label === label; }); return q ? button('第 ' + esc(label) + ' 题', 'focus:' + q.id, 'pr-link') : ''; }).join(' ');
  }
  var causeNames = { uncertain: '还不确定', time: '当时没时间', idea: '当时没思路', execution: '有思路，计算或执行卡住', reading: '读题或理解偏了', expression: '会做，但表达或步骤不完整' };
  function elapsed(ms) { var sec = Math.max(0, Math.floor(ms / 1000)); return Math.floor(sec / 60) + ' 分 ' + sec % 60 + ' 秒'; }
  function runningReport(r) {
    var p = r.progress || {}, steps = p.steps || ['录入题目与作答', '核对批改与填涂', '分析优势和失分原因', '综合复盘与建议'], completed = p.completed_steps == null ? 0 : p.completed_steps;
    return '<section class="pr-progress" aria-label="分析进度"><h3>' + esc(p.message || '正在接收分析任务') + '</h3><p class="pr-text">' + esc(p.detail || '正在读取上传资料。') + '</p><ol class="pr-milestones">' + steps.map(function (title, i) { return '<li class="' + (i < completed ? 'is-done' : i === completed ? 'is-current' : '') + '"><span aria-hidden="true">' + (i < completed ? '✓' : i + 1) + '</span>' + title + '<small>' + (i < completed ? '已完成' : i === completed ? '进行中' : '等待中') + '</small></li>'; }).join('') + '</ol>' +
      (p.total_questions ? '<p>已录入 <b>' + p.total_questions + '</b> 题 · 已分析 <b>' + (p.completed_questions || 0) + '</b> / ' + p.total_questions + ' 题（其中优势分析 ' + (p.strength_questions || 0) + ' 题） · 可读批改 ' + (p.readable_marks || 0) + ' 处</p>' : '') +
      (p.current_questions && p.current_questions.length ? '<p class="pr-current-questions">本轮：第 ' + esc(p.current_questions.join('、')) + ' 题</p>' : '') +
      '<p class="pr-muted">本轮已等待 ' + elapsed(Date.now() - Date.parse(p.run_started_at || r.created_at)) + ' · 当前阶段 ' + elapsed(Date.now() - Date.parse(p.phase_started_at || r.created_at)) + '</p><p class="pr-muted">复杂题会单独分析，阶段耗时可能不同。进度每 3 秒自动更新；你可以返回填写考试，稍后在分析记录中查看。</p>' + button('刷新状态', 'report:' + r.request_id) + '</section>';
  }
  function difficultySections(q) {
    var d = q.difficulty; if (!d) return '';
    var names = { thinking: '思考 / 建模', calculation: '计算负担', reading: '信息整合', expression: '表达论证' };
    return fold('难度 ' + d.overall + ' / ' + (d.scale || 5) + ' · 为什么这样评', prose(d.reason) + '<div class="pr-dimensions">' + Object.keys(names).map(function (axis) { var a = (d.dimensions || {})[axis]; return a && a.score != null ? '<span>' + names[axis] + ' <b>' + a.score + '/' + (d.scale || 5) + '</b><small>' + esc(a.reason) + '</small></span>' : ''; }).join('') + '</div><p class="pr-evidence">题目原文：' + esc(d.evidence_quote) + '</p><p class="pr-muted">按题目要求估计，不是对你能力的评分。</p>', 'pr-difficulty');
  }
  function reflectionRoute(q, cause) {
    var h = q.cause_analysis && q.cause_analysis.hypotheses.find(function (h) { return h.kind === cause; });
    if (h) return '按你的回忆，下一步可尝试：' + h.if_confirmed;
    return { time: '先不看答案重做一次。如果能独立完成，再计时练习，看看哪一步花的时间最多。', idea: '从已经写对的那一步接着做。需要提示时只看下一步，再合上答案，试着说明为什么这样做。', execution: '保留已经列对的式子或思路，分步重做，检查是哪一步算错或漏了条件。', reading: '用自己的话复述题目要求，圈出刚才漏看或看错的条件，再重新作答。', expression: '先把理由说完整，再补写题目要求的步骤或材料依据。', uncertain: '可以先试着重做，再补充你卡在哪一步。' }[cause] || '';
  }
  function causeSections(q, correction) {
    var c = q.cause_analysis; if (!c || q.analysis_mode === 'strength' || q.analysis_mode === 'needs_confirmation') return '';
    var reflection = correction && correction.reflection, cause = reflection && reflection.cause || 'uncertain';
    return '<details class="pr-fold pr-cause"><summary>回想一下，当时为什么没做出来？</summary><div class="pr-fold-body">' + (c && c.observation ? prose(c.observation) : '') +
      (c && c.hypotheses.length ? c.hypotheses.map(function (h) { return '<article><p class="pr-text"><b>先试一下：</b>' + esc(h.check) + '</p><details><summary>为什么做这个验证</summary><p>' + esc(h.explanation) + '</p><p class="pr-evidence">' + esc(h.evidence) + (h.counter_evidence ? '；' + esc(h.counter_evidence) : '') + '</p></details></article>'; }).join('') : '') +
      '<label>' + esc(c && c.question || '当时更接近哪种情况？') + '<select data-field="cause">' + Object.keys(causeNames).map(function (key) { return '<option value="' + key + '" ' + (key === cause ? 'selected' : '') + '>' + causeNames[key] + '</option>'; }).join('') + '</select></label><label>补充当时的情况（可选）<textarea data-field="reflection_note" maxlength="500" rows="2" placeholder="例如：还剩两分钟，只写出了第一步">' + esc(reflection && reflection.note || '') + '</textarea></label><p class="pr-reflection-route pr-text">' + esc(reflectionRoute(q, cause)) + '</p><p class="pr-muted">保存后，会结合你的回忆调整建议。</p></div></details>';
  }
  function positiveSections(report) {
    var wins = report.questions.filter(function (q) { return q.wins && q.wins.length; });
    wins.sort(function (a, b) { function weight(q) { return (q.difficulty && q.difficulty.overall || 0) + (support.wins(q).some(function (w) { return w.basis === 'work'; }) ? 3 : 0); } return weight(b) - weight(a); });
    function card(q) { return '<article class="pr-win-card"><h4>第 ' + esc(q.label) + ' 题</h4>' + support.wins(q).slice(0, 2).map(function (w) { return prose(w.skill) + fold('看作答和说明', '<p class="pr-evidence">你的作答：' + esc(w.observed) + '</p>' + prose(w.significance)); }).join('') + questionLinks([q.label], report) + '</article>'; }
    return wins.length ? '<section class="pr-insight pr-wins"><h3>这些地方做得不错</h3>' + wins.slice(0, 2).map(card).join('') + (wins.length > 2 ? fold('还有 ' + (wins.length - 2) + ' 题做得不错', wins.slice(2).map(card).join(''), 'pr-more-wins') : '') + '</section>' : '';
  }

  function contextSections(report) {
    var c = report.exam_context; if (!c) return '';
    var lines = [];
    function score(label, key, max) { if (c[key] != null) lines.push(label + ' ' + c[key] + (c[max] == null ? '' : ' / ' + c[max])); }
    function rank(label, key, count) { if (c[key] != null) lines.push(label + ' ' + c[key] + (c[count] == null ? '（未填人数）' : ' / ' + c[count] + ' 人')); }
    score('本学科最终分', 'score', 'max'); score('本学科原始分', 'raw_score', 'raw_max');
    if (c.target != null) lines.push('本学科目标分 ' + c.target);
    rank('本学科年排', 'year_rank', 'year_count'); rank('本学科班排', 'class_rank', 'class_count'); rank('总分年排', 'total_year_rank', 'total_year_count'); rank('总分班排', 'total_class_rank', 'total_class_count');
    return '<details class="pr-context"><summary>本次分析采用的考试信息</summary><p class="pr-muted">' + (c.source === 'saved_exam' ? '来自本账号已保存的考试数值。' : '来自开始分析时考试表单的数值。') + '原始分、最终分和不同范围的排名分别保留；不从排名推断具体失分原因。</p>' + bullets(lines) + '</details>';
  }
  function settingsSection(report) {
    var s = report.options; if (!s) return '';
    var names = { strengths: '优势与得分步骤', difficulty: '题目难度', causes: '失分诊断', solutions: '关键解答', practice: '针对性练习', patterns: '跨题共性', plan: '复习计划' };
    return '<details class="pr-context"><summary>本份报告的分析设置</summary><p>' + (s.purpose === 'record' ? '只录入题目、作答和批改' : (s.modules || []).map(function (k) { return names[k]; }).filter(Boolean).join(' · ')) + '</p><p>讲解：' + ({ brief: '简洁', standard: '标准', detailed: '详细' })[s.detail] + ' · 单轮运行上限：' + s.time_budget_minutes + ' 分钟</p>' + (s.goal ? '<p class="pr-text">学习目标：' + esc(s.goal) + '</p>' : '') + '</details>';
  }
  function scoreBreakdown(report) {
    var scored = report.questions.filter(function (q) { return typeof q.teacher_score === 'number' && typeof q.max_score === 'number'; });
    var losses = scored.filter(function (q) { return q.teacher_score < q.max_score; }).sort(function (a, b) { return (b.max_score - b.teacher_score) - (a.max_score - a.teacher_score); });
    var full = scored.filter(function (q) { return q.teacher_score === q.max_score; });
    var lost = scored.reduce(function (n, q) { return n + q.max_score - q.teacher_score; }, 0);
    var focus = losses.slice(0, 2), focusLost = focus.reduce(function (n, q) { return n + q.max_score - q.teacher_score; }, 0);
    var lines = [];
    if (full.length) lines.push('第 ' + full.map(function (q) { return q.label; }).join('、') + ' 题获得满分。');
    if (focus.length) lines.push('失分最集中的题目是第 ' + focus.map(function (q) { return q.label; }).join('、') + ' 题，共失 ' + Math.round(focusLost * 100) / 100 + ' 分，占已录入失分的 ' + Math.round(focusLost / lost * 100) + '%。');
    return { text: lines.join(''), count: scored.length, lost: lost };
  }
  function chapter(id, number, title, description) { return '<section class="pr-reading-section" data-report-section="' + id + '" tabindex="-1"><div class="pr-chapter"><span>' + number + '</span><div><h3>' + title + '</h3><p>' + description + '</p></div></div>'; }
  function overallData(report) {
    return report.overall || { strengths: report.questions.flatMap(function(q){return support.wins(q).slice(0,1).map(function(w){return {title:w.skill,detail:w.significance,questions:[q.label]};});}).slice(0,3), gaps: report.questions.filter(function(q){return q.first_issue && q.first_issue.certainty==='confirmed' && q.review_status!=='teacher_conflict';}).slice(0,3).map(function(q){return {title:q.first_issue.location,detail:q.first_issue.explanation,questions:[q.label]};}), difficulty:report.questions.filter(function(q){return q.difficulty;}).map(function(q){return Object.assign({label:q.label},q.difficulty);}), paper_summary:report.paper_summary || '' };
  }
  function metric(label, value, note) { return '<div class="pr-metric"><span>'+label+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>'; }
  function reportMetrics(report) {
    var paired=report.questions.filter(function(q){return number(q.teacher_score)!==null && number(q.max_score)!==null;}), total=report.total || {}, conflict=report.score_check && report.score_check.status==='conflict';
    var hasTotal=number(total.score)!==null, score=hasTotal?total.score:paired.reduce(function(n,q){return n+q.teacher_score;},0), max=hasTotal?total.max:paired.reduce(function(n,q){return n+q.max_score;},0), known=hasTotal || paired.length>0;
    var rated=overallData(report).difficulty || [], scales=Array.from(new Set(rated.map(function(d){return d.scale||5;}))), mean=rated.length && scales.length===1?Math.round(rated.reduce(function(n,d){return n+d.overall;},0)/rated.length*10)/10:null;
    var html=metric(hasTotal?'原卷批改得分':'已录入题目得分',known?Math.round(score*100)/100+(number(max)!==null?' / '+max:''):'待补充',conflict?'分数合计存在差异，请先核对':hasTotal?'来自卷面明确的总分':'仅汇总得分与满分均明确的 '+paired.length+' 题');
    html+=metric(hasTotal?'卷面得分率':'已录入部分得分率',known&&max>0&&score<=max&&!conflict?Math.round(score/max*1000)/10+'%':'暂无法确定',hasTotal?'按原卷得分与满分计算':'不是整卷得分率');
    html+=metric('题目难度估计',mean!==null?mean+' / '+scales[0]:rated.length?'标尺不同':'暂无法判断',mean!==null?'已评 '+rated.length+' 题的平均值；AI 估计':rated.length?'含旧版五分制，逐题分别查看':'需要清晰、完整的题目条件');
    html+=metric('分析覆盖',report.questions.length+' 题',report.complete?'已识别上传资料中的题目':'资料或分析尚有待补充内容');
    return '<div class="pr-overall-metrics">'+html+'</div>';
  }
  function reportSections(report) {
    if(report.record_only)return '';
    var core=overallData(report), actions=report.action_plan||[], headline=report.headline || core.headline, hasWork=report.work_on_paper!==false || (report.source_pages||[]).some(function(p){return p.role==='work';});
    function findings(items,empty){return items.length?items.slice(0,2).map(function(x){return '<article><strong>'+esc(x.title)+'</strong>'+questionLinks(x.questions,report)+'</article>';}).join(''):'<p class="pr-muted">'+empty+'</p>';}
    var html=chapter('highlights','01','本次整体分析','先了解整体表现，再按需要查看具体题目。')+reportMetrics(report);
    if(headline)html+='<p class="pr-headline">'+esc(headline)+'</p>';
    if(report.overview)html+='<div class="pr-overview">'+prose(report.overview)+'</div>';
    html+='<div class="pr-overall-findings"><section class="pr-overall-win"><h4>做得好的地方</h4>'+findings(core.strengths||[],hasWork?'现有资料暂不足以归纳具体优势，可先查看逐题记录。':'补充作答后，可分析已经做对的部分。')+'</section><section class="pr-overall-gap"><h4>最需要留意的地方</h4>'+findings(core.gaps||[],hasWork?'暂未确认具体问题；待核对的题目不会直接判为薄弱。':'当前仅分析题目要求，不判断个人不足。')+'</section></div>';
    if(actions.length)html+='<div class="pr-first-action"><b>本次优先建议</b><p>'+esc(actions[0].title)+'</p>'+button('查看具体安排','jump:plan')+'</div>';
    var exp=report.options && report.options.exam_experience;
    if(exp && (exp.completion!=='unknown'||exp.checked!=='unknown'||exp.note))html+='<p class="pr-recollection">按你的回忆：'+esc([({finished:'做完了试卷',unfinished:'有题目没做完'})[exp.completion],({yes:'检查过',no:'没来得及检查',partly:'只检查了部分'})[exp.checked],exp.note].filter(Boolean).join('；'))+'。这用于辅助判断，不直接作为逐题错因。</p>';
    html+='</section>'+chapter('performance','02','试卷难度与得分分布','分别看题目要求和实际得分，找到需要进一步了解的部分。');
    html+=prose(core.paper_summary || report.paper_summary || '结合下方逐题评价查看试卷要求；资料不足时暂不作整体难度判断。');
    if(core.difficulty && core.difficulty.length)html+='<p class="pr-muted">按题目要求估计，不由你的对错决定，也不是全体考生的实测难度。</p>'+fold('查看每题难度与得分','<div class="pr-table-scroll"><table class="pr-difficulty-table"><thead><tr><th>题号</th><th>难度估计</th><th>批改得分</th><th>主要难点</th></tr></thead><tbody>'+report.questions.map(function(q){var d=core.difficulty.find(function(d){return d.label===q.label;});return '<tr><td>'+esc(q.label)+'</td><td>'+(d?d.overall+'/'+(d.scale||5):'待评')+'</td><td>'+(q.teacher_score!=null?esc(q.teacher_score)+(q.max_score!=null?' / '+esc(q.max_score):''):'待补充')+'</td><td>'+esc(d&&d.reason||'资料不足')+'</td></tr>';}).join('')+'</tbody></table></div>');
    if(scoreBreakdown(report).text)html+='<p class="pr-score-summary">'+esc(scoreBreakdown(report).text)+'</p>';
    var losses=report.questions.filter(function(q){return q.teacher_score!=null&&q.max_score!=null&&q.teacher_score<q.max_score;}).sort(function(a,b){return (b.max_score-b.teacher_score)-(a.max_score-a.teacher_score);});
    if(losses.length)html+='<div class="pr-loss-map">'+losses.map(function(q){return '<span>第 '+esc(q.label)+' 题 <b>−'+Math.round((q.max_score-q.teacher_score)*100)/100+' 分</b></span>';}).join('')+'</div><p class="pr-muted">仅按明确的逐题批改分汇总，不含 AI 估分；失分多少不等于修复优先级。</p>';
    if((report.score_groups||[]).length)html+='<h4>卷面分组得分</h4><div class="pr-loss-map">'+report.score_groups.map(function(g){return '<span>'+esc(g.label)+' <b>'+esc(g.teacher_score)+(g.max_score==null?'':' / '+esc(g.max_score))+'</b></span>';}).join('')+'</div><p class="pr-muted">分组总分不分摊到小题，也不与逐题得分重复相加。</p>';
    if(report.context_summary)html+=fold('结合本次考试信息看表现',prose(report.context_summary));
    html+='</section>'+chapter('insights','03','做得好的方法与主要问题','结论对应具体题目；多道题之间的共同特点在这里归纳。');
    html+=positiveSections(report);
    if(!(core.strengths||[]).length && (report.strengths||[]).length)html+=bullets(report.strengths);
    if((core.gaps||[]).length)html+='<div class="pr-key-gaps"><h4>已经确认的关键问题</h4>'+core.gaps.map(function(g){return '<article><strong>'+esc(g.title)+'</strong>'+prose(g.detail)+questionLinks(g.questions,report)+'</article>';}).join('')+'</div>';
    if((report.patterns||[]).length)html+='<div class="pr-patterns"><h4>几道题之间的联系</h4>'+report.patterns.map(function(p){return '<article class="pr-pattern"><h4>'+esc(p.title)+(p.confidence==='low'?' <small>还需验证</small>':'')+'</h4>'+prose(p.interpretation)+questionLinks(p.questions,report)+fold('查看依据与反例',prose(p.evidence))+'</article>';}).join('')+'</div>';
    else html+='<p class="pr-muted">'+(report.options && !report.options.modules.includes('patterns')?'本次未展开多题共性分析。':'暂未发现有足够依据的重复特点，不从单道题扩大判断。')+'</p>';
    return html+'</section>';
  }
  function reportPlan(report) {
    if(report.record_only)return '';
    var actions=report.action_plan||[], html=chapter('plan','05','接下来的练习与复习','先解决最值得投入的问题，再用具体任务检查是否掌握。');
    if(report.options && report.options.study_minutes)html+='<p class="pr-muted">你的复习安排：每天约 '+report.options.study_minutes+' 分钟。</p>';
    function action(a,i){return '<article class="pr-action"><div class="pr-action-heading"><span class="pr-step-number">'+(i+1)+'</span><h4>'+esc(a.title)+'</h4></div>'+prose(a.task)+'<div class="pr-success"><b>做到这样就可以：</b>'+prose(a.success_check)+'</div>'+(a.timebox?'<p class="pr-muted">练习安排：'+esc(a.timebox)+'</p>':'')+questionLinks(a.questions,report)+fold('为什么先做这件事',prose(a.reason))+'</article>';}
    if(actions.length)html+='<div class="pr-action-plan">'+actions.slice(0,2).map(action).join('')+(actions.length>2?fold('后续还有 '+(actions.length-2)+' 项安排',actions.slice(2).map(function(a,i){return action(a,i+2);}).join('')):'')+'</div>';
    else if((report.priorities||[]).length)html+=bullets(report.priorities);
    else html+='<p class="pr-muted">'+(report.options && !report.options.modules.includes('plan')?'本次未生成复习计划，可按逐题建议订正。':'现有资料暂不足以安排可靠的补弱任务，可先核对作答。')+'</p>';
    return html+'</section>';
  }
  function reportDetails(report) { return contextSections(report)+settingsSection(report)+((report.uncertainties||[]).length?fold('补充信息与核对项',bullets(report.uncertainties)):''); }
  function questionSections(q, correction) {
    if (q.record_only) return '';
    var html = q.detail_level === 'overview' ? '<p class="pr-muted">本题按你的设置展示简短结论，未生成详细解答和练习。</p>' : '';
    if (q.analysis_mode === 'strength') return '<p class="pr-full-credit">这道题已得满分。</p>' + (q.wins && q.wins.length ? support.wins(q).map(function (w) { return prose(w.skill) + fold('看作答和说明', '<p class="pr-evidence">' + esc(w.observed) + '</p>' + prose(w.significance)); }).join('') : '') + difficultySections(q);
    if (q.analysis_mode === 'needs_confirmation') return html + '<p class="pr-text">' + esc(q.suggestion || '在上方补充本题作答，保存后更新分析。') + '</p>';
    if(q.correct_steps && q.correct_steps.length) html += '<section class="pr-correct-prefix"><h4>已经做对的部分</h4>'+bullets(q.correct_steps)+'</section>';
    var issue = q.first_issue;
    if (q.review_status === 'teacher_conflict') html += '<p class="pr-warning">批改与 AI 判断有分歧，请先核对；暂不据此判定薄弱。</p>';
    if (issue && issue.certainty === 'confirmed') html += '<div class="pr-first-issue"><h4>问题出在这里 · ' + esc(issue.location) + '</h4>' + prose(issue.explanation) + '<h4>这一步这样改</h4>' + prose(issue.correction) + fold('对照你的作答', '<p class="pr-evidence">' + esc(issue.observed) + '</p>') + '</div>';
    else if (q.loss_reason) html += '<h4>这道题的问题</h4>' + prose(q.loss_reason) + (q.evidence ? fold('对照你的作答', '<p class="pr-evidence">' + esc(q.evidence) + '</p>') : '');
    html += causeSections(q, correction);
    if (q.suggestion && (!issue || q.suggestion !== issue.correction)) html += '<h4>接着怎么做</h4>' + prose(q.suggestion);
    if (q.transfer_rule) html += fold('下次遇到类似题', prose(q.transfer_rule));
    if (q.practice) html += fold('练一道，看看会不会了', prose(q.practice) + '<div class="pr-success"><b>检查一下：</b>' + prose(q.success_check) + '</div>' + (q.practice_answer ? fold('做完再看答案', prose(q.practice_answer)) : ''), 'pr-practice');
    if (q.reference) html += fold(q.reference_source === 'provided' ? '参考答案与解题步骤' : '完整讲解 · AI 解析', prose(q.reference), 'pr-solution');
    html += difficultySections(q);
    if (q.uncertainties && q.uncertainties.length) html += '<details class="pr-open-questions"><summary>本题补充信息</summary>' + bullets(q.uncertainties) + '</details>';
    return html;
  }
  function formContext(ctx, subject) {
    var card = Array.from(ctx.modal.querySelectorAll('.exam-subject-card-v10')).find(function (c) { return c.querySelector('.exam-subject-name-v10').value.trim() === subject; });
    function val(selector, node) { var el = (node || ctx.modal).querySelector(selector); return el ? number(el.value) : null; }
    return { score: val('.actual-v16', card), max: val('.max-v16', card), raw_score: val('.raw-v16', card), raw_max: val('.rawmax-v16', card), target: val('.target-v16', card), year_rank: val('.year-rank-v16', card), year_count: val('.year-participants-v16', card) || val('#totalParticipantsV16'), class_rank: val('.class-rank-v16', card), class_count: val('.class-participants-v16', card) || val('#totalClassParticipantsV16'), total_year_rank: val('#totalRankV16'), total_year_count: val('#totalParticipantsV16'), total_class_rank: val('#totalClassRankV16'), total_class_count: val('#totalClassParticipantsV16') };
  }
  function show(ctx, subject, trigger) {
    if (!current(ctx) || !(ctx.host || ctx.modal).isConnected) return toast('请重新打开考试');
    if (ctx.dialog) return;
    if (!ctx.draftId) ctx.draftId = draftFor(ctx.user, ctx.examId);
    var session = ctx.sessions[subject] || (ctx.sessions[subject] = { pages: [], workOnPaper: true, consent: false, pending: null });
    var dialog = document.createElement(ctx.host ? 'section' : 'dialog'); dialog.className = ctx.host ? 'pr-dialog pr-inline' : 'pr-dialog'; dialog.setAttribute('aria-labelledby', 'pr-title');
    var busy = false, dirty = false, closed = false, timer, selected = null, reviews = [], quota = null, view = 'upload', initialSection = ctx.initialSection;
    var cacheScope = ctx.draftId + '|' + subject, cacheQueue = Promise.resolve(), restoredUploads = false;
    ctx.dialog = dialog;
    dialog.innerHTML = '<header class="pr-head"><div><span class="pr-eyebrow">' + esc(subject) + ' · BETA</span><h2 id="pr-title">AI 试卷分析</h2></div>' + button(esc(ctx.closeLabel || (ctx.host ? '返回全部分析' : '返回考试')), 'close') + '</header><div class="pr-content"><div class="pr-message" role="status" aria-live="polite"></div><div class="pr-tabs">' + button('上传资料', 'upload', 'is-active') + button('分析记录', 'history') + '</div><div class="pr-main"></div></div>';
    (ctx.host || document.body).appendChild(dialog);
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    var main = dialog.querySelector('.pr-main'), message = dialog.querySelector('.pr-message');
    function note(text, error) { message.textContent = text || ''; message.classList.toggle('is-error', !!error); }
    function alive() { return !closed && current(ctx) && (ctx.host ? ctx.host.isConnected && (ctx.isActive ? ctx.isActive() : state.page === 'stats' && state.analysisTab === 'ai') : ctx.modal.isConnected && state.modal === ctx.modal); }
    function close(force) {
      if (!force && dirty && !confirm('核对修改尚未保存，确定返回考试吗？')) return;
      closed = true; clearTimeout(timer); cleanup.disconnect(); ctx.dialog = null;
      if (dialog.close) dialog.close(); dialog.remove(); if (ctx.host && ctx.onClose && !force) ctx.onClose(); else if (trigger && trigger.isConnected) trigger.focus();
    }
    var cleanup = new MutationObserver(function () { if (!(ctx.host || ctx.modal).isConnected || (!ctx.host && state.modal !== ctx.modal) || !current(ctx)) close(true); });
    ctx.canLeave = function () { return !dirty || confirm('核对修改尚未保存，确定离开吗？'); };
    ctx.dispose = function () { close(true); };
    cleanup.observe(document.body, { childList: true, subtree: true });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(false); });
    function tab(next) {
      if (dirty && !confirm('核对修改尚未保存，确定切换吗？')) return false;
      // Keep the live status node when the upload contents are replaced.
      if (main.contains(message)) main.before(message);
      dirty = false; view = next; if (ctx.onView) ctx.onView(next);
      dialog.querySelectorAll('.pr-tabs button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.pr === next); });
      return true;
    }
    function snapshot() {
      var payload = session.payload && Object.assign({}, session.payload); if (payload) delete payload.pages;
      return { scope: cacheScope, pages: session.pages, workOnPaper: session.workOnPaper, workLocation: session.workLocation, consent: session.consent, pending: session.pending, payload: payload, retrySubmission: !!session.retrySubmission, cloudDraftId: session.cloudDraftId, cloudReady: session.cloudReady };
    }
    async function saveCloud(id) {
      if (ctx.options && ctx.options.config_version===2) ctx.options.work_location=session.workLocation || (session.workOnPaper?'paper':session.pages.some(function(p){return p.role==='work';})?'separate':'none');
      await api(ctx, 'save_materials', { request_id: id, draft_id: ctx.draftId, exam_id: ctx.examId || null, subject: subject, title: ctx.title || '', options: ctx.options, page_count: session.pages.length, consent: true });
      session.cloudDraftId = id;
      for (var pi = 0; pi < session.pages.length; pi++) {
        note('正在保存扫描件 ' + (pi + 1) + ' / ' + session.pages.length);
        try { await api(ctx, 'upload_page', { request_id: id, page: pi + 1, role: session.pages[pi].role, url: session.pages[pi].url }); }
        catch (e) { e.message = '第 ' + (pi + 1) + ' 张扫描件保存失败：' + e.message; throw e; }
      }
      session.cloudReady = true; session.cloudDraftId = id;
    }
    function persist() {
      var id = session.pending || session.cacheId || cacheScope, value = snapshot(); session.cacheId = id;
      cacheQueue = cacheQueue.then(function () { return support.uploads('put', ctx.user, id, value); });
      return cacheQueue;
    }
    function fill(saved) {
      if (!saved || saved.scope !== cacheScope || !Array.isArray(saved.pages)) return false;
      session.pages = saved.pages; session.workOnPaper = saved.workOnPaper; session.workLocation = saved.workLocation; session.consent = saved.consent;
      session.cloudDraftId = saved.cloudDraftId; session.cloudReady = saved.cloudReady;
      session.pending = saved.pending; session.cacheId = saved.id; session.retrySubmission = saved.retrySubmission;
      session.payload = saved.payload && Object.assign({}, saved.payload, { pages: saved.pages.map(function (p) { return { role: p.role, url: p.url, regions: p.regions || [] }; }) });
      restoredUploads = true; return true;
    }
    async function resume() {
      var r = selected;
      if (!r) return;
      var matching = session.pending === r.request_id || session.cacheId === r.request_id;
      if ((!matching || !session.pages.length) && r.recovery && r.recovery.mode !== 'saved') {
        fill(await support.uploads('get', ctx.user, r.request_id)); matching = session.pending === r.request_id || session.cacheId === r.request_id;
      }
      if ((!matching || !session.pages.length) && r.recovery && r.recovery.mode === 'images') {
        session.resumeTarget = r.request_id; session.pending = r.request_id; session.cacheId = r.request_id; session.payload = null; if (!matching) session.pages = []; upload(); note('已恢复分析记录，请补充尚未保存到本机的原图。'); return;
      }
      var data = await api(ctx, 'resume', { request_id: r.request_id,
        mode: ctx.host ? 'saved' : matching && session.pages.length ? 'images' : 'saved',
        pages: !ctx.host && matching ? session.pages.map(function (p) { return { role: p.role, url: p.url, regions: p.regions || [] }; }) : [],
        work_on_paper: session.workOnPaper, consent: session.consent });
      session.pending = r.request_id; session.resumeTarget = null;
      if (session.pages.length) await persist();
      await load(data.request_id || r.request_id);
    }
    function upload() {
      if (!tab('upload')) return;
      var quotaText = quota ? (quota.enabled ? '今日还可开始 ' + quota.remaining + ' / ' + quota.limit + ' 次分析' : '试卷分析暂未开放') : '正在读取试用额度…';
      var location = session.workLocation || (session.workOnPaper ? 'paper' : session.pages.some(function(p){return p.role==='work';}) ? 'separate' : 'none');
      main.innerHTML = (restoredUploads ? '<p class="pr-message">已自动回填上次的图片、顺序和设置。</p>' : '') + '<section class="pr-intro"><h3>添加试卷与作答</h3><p>按页序添加清晰图片，试卷、答题卡与参考答案合计最多 15 张。</p><div class="pr-quota">' + esc(quotaText) + '</div></section><fieldset class="pr-work-location"><legend>你的作答在哪里？</legend>' + [['paper','写在试卷上','上传带作答的试卷即可。'],['separate','在答题卡上','分别添加试卷和答题卡。'],['none','暂时没有作答','分析题目要求与难度，暂不判断个人表现。']].map(function(x){return '<label><input type="radio" name="pr_location" value="'+x[0]+'" '+(location===x[0]?'checked':'')+'><span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></span></label>';}).join('') + '</fieldset>' +
        Object.keys(roleNames).map(function (role) {
          var pages = session.pages.filter(function (p) { return p.role === role; });
          return '<section class="pr-upload-group" data-upload-role="' + role + '" ' + (role==='work' && location!=='separate' && !pages.length ? 'hidden' : '') + '><div class="pr-section-head"><h3>' + roleNames[role] + '<small>' + (role === 'paper' ? '必选' : '补充资料') + '</small></h3><label class="pr-button pr-file-label">＋ 添加图片<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-role="' + role + '" ' + (busy ? 'disabled' : '') + '></label></div><p>' + ({ paper: '按题目顺序上传，作答写在试卷上也可以。', work: '作答在单独的答题卡上时，请补充上传。', reference: '补充参考答案或评分细则，可以更准确地核对答案和得分步骤。' })[role] + '</p><div class="pr-pages">' + pages.map(function (p) {
            var i = session.pages.indexOf(p);
            return '<article class="pr-page"><img src="' + p.url + '" alt="' + esc(roleNames[role] + '第' + (pages.indexOf(p) + 1) + '页') + '"><div class="pr-page-info">第 ' + (i + 1) + ' 页 · ' + esc(p.name) + '</div><div class="pr-page-actions">' + button('前移', 'up:' + i) + button('旋转', 'rotate:' + i) + button('移除', 'remove:' + i) + '</div></article>';
          }).join('') + '</div></section>';
        }).join('') + '<label class="pr-check" hidden><input type="checkbox" id="pr-work" ' + (session.workOnPaper ? 'checked' : '') + '>试卷图片中包含我的作答 / 老师批改</label>' +
        '<details class="pr-help"><summary>上传与分析说明</summary><p>支持 JPG、PNG、WebP，共 1～' + MAX_PAGES + ' 张，每张原图不超过 10MB。拍清题号、文字、步骤和批改痕迹，裁掉姓名、考号等信息。PDF 请先转成图片。</p><p>看不清会标为待核对；AI 估分与老师批改分分开显示，不会自动填入考试成绩。无作答时仅整理题目。编辑中的图片会暂存在当前设备7天。提交后扫描件和录入内容保存到当前账号，可跨设备查看和恢复；删除报告会同时删除扫描件。</p><p>试用次数独立于成绩识图。开始分析后计次，失败也计次；重复提交同一请求、查看和手动核对不重复计次。北京时间每天 0 点重置。</p></details>' +
        '<label class="pr-check pr-consent"><input type="checkbox" id="pr-consent" ' + (session.consent ? 'checked' : '') + '>同意将这些图片及本次分数、排名等考试数值发送给第三方 AI 服务分析，并在账号内保存扫描件与报告</label><div class="pr-footer"><span>' + session.pages.length + ' / ' + MAX_PAGES + ' 张</span>' + button(session.resumeTarget ? '恢复这份分析' : session.pending ? (session.retrySubmission ? '继续确认本次分析' : '查看进行中的分析') : busy ? '处理图片中…' : '开始分析', session.resumeTarget ? 'resume' : 'start', 'pr-primary') + '</div>';
      main.querySelectorAll('input[type=file]').forEach(function (input) { input.onchange = async function () {
        var files = Array.from(input.files || []); if (!files.length || busy) return;
        if (files.length + session.pages.length > MAX_PAGES) return note('每次最多 ' + MAX_PAGES + ' 张，请先移除多余图片', true);
        busy = true; note('正在处理图片…'); upload();
        try {
          var added = [];
          for (var file of files) { var p = await prepare(file); p.role = input.dataset.role; added.push(p); }
          var all = session.pages.concat(added);
          if (all.reduce(function (n, p) { return n + p.url.length + (p.regions || []).reduce(function (sum, url) { return sum + url.length; }, 0); }, 0) > 12000000) throw new Error('图片总大小较大，请减少页数');
          session.pages = all; session.cloudReady = false; restoredUploads = false; var saved = await persist(); note(saved ? '图片已保存，可检查方向和页序' : '图片已添加，请保持页面打开直到题目和作答读取完成。');
        } catch (e) { note(e.message, true); } finally { busy = false; if (alive()) upload(); }
      }; });
      if (ctx.onUpload) ctx.onUpload(main);
      main.querySelector('.pr-footer').prepend(message);
      message.classList.add('pr-action-message');
      main.querySelectorAll('[name=pr_location]').forEach(function(el){el.onchange=function(){
        if(el.value==='none' && session.pages.some(function(p){return p.role==='work';})){el.checked=false;main.querySelector('[name=pr_location][value="'+location+'"]').checked=true;return note('已添加答题卡，请先移除作答图片再选择“暂时没有作答”',true);}
        session.workLocation=el.value;session.workOnPaper=el.value==='paper';session.cloudReady=false;persist();upload();
      };});
      main.querySelector('#pr-work').onchange = function (e) { session.workOnPaper = e.target.checked; persist(); };
      main.querySelector('#pr-consent').onchange = function (e) { session.consent = e.target.checked; persist(); };
      main.querySelector('[data-pr=start],[data-pr=resume]').disabled = busy || (!session.resumeTarget && (!session.pending && (!quota || !quota.enabled || quota.remaining <= 0 || !quota.global_available)));
      main.querySelectorAll('.pr-page-actions button').forEach(function (b) { b.disabled = busy; });
      if (ctx.host && !session.pending) {
        var footer = main.querySelector('.pr-footer'), draftButton = document.createElement('button');
        draftButton.type = 'button'; draftButton.className = 'pr-button'; draftButton.textContent = '保存资料草稿'; draftButton.disabled = busy;
        footer.insertBefore(draftButton, footer.lastElementChild);
        draftButton.onclick = async function () {
          if (!session.pages.some(function (p) { return p.role === 'paper'; })) return note('请先添加试卷图片', true);
          if (!session.consent) return note('请先确认扫描件保存说明', true);
          busy = true; draftButton.disabled = true;
          try { if (ctx.beforeSubmit) subject = await ctx.beforeSubmit(); await saveCloud(session.cloudDraftId || crypto.randomUUID()); await persist(); note('草稿已保存到账号，可从全部分析中继续录入'); }
          catch (e) { note(e.message, true); } finally { busy = false; if (draftButton.isConnected) draftButton.disabled = false; }
        };
      }
    }
    function history() {
      if (!tab('history')) return;
      main.innerHTML = '<h3>本科目的分析记录</h3><p class="pr-muted">显示本次考试的报告，以及本科目尚未关联考试的报告。试卷原图请留在自己的设备中。</p>' +
        (reviews.length ? reviews.map(function (r) { return '<button type="button" class="pr-history" data-pr="report:' + r.request_id + '"><span>' + esc(new Date(r.created_at).toLocaleString('zh-CN')) + '<small class="pr-muted"> · ' + (r.exam_id ? '本次考试' : '未关联考试') + '</small></span><b>' + ({ running: '分析中', succeeded: '查看报告', failed: '未完成' })[r.status] + ' →</b></button>'; }).join('') : '<div class="pr-empty">还没有报告，上传这次考试的试卷试试。</div>');
    }
    async function refresh() {
      var responses = await Promise.allSettled([api(ctx, 'quota'), ctx.setup ? Promise.resolve({reviews:[]}) : api(ctx, 'list', { draft_id: ctx.draftId, exam_id: ctx.examId || null, subject: subject })]);
      if (!alive()) return;
      if (responses[0].status === 'fulfilled') quota = responses[0].value.quota;
      if (responses[1].status === 'fulfilled') reviews = responses[1].value.reviews || [];
      var failure = responses.find(function (r) { return r.status === 'rejected'; });
      if (failure) note(failure.reason.message, true);
      if (view === 'upload') upload(); else if (view === 'history') history();
      if (trigger && reviews.some(function (r) { return r.status === 'succeeded'; })) trigger.textContent = '查看试卷分析';
    }
    function renderReport(r) {
      if (!alive()) return;
      if (main.contains(message)) main.before(message);
      message.classList.remove('pr-action-message');
      selected = r; view = 'report'; dirty = false; if (ctx.onView) ctx.onView('report');
      if (r.status === 'paused') { main.innerHTML = '<section class="pr-recovery"><h3>' + esc(r.progress && r.progress.message || '进度已保存') + '</h3><p>本轮已完成的内容已保存。核对资料后，可以继续剩余分析。</p>' + button('继续分析', 'resume', 'pr-primary') + button('删除记录', 'delete', 'pr-danger') + '</section>'; if (window.ScorePaperScans) window.ScorePaperScans.decorate(main, r, ctx, { api: api, load: load, note: note }); return; }
      if (r.status === 'running' && !r.result) {
        main.innerHTML = runningReport(r) + button(r.pause_requested ? '完成当前步骤后暂停' : '暂停并保存进度', 'pause');
        clearTimeout(timer); timer = setTimeout(function () { load(r.request_id); }, 3000); return;
      }
      if (r.status === 'succeeded' && session.pending === r.request_id) { session.pending = null; session.payload = null; session.retrySubmission = false; support.uploads('delete', ctx.user, r.request_id); support.uploads('delete', ctx.user, cacheScope); session.cacheId = null; }
      if (r.status === 'failed' && !r.result) {
        var p = r.progress || {}, recovery = r.recovery || { available: p.version >= 2 && (p.resume_remaining == null || p.resume_remaining > 0), completed: p.completed_questions || 0, total: p.total_questions || 0, questions: [] };
        var matching = session.pending === r.request_id || session.cacheId === r.request_id;
        main.innerHTML = '<section class="pr-recovery"><h3>分析已暂停，进度已保存</h3><p>已完成 <b>' + recovery.completed + ' / ' + recovery.total + '</b> 题分析。</p>' +
          (matching && session.pages.length ? '<p>已自动回填上次上传的 ' + session.pages.length + ' 张图片及设置。</p><div class="pr-recovered-pages">' + session.pages.map(function (p) { return '<img src="' + p.url + '" alt="' + esc(roleNames[p.role]) + '">'; }).join('') + '</div>' : recovery.mode === 'saved' ? '<p>已恢复保存的题目、作答和批改分，可直接继续。</p>' : '') +
          (recovery.available ? button('恢复分析', 'resume', 'pr-primary') + '<p class="pr-muted">接着完成剩余部分，不另计开始次数。</p>' : '<p>本次恢复次数已用完，已保存的资料仍可查看。</p>') +
          (recovery.questions.length ? '<details class="pr-recovered-work"><summary>查看已恢复的题目和作答</summary>' + recovery.questions.map(function (q) { return '<article><h4>第 ' + esc(q.label) + ' 题</h4><p class="pr-text">' + esc(q.stem) + '</p><p class="pr-text">作答：' + esc(q.answer || '未作答') + '</p></article>'; }).join('') + '</details>' : '') +
          '<details><summary>查看中断详情</summary><p>' + esc(r.error_message) + '</p></details></section>' + button('返回记录', 'history') + button('删除记录', 'delete', 'pr-danger');
        support.renderMath(main); return;
      }

      var report = r.result, stats = summary(r);
      var updating = r.status === 'running', stale = report.analysis_stale;
      var updateNotice = updating ? '<aside class="pr-message" role="status"><b>' + esc(r.progress && r.progress.message || '正在更新分析') + '</b><p>下方保留上一版报告。更新完成后，将替换相关题目和整体建议。</p></aside>' : stale ? '<aside class="pr-message"><b>核对内容已保存，下面的分析仍为上一版。</b>' + (r.status === 'failed' ? '<p>' + esc(r.error_message) + '</p>' + ((r.progress && r.progress.resume_remaining || 0) > 0 ? button('继续更新分析', 'resume') : '') : '') + '</aside>' : '';
      main.innerHTML = updateNotice + '<section class="pr-result-top"><span class="pr-eyebrow">' + esc(subject) + ' · ' + report.questions.length + ' 题</span><h3>' + (report.record_only ? '题目与作答录入' : '试卷复盘') + '</h3>' +
        '<nav class="pr-report-nav" aria-label="报告目录">' + (report.record_only ? '' : button('整体分析', 'jump:highlights') + button('难度与得分', 'jump:performance') + button('优势与问题', 'jump:insights')) + button(report.record_only ? '题目与作答' : '逐题复盘', 'jump:questions') + (report.record_only ? '' : button('复习安排','jump:plan')) + button('资料与说明', 'jump:materials') + '</nav></section>' +
        (report.record_only && ctx.onAnalyzeRecord ? '<div class="pr-first-action"><p>资料已录入。可以使用已保存的扫描件新建学习分析，开始后按一次新分析计次。</p>'+button('继续生成学习分析','analyze-record','pr-primary')+'</div>' : '') + reportSections(report) + '<section class="pr-reading-section" data-report-section="questions" tabindex="-1"><div class="pr-chapter"><span>' + (report.record_only ? '01' : '04') + '</span><div><h3>' + (report.record_only ? '题目与作答' : '逐题复盘') + '</h3><p>' + (report.record_only ? '对照扫描件，核对识别的内容。' : '先看哪里需要改，再按需展开讲解和练习。') + '</p></div></div>' + (report.record_only ? '' : '<div class="pr-question-filters" aria-label="筛选题目">' + ['all','review','confirm'].map(function (f, i) { return '<button type="button" class="pr-button" data-pr="filter:' + f + '" aria-pressed="' + (i === 0) + '">' + ['全部题目','需要订正','需要核对'][i] + '</button>'; }).join('') + '</div>') + '<p class="pr-filter-empty pr-muted" role="status" hidden>没有符合这项筛选的题目，可以切回全部题目。</p><div class="pr-questions">' + report.questions.map(function (q) {
          var c = (r.corrections || []).find(function (c) { return c.id === q.id; }) || { answer: q.answer, teacher_score: q.teacher_score, max_score: q.max_score };
          var confirmQuestion = q.score_verification === 'conflict' || q.review_status === 'teacher_conflict' || q.analysis_mode === 'needs_confirmation';
          var reviewQuestion = !confirmQuestion && (q.teacher_score != null && q.max_score != null && q.teacher_score < q.max_score || q.first_issue && q.first_issue.certainty === 'confirmed');
          return '<details class="pr-question" data-question="' + esc(q.id) + '" data-needs-review="' + !!reviewQuestion + '" data-needs-confirm="' + !!confirmQuestion + '"><summary><span>第 ' + esc(q.label) + ' 题 <small>' + esc(q.knowledge.join(' · ')) + '</small>' + (q.first_issue && q.first_issue.location && q.first_issue.certainty === 'confirmed' ? '<small class="pr-issue-preview">需要留意：' + esc(q.first_issue.location) + '</small>' : '') + '</span><span class="pr-badge">' + (confirmQuestion ? '需要核对' : q.teacher_score != null && q.max_score != null ? q.teacher_score + ' / ' + q.max_score + ' 分' : '展开查看') + '</span><span class="pr-chevron" aria-hidden="true">⌄</span></summary><div class="pr-question-body">' + questionSections(q, c) + '<details class="pr-fold pr-source" ' + (report.record_only ? 'open' : '') + '><summary>原题、作答与扫描件</summary><div class="pr-fold-body"><div data-scan-host></div><h4>题目</h4><p class="pr-text">' + esc(c.stem || q.stem) + '</p><h4>你的作答</h4><p class="pr-text">' + esc(c.answer || '未填写作答') + '</p><details class="pr-fold pr-edit"><summary>识别有误？修改文字或分数</summary><div class="pr-fold-body"><p class="pr-muted">题目页：' + (q.pages.join('、') || '—') + (q.work_pages && q.work_pages.length ? ' · 作答页：' + q.work_pages.join('、') : '') + '</p><label>题目（可修正识别内容）<textarea data-field="stem" rows="3" maxlength="4500">' + esc(c.stem || q.stem) + '</textarea></label><label>考试时的作答（可修正识别内容）<textarea data-field="answer" rows="3" maxlength="4000">' + esc(c.answer) + '</textarea></label>' +
            '<div class="pr-score-fields"><label>老师批改得分<input data-field="teacher_score" type="number" min="0" max="9999" step="0.01" placeholder="未识别 / 未批改" value="' + esc(c.teacher_score) + '"></label><label>本题满分<input data-field="max_score" type="number" min="0" max="9999" step="0.01" placeholder="填写满分" value="' + esc(c.max_score) + '"></label></div><p class="pr-muted">批改依据：' + esc(q.score_evidence || '有批改分可在上方补充，留空表示未批改或未录入。') + '</p>' +
            (q.estimated_score !== null ? '<p class="pr-estimate">AI 估分：' + q.estimated_score + (q.max_score !== null ? ' / ' + q.max_score : '') + '，仅供参考</p>' + (q.estimate_evidence && q.estimate_evidence.quote ? '<p class="pr-evidence">评分细则依据：' + esc(q.estimate_evidence.quote) + '</p>' : '') : '') +
            '</div></details></div></details><div class="pr-checks"><label class="pr-check"><input type="checkbox" data-field="verified" ' + (c.verified ? 'checked' : '') + '>已对照原卷核对</label><label class="pr-check"><input type="checkbox" data-field="corrected" ' + (c.corrected ? 'checked' : '') + '>已完成订正</label></div></div></details>';
        }).join('') + '</div><div class="pr-footer"><span class="pr-muted" data-pr-save-status>核对修改不会改变考试分数</span>' + button(report.record_only || (report.update_count || 0) >= 5 ? '保存核对记录' : '保存并更新分析', 'save', 'pr-primary') + '</div></section>' + reportPlan(report) + '<section class="pr-reading-section" data-report-section="materials" tabindex="-1"><div class="pr-chapter"><span>' + (report.record_only ? '02' : '06') + '</span><div><h3>资料与说明</h3><p>查看原始扫描件、核对记录和本次分析使用的信息。</p></div></div><div class="pr-materials"></div>' + fold('考试信息与分析依据', reportDetails(report), 'pr-report-meta') + fold('识别与核对记录', '<p class="pr-text">' + esc(report.coverage) + '</p><div class="pr-stats"><div><b>' + report.questions.length + '</b><span>识别题目</span></div><div><b data-pr-verified>' + stats.verified + '</b><span>已核对</span></div><div><b data-pr-score>' + (stats.scored ? stats.score + ' / ' + stats.max : '—') + '</b><span>已核对题目得分</span></div></div><p class="pr-muted">这里只汇总已核对题目的批改分，不代表整卷成绩，也不包含 AI 估分。</p><section class="pr-evaluation"><h4>已核对题目的失分</h4><div data-pr-losses></div></section>') +
        ((report.warnings || []).length || !report.complete ? fold('需要补充或核对的资料', (!report.complete ? '<p>尚未覆盖的题目或作答可以继续补充。</p>' : '') + bullets(report.warnings), 'pr-open-questions') : '') + '</section><div class="pr-footer">' + button('返回记录', 'history') + button('删除这份报告', 'delete', 'pr-danger') + '</div>';
      losses(stats); support.renderMath(main); if (window.ScorePaperScans) window.ScorePaperScans.decorate(main, r, ctx, { api: api, load: load, note: note });
      if (updating) { main.querySelectorAll('input,textarea,select,[data-pr=save],[data-pr=delete]').forEach(function (el) { el.disabled = true; }); clearTimeout(timer); timer = setTimeout(function () { load(r.request_id); }, 3000); }
      if ((report.update_count || 0) >= 5) main.querySelector('[data-pr-save-status]').textContent = '5次分析更新已用完，可继续保存核对和订正记录';
      main.querySelectorAll('.pr-question input,.pr-question textarea,.pr-question select').forEach(function (el) { el.addEventListener('input', function () { dirty = true; if (el.dataset.field === 'cause') { var detail = el.closest('[data-question]'), q = report.questions.find(function (q) { return q.id === detail.dataset.question; }); detail.querySelector('.pr-reflection-route').textContent = reflectionRoute(q, el.value); } main.querySelector('[data-pr-save-status]').textContent = '有未保存的核对修改'; }); });
    }
    function losses(stats) {
      main.querySelector('[data-pr-losses]').innerHTML = stats.losses.length ? stats.losses.map(function (q) { return '<div class="pr-loss"><span>第 ' + esc(q.label) + ' 题</span><b>失 ' + Math.round(q.loss * 100) / 100 + ' 分</b></div>'; }).join('') : '<p class="pr-muted">' + (stats.scored ? '已核对的小题暂无失分。' : '核对小题得分后，在这里查看失分分布。') + '</p>';
    }
    async function load(id) {
      clearTimeout(timer);
      try {
        var results = await Promise.all([api(ctx, 'get', { request_id: id }), support.uploads('get', ctx.user, id)]);
        if (alive()) {
          if (ctx.expectedExamId && results[0].review.exam_id !== ctx.expectedExamId) throw new Error('这份试卷已移出当前考试，请返回后刷新');
          if (results[1]) fill(results[1]); note(''); renderReport(results[0].review);
          if (initialSection) {
            var section = Array.from(main.querySelectorAll('[data-report-section]')).find(function (s) { return s.dataset.reportSection === initialSection; });
            if (section) { initialSection = null; section.focus({ preventScroll: true }); if (section.scrollIntoView) section.scrollIntoView({ block: 'start' }); }
          }
        }
      }
      catch (e) { if (alive()) { note(e.message + (ctx.host ? '；可返回后重新打开。' : '；可点击“分析记录”重新查看。'), true); if (view === 'report' && selected && selected.status === 'running') timer = setTimeout(function () { load(id); }, 8000); } }
    }
    async function start() {
      if (session.pending && !session.retrySubmission) { view = 'report'; return load(session.pending); }
      if (ctx.beforeSubmit && !session.pending) { busy=true;try { subject = await ctx.beforeSubmit(); } catch(e) { return note(e.message,true); } finally {busy=false;} }
      if (!session.pages.some(function (p) { return p.role === 'paper'; })) return note('请先上传试卷题目', true);
      if (!session.consent) return note('请先确认图片分析与报告保存说明', true);
      var id = session.pending || session.cloudDraftId || crypto.randomUUID(), submitted = false; session.pending = id; busy = true; upload(); note('正在提交，提交成功后将开始分析…');
      try {
        var savedSubject = ctx.exam && ctx.exam.scores && ctx.exam.scores[subject];
        session.payload = session.payload || { request_id: id, draft_id: ctx.draftId, exam_id: savedSubject ? ctx.examId : null,
          subject: subject, title: ctx.title || '', options: ctx.options, exam_context: ctx.host ? ctx.examContext : formContext(ctx, subject), pages: session.pages.map(function (p) { return { role: p.role, url: p.url, regions: p.regions || [] }; }), work_on_paper: session.workOnPaper, consent: true };
        if (!await persist()) note('本机暂时无法保存图片；完成识别后仍可从保存的作答恢复。');
        await support.uploads('delete', ctx.user, cacheScope);
        if (ctx.host && (!session.cloudReady || ctx.setup)) {
          await saveCloud(id);
        }
        submitted = true;
        var data = await api(ctx, 'start', ctx.host ? Object.assign({}, session.payload, { pages: undefined, use_saved: true }) : session.payload);
        session.retrySubmission = false; quota = data.quota; if (alive()) { view = 'report'; await load(id); }
      } catch (e) {
        if (!submitted) {
          session.pending = null; session.payload = null; session.retrySubmission = false;
          await persist();
          if (alive()) { note(e.message + '；已保存的资料会保留，点击“开始分析”可重试。', true); upload(); }
          return;
        }
        // A timeout may occur after reservation; check the same ID before offering a new request.
        try { var existing = await api(ctx, 'get', { request_id: id }); session.retrySubmission = false; if (alive()) renderReport(existing.review); }
        catch (_) {
          if (e.status && e.status < 500) { session.pending = null; session.payload = null; session.retrySubmission = false; }
          else session.retrySubmission = true;
          if (alive()) { note(e.message + (session.retrySubmission ? '；再次点击会确认同一请求，不会重复计次。' : ''), true); upload(); }
        }
      } finally { busy = false; if (alive() && view === 'upload') upload(); }
    }
    async function save() {
      var corrections = [];
      for (var detail of main.querySelectorAll('[data-question]')) {
        var get = function (name) { return detail.querySelector('[data-field=' + name + ']'); };
        for (var field of ['teacher_score', 'max_score']) { if (!get(field).validity.valid) { detail.open = true; get(field).focus(); throw new Error('分数请输入 0～9999，最多两位小数'); } }
        var score = number(get('teacher_score').value), max = number(get('max_score').value);
        if (score !== null && max !== null && score > max) { detail.open = true; get('teacher_score').focus(); throw new Error('得分不能高于本小题满分'); }
        corrections.push({ id: detail.dataset.question, stem: get('stem').value, answer: get('answer').value, teacher_score: score, max_score: max, verified: get('verified').checked, corrected: get('corrected').checked, reflection: get('cause') ? { cause: get('cause').value, note: get('reflection_note').value } : null });
      }
      var result = await api(ctx, 'correct', { request_id: selected.request_id, revision: selected.revision, corrections: corrections, reanalyze: !selected.result.record_only && (selected.result.update_count || 0) < 5 });
      if (alive()) { renderReport(result.review); note(result.review.status === 'running' ? '已保存，正在更新相关题目和整体建议' : '核对已保存'); }
    }
    dialog.addEventListener('click', async function (e) {
      var target = e.target.closest('[data-pr]'); if (!target) return;
      var action = target.dataset.pr;
      if (action === 'close') return close(false);
      if (busy && action !== 'history' && action !== 'upload') return;
      try {
        if (action === 'analyze-record' && ctx.onAnalyzeRecord) await ctx.onAnalyzeRecord(selected);
        else if (action === 'upload') upload();
        else if (action === 'history' && ctx.host) { close(false); }
        else if (action === 'history') { if (tab('history')) { history(); await refresh(); } }
        else if (action === 'start') await start();
        else if (action === 'pause') { await api(ctx, 'pause', { request_id: selected.request_id }); await load(selected.request_id); }
        else if (action === 'resume') { target.disabled = true; await resume(); }
        else if (action.startsWith('report:')) { if (tab('report')) await load(action.slice(7)); }
        else if (action === 'save') { target.disabled = true; await save(); }
        else if (action.startsWith('filter:')) {
          var filter = action.slice(7), visible = 0;
          main.querySelectorAll('.pr-question[data-question]').forEach(function (q) { q.hidden = filter === 'review' ? q.dataset.needsReview !== 'true' : filter === 'confirm' ? q.dataset.needsConfirm !== 'true' : false; if (!q.hidden) visible++; });
          main.querySelectorAll('[data-pr^="filter:"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pr === action ? 'true' : 'false'); });
          main.querySelector('.pr-filter-empty').hidden = visible > 0;
        }
        else if (action.startsWith('jump:')) { var section = main.querySelector('[data-report-section="' + action.slice(5) + '"]'); if (section) { section.focus({ preventScroll: true }); if (section.scrollIntoView) section.scrollIntoView({ block: 'start' }); } }
        else if (action.startsWith('focus:')) { var detail = Array.from(main.querySelectorAll('[data-question]')).find(function (q) { return q.dataset.question === action.slice(6); }); if (detail) { var all = main.querySelector('[data-pr="filter:all"]'); if (all) all.click(); detail.open = true; detail.querySelector('summary').focus({ preventScroll: true }); if (detail.scrollIntoView) detail.scrollIntoView({ block: 'start' }); } }
        else if (action === 'delete' && selected && confirm('删除这份分析报告及核对记录？考试成绩不受影响。')) {
          await api(ctx, 'delete', { request_id: selected.request_id }); await support.uploads('delete', ctx.user, selected.request_id); if (session.pending === selected.request_id || session.cacheId === selected.request_id) { session.pages = []; session.pending = null; session.payload = null; session.cacheId = null; } selected = null; dirty = false; note('报告已删除'); view = 'history'; if (ctx.host) close(false); else await refresh();
        } else if (action.startsWith('remove:')) { session.pages.splice(Number(action.split(':')[1]), 1); session.cloudReady = false; await persist(); upload(); }
        else if (action.startsWith('up:')) { var i = Number(action.split(':')[1]); if (i > 0) { var p = session.pages.splice(i, 1)[0]; session.pages.splice(i - 1, 0, p); session.cloudReady = false; await persist(); upload(); } }
        else if (action.startsWith('rotate:')) { busy = true; await rotate(session.pages[Number(action.split(':')[1])]); session.cloudReady = false; await persist(); busy = false; upload(); }
      } catch (error) { if (alive()) note(error.message, true); }
      finally { busy = false; if (target.isConnected) target.disabled = false; }
    });
    if (ctx.initialReport) { load(ctx.initialReport); return; }
    upload(); support.uploads('latest', ctx.user, cacheScope).then(function (saved) { if (alive() && !session.pages.length && !session.pending && !busy && fill(saved)) { if (session.pending) return load(session.pending).then(refresh); if (view === 'upload') upload(); } return refresh(); });
  }

  var beforeOpen = openExam;
  openExam = function (exam) {
    var result = beforeOpen.apply(this, arguments), modal = state.modal;
    if (!modal || !modal.querySelector('#examSubjectsV16') || modal._paperReview || !owner()) return result;
    var ctx = { modal: modal, exam: exam || null, examId: String(exam && exam.id || ''), user: owner(), token: state.token,
      draftId: drafts(owner())[String(exam && exam.id || '') || 'new'] || null, sessions: Object.create(null), dialog: null };
    modal._paperReview = ctx;
    function decorate() {
      modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
        if (card.querySelector('.pr-entry')) return;
        var entry = document.createElement('button'); entry.type = 'button'; entry.className = 'pr-entry'; entry.textContent = 'AI 试卷分析';
        entry.onclick = function () { var name = card.querySelector('.exam-subject-name-v10').value.trim(); if (name) { if (window.ScorePaperHub) { if (!ctx.draftId) ctx.draftId = draftFor(ctx.user, ctx.examId); window.ScorePaperHub.enter(ctx, name, formContext(ctx, name)); } else show(ctx, name, entry); } };
        card.appendChild(entry);
      });
    }
    decorate();
    var observer = new MutationObserver(function () { if (!modal.isConnected) { observer.disconnect(); return; } decorate(); });
    observer.observe(modal.querySelector('#examSubjectsV16'), { childList: true, subtree: true });
    observer.observe(document.body, { childList: true });
    modal.addEventListener('click', function (e) { if (e.target.closest('.draft-clear-v61')) putDraft(ctx.user, ctx.examId || 'new', null); }, true);
    return result;
  };
  var beforeSave = dataApiV7;
  dataApiV7 = async function (action, payload) {
    var ctx = state.modal && state.modal._paperReview;
    var relevant = action === 'save_exam' && ctx && ctx.draftId && payload && payload.exam && String(payload.exam.id || '') === ctx.examId;
    var result = await beforeSave.apply(this, arguments);
    if (relevant && result && result.id && current(ctx)) {
      putDraft(ctx.user, result.id, ctx.draftId);
      if (!ctx.examId) putDraft(ctx.user, 'new', null);
      try { await api(ctx, 'attach', { draft_id: ctx.draftId, exam_id: result.id }); }
      catch (_) { toast('考试已保存，试卷报告稍后打开该科目时会继续关联'); }
    }
    return result;
  };
  // Retry only the new feature's association. Never replay save_exam.
  var openWithEntry = openExam;
  openExam = function (exam) {
    var result = openWithEntry.apply(this, arguments), ctx = state.modal && state.modal._paperReview;
    if (ctx && ctx.examId && ctx.draftId) api(ctx, 'attach', { draft_id: ctx.draftId, exam_id: ctx.examId }).catch(function () {});
    return result;
  };
  window.ScorePaperReview = { summary: summary, mount: show, api: api, prepare: prepare, draftFor: draftFor };
  var style = document.createElement('style');
  style.textContent = `
    .pr-progress{padding:18px 0}.pr-milestones{list-style:none;padding:0;margin:22px 0}.pr-milestones li{display:flex;align-items:center;gap:10px;padding:11px 0;color:var(--muted)}.pr-milestones li>span{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;border:1px solid var(--line);flex:none}.pr-milestones small{margin-left:auto;font-size:11px}.pr-milestones .is-current{color:var(--accent);font-weight:700}.pr-milestones .is-current>span{background:var(--accent-soft)}.pr-milestones .is-done{color:var(--text)}.pr-wins{border-left:3px solid #43937a;padding:14px 16px}.pr-wins article+article{margin-top:15px}.pr-cause{border:1px solid var(--line);border-radius:12px;padding:12px;margin:16px 0}.pr-cause article{padding:10px 0}.pr-cause label{display:block;font-size:12px;margin-top:10px}.pr-cause select{display:block;width:100%;padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--panel-solid);color:var(--text);font:inherit}.pr-reflection-route{padding:10px;background:var(--accent-soft);border-radius:8px}.pr-dimensions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.pr-dimensions>span{border:1px solid var(--line);border-radius:9px;padding:8px;font-size:12px}.pr-dimensions small{display:block;color:var(--muted);font-size:11px}.pr-table-scroll{overflow:auto}.pr-difficulty-table{width:100%;border-collapse:collapse;font-size:12px}.pr-difficulty-table th,.pr-difficulty-table td{padding:8px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}.pr-difficulty-table th{white-space:nowrap}

    .pr-insight{padding:18px 0;border-bottom:1px solid var(--line);margin-bottom:12px}.pr-insight ul,.pr-question-body ul{padding-left:20px}.pr-insight li,.pr-question-body li{margin:7px 0}.pr-pattern,.pr-action{padding:13px 0}.pr-pattern+.pr-pattern,.pr-action+.pr-action{border-top:1px solid var(--line)}.pr-pattern h4 small{font-size:10px;font-weight:400;color:var(--muted)}.pr-action-plan{background:var(--accent-soft,#eef1ff);border:0;border-radius:15px;padding:18px;margin:16px 0 20px}.pr-success{padding:9px 12px;border-left:3px solid var(--accent,#5d72e8);background:var(--panel-solid,#fff);font-size:12px}.pr-link{padding:4px 9px;margin:4px 2px 0 0;font-size:11px}.pr-first-issue{border-left:3px solid #d99a57;padding-left:12px;margin:16px 0}.pr-issue-preview{display:block;color:var(--accent)!important;margin-top:4px}.pr-solution,.pr-practice,.pr-open-questions{padding:12px 0;border-bottom:1px solid var(--line)}.pr-solution summary,.pr-practice summary,.pr-open-questions summary{cursor:pointer;font-weight:600}.pr-original-note{margin:14px 0!important}.pr-loss-map{display:flex;flex-wrap:wrap;gap:7px}.pr-loss-map>span{border:1px solid var(--line);padding:6px 10px;border-radius:9px;font-size:12px}.pr-loss-map b{color:var(--danger,#b44436);margin-left:7px}.pr-question{scroll-margin-top:90px}.pr-text{overflow-wrap:anywhere}.pr-total{margin:10px 0!important}
    .pr-entry{display:inline-flex;align-items:center;margin-top:12px;padding:7px 11px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--accent,#5d72e8);font:inherit;font-size:12px;cursor:pointer}
    .pr-dialog{box-sizing:border-box;width:min(760px,calc(100% - 24px));max-height:92dvh;padding:0;border:1px solid var(--line,#e8ebf0);border-radius:22px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 24px 90px #0003;overflow:auto;font:14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .pr-dialog::backdrop{background:#101a3070;backdrop-filter:blur(4px)}.pr-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:18px 24px;background:var(--panel-solid,#fff);border-bottom:1px solid var(--line)}.pr-head h2{font-size:20px;margin:0}.pr-eyebrow{font-size:11px;font-weight:700;letter-spacing:1px;color:var(--accent,#5d72e8)}.pr-content{padding:0 24px 24px}.pr-message:empty{display:none}.pr-message{padding:10px 12px;margin:14px 0;background:var(--accent-soft,#eef1ff);border-radius:10px;font-size:12px}.pr-message.is-error{color:var(--danger,#b44436);background:#fef0ed}.pr-tabs{display:flex;gap:8px;margin:18px 0}.pr-tabs .is-active{background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);border-color:transparent}
    .pr-button{border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:8px 13px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}.pr-button:disabled{opacity:.5;cursor:wait}.pr-button:focus-visible,.pr-entry:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.pr-primary{background:var(--accent,#5d72e8);color:white;border-color:transparent;font-weight:700}.pr-danger{color:var(--danger,#b44436)}.pr-main h3{font-size:16px;margin:0 0 7px}.pr-main h4{font-size:13px;margin:15px 0 5px}.pr-main p{margin:6px 0}.pr-intro{padding:20px;background:var(--accent-soft,#eef1ff);border-radius:15px;margin-bottom:20px}.pr-intro p{font-size:13px;color:var(--muted,#788392)}.pr-quota{font-size:11px;margin-top:12px;color:var(--accent,#5d72e8)}.pr-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.pr-section-head h3{margin:0}.pr-section-head small{font-size:10px;font-weight:400;color:var(--muted);margin-left:8px}.pr-upload-group{padding:18px 0;border-bottom:1px solid var(--line)}.pr-upload-group>p{font-size:12px;color:var(--muted)}.pr-file-label{position:relative;overflow:hidden}.pr-file-label input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.pr-pages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.pr-page{border:1px solid var(--line);border-radius:12px;overflow:hidden;min-width:0}.pr-page img{width:100%;height:125px;object-fit:contain;background:#f4f5f7;display:block}.pr-page-info{padding:5px 8px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pr-page-actions{display:flex;gap:3px;padding:0 5px 6px}.pr-page-actions button{flex:1;padding:4px 2px;font-size:10px}.pr-check{display:flex;align-items:flex-start;gap:8px;margin:15px 0;font-size:12px}.pr-check input{margin-top:4px;flex:none;accent-color:var(--accent)}.pr-consent{color:var(--muted)}.pr-help{font-size:12px;padding:10px 0;color:var(--muted)}.pr-help summary{cursor:pointer;color:var(--text)}.pr-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0}.pr-footer>span{font-size:11px}.pr-muted{font-size:11px;color:var(--muted,#788392)}.pr-history{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;margin:8px 0;background:var(--panel-solid,#fff);border:1px solid var(--line);border-radius:12px;font:inherit;font-size:12px;color:var(--text);text-align:left;cursor:pointer}.pr-history b{color:var(--accent)}.pr-empty{text-align:center;padding:40px 12px}.pr-empty p{color:var(--muted);font-size:13px;margin:12px 0 20px}.pr-spinner{width:25px;height:25px;border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;margin:0 auto 20px;animation:pr-spin 1s linear infinite}@keyframes pr-spin{to{transform:rotate(360deg)}}
    .pr-result-top{padding:20px;border:1px solid var(--line);border-radius:15px;margin-bottom:16px}.pr-result-top>p{font-size:12px;color:var(--muted)}.pr-stats{display:grid;grid-template-columns:1fr 1fr 1.6fr;gap:12px;margin:20px 0}.pr-stats div{display:flex;flex-direction:column}.pr-stats b{font-size:23px;font-variant-numeric:tabular-nums}.pr-stats span{font-size:10px;color:var(--muted)}.pr-warning{background:#fff5df;color:#80602e;border-radius:12px;padding:10px 14px;font-size:12px;margin-bottom:20px}.pr-question{border:1px solid var(--line);border-radius:12px;margin:10px 0}.pr-question>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;cursor:pointer;font-weight:600;list-style:none}.pr-question summary small{display:block;font-size:10px;color:var(--muted);font-weight:400}.pr-badge{font-size:10px;color:var(--accent);white-space:nowrap}.pr-question-body{padding:0 15px 16px}.pr-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.pr-question-body>label,.pr-score-fields label{display:block;font-size:11px;color:var(--muted)}.pr-question textarea,.pr-question input[type=number]{box-sizing:border-box;width:100%;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--input-bg,#fff);color:var(--text);font:inherit;font-size:13px;margin-top:5px}.pr-question textarea{resize:vertical}.pr-score-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.pr-checks{display:flex;flex-wrap:wrap;gap:16px}.pr-evidence{border-left:3px solid var(--line);padding-left:10px;font-size:12px;color:var(--muted)}.pr-estimate{font-size:12px;color:#947124}.pr-evaluation{border-top:1px solid var(--line);padding-top:20px}.pr-evaluation h3{margin-top:18px}.pr-evaluation li{font-size:13px;margin:8px 0}.pr-loss{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}.pr-loss b{color:var(--danger,#b44436)}
    .pr-main .pr-wins{border:1px solid var(--line);border-left:3px solid #43937a;border-radius:14px;padding:18px;margin:18px 0;background:var(--panel-solid,#fff)}.pr-main .pr-win-card{padding:16px 0}.pr-main .pr-win-card+.pr-win-card{border-top:1px solid var(--line);margin-top:0}.pr-main .pr-win-card h4{margin:0 0 10px;font-size:14px}.pr-main .pr-win-card p{margin:9px 0}.pr-main .pr-win-card .pr-evidence{margin-top:12px;padding:8px 10px;background:var(--accent-soft,#f5f7fb);border:0;border-radius:8px;font-size:12px;line-height:1.7}.pr-more-wins summary,.pr-recovery summary{cursor:pointer;padding:12px 0}.pr-more-wins{border-top:1px solid var(--line)}.pr-main .pr-text{line-height:1.85}.pr-main .katex{font-size:1.08em;white-space:normal}.pr-main .katex-display{overflow-x:auto;overflow-y:hidden;padding:8px 2px;margin:12px 0;max-width:100%}.pr-main .katex-html{white-space:normal}.pr-recovery{padding:20px;border:1px solid var(--line);border-radius:14px}.pr-recovery>.pr-button{margin:12px 0}.pr-recovered-pages{display:flex;gap:8px;overflow:auto;padding:10px 0}.pr-recovered-pages img{width:80px;height:95px;object-fit:contain;border:1px solid var(--line);border-radius:8px;flex:none}.pr-recovered-work article{padding:12px 0;border-bottom:1px solid var(--line)}.pr-main .pr-first-issue{padding:12px 14px;border-radius:0 10px 10px 0;background:var(--accent-soft,#f5f7fb)}
    /* Report reading hierarchy. Sources/editors stay available without leading the story. */
    .pr-inline .pr-content{max-width:780px;margin-inline:auto}.pr-main .pr-reading-section{margin:30px 0 36px;scroll-margin-top:120px}.pr-main .pr-reading-section:focus{outline:none}.pr-main .pr-reading-section:focus-visible{outline:2px solid var(--accent);outline-offset:6px}
    .pr-main .pr-chapter{display:flex;align-items:flex-start;gap:12px;margin:0 0 18px}.pr-main .pr-chapter>span{font-size:12px;font-weight:750;color:var(--accent);background:var(--accent-soft);border-radius:10px;padding:6px 9px;line-height:1.5}.pr-main .pr-chapter h3{font-size:19px;line-height:1.4;margin:0 0 4px}.pr-main .pr-chapter p{color:var(--muted);font-size:12px;margin:0}
    .pr-main .pr-result-top{background:var(--accent-soft);border:0;padding:24px;margin-top:16px}.pr-main .pr-result-top h3{font-size:24px;line-height:1.35;margin:8px 0}.pr-main .pr-total{display:flex;align-items:baseline;gap:5px;color:var(--text)}.pr-main .pr-total>b{font-size:36px;letter-spacing:-1px}.pr-main .pr-total>span{font-size:16px}.pr-main .pr-total>small{margin-left:8px;font-size:11px;color:var(--muted)}
    .pr-report-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.pr-main .pr-report-nav .pr-button{min-height:42px;background:var(--panel-solid);flex:1}.pr-main .pr-score-summary{font-size:13px;line-height:1.85;padding:12px 14px;border-radius:10px;background:var(--panel-solid);border:1px solid var(--line);margin-bottom:14px}
    .pr-main .pr-fold{border:0;border-top:1px solid var(--line);border-radius:0;padding:0;margin:12px 0;background:none}.pr-main .pr-fold>summary{cursor:pointer;padding:13px 2px;font-size:13px;font-weight:600;line-height:1.6;color:var(--text);overflow-wrap:anywhere}.pr-main .pr-fold-body{padding:0 2px 12px;min-width:0}.pr-main .pr-fold-body>label{display:block;font-size:12px;color:var(--muted);margin:12px 0}.pr-main summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
    .pr-main .pr-action-plan{background:var(--panel-solid);border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:14px;padding:18px;margin:18px 0}.pr-main .pr-action-heading{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}.pr-main .pr-action-heading h4{font-size:15px;margin:0;line-height:1.6;overflow-wrap:anywhere}.pr-step-number{font-size:12px;color:var(--accent);font-weight:700;flex:none}.pr-main .pr-action{padding:16px 0}.pr-main .pr-action:last-child{padding-bottom:0}.pr-main .pr-success{border:0;border-radius:10px;background:var(--accent-soft);padding:12px 14px;margin:14px 0}.pr-main .pr-success>b{display:block;font-size:12px;color:var(--accent);margin-bottom:3px}.pr-main .pr-success p{margin:0}
    .pr-main .pr-prose{white-space:normal;font-size:14px;line-height:1.85}.pr-main .pr-prose p{white-space:pre-wrap;margin:8px 0}.pr-main .pr-prose p:first-child{margin-top:0}.pr-main .pr-prose ul,.pr-main .pr-prose ol{padding-left:24px;margin:10px 0}.pr-main .pr-prose li{margin:7px 0;white-space:pre-wrap}.pr-main .pr-prose strong{font-weight:650}.pr-main .pr-evidence{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}.pr-main .pr-prose-heading{padding-top:6px}.pr-main .pr-wins .pr-win-card{padding:12px 0}.pr-main .pr-wins h3{font-size:16px}.pr-main .pr-win-card h4{font-size:12px;color:var(--muted);margin-bottom:6px}.pr-main .pr-win-card .pr-fold{margin:6px 0;border:0}.pr-main .pr-win-card .pr-fold>summary{padding:5px 0;color:var(--muted);font-size:12px}
    .pr-question-filters{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.pr-question-filters [aria-pressed=true]{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}.pr-main .pr-question[hidden],.pr-main [hidden]{display:none!important}.pr-main .pr-question{background:var(--panel-solid);overflow:hidden;scroll-margin-top:120px}.pr-main .pr-question>summary{padding:16px;font-size:14px;min-height:48px;list-style:none}.pr-main .pr-question>summary::-webkit-details-marker{display:none}.pr-main .pr-question>summary>span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}.pr-main .pr-question summary small{font-size:11px;line-height:1.65;margin-top:4px}.pr-main .pr-badge{font-size:12px;flex:none}.pr-chevron{font-size:0;width:7px;height:7px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg);margin:0 3px 4px;flex:none}.pr-question[open]>summary>.pr-chevron{transform:rotate(225deg);margin-top:6px}.pr-main .pr-question[open]>summary{border-bottom:1px solid var(--line)}.pr-main .pr-question-body{padding:16px}.pr-main .pr-question-body h4{font-size:14px}.pr-main .pr-first-issue{margin:0 0 18px;padding:14px;border-left:3px solid #d99a57}.pr-main .pr-first-issue h4:first-child{margin-top:0}.pr-main .pr-full-credit{font-size:14px;font-weight:600}.pr-main .pr-source{margin-top:20px}.pr-main .pr-link{min-height:36px;padding:6px 12px}.pr-main .pr-check{font-size:12px}.pr-main .pr-context{padding:12px 0}.pr-main .pr-context>summary{cursor:pointer;font-weight:600}.pr-main .pr-report-meta .pr-insight{margin-bottom:18px}.pr-main .katex-error{overflow-wrap:anywhere}
    @media(max-width:520px){.pr-dialog{width:100%;max-width:100%;max-height:100dvh;height:100dvh;margin:0;border-radius:0;border:0}.pr-head{padding:15px 16px}.pr-content{padding:0 16px 24px}.pr-pages{grid-template-columns:repeat(2,minmax(0,1fr))}.pr-intro,.pr-main .pr-result-top{padding:18px}.pr-head h2{font-size:18px}.pr-stats b{font-size:20px}.pr-main .pr-question>summary{padding:14px;gap:8px}.pr-main .pr-report-nav .pr-button{font-size:12px;padding:8px}.pr-main .pr-difficulty-table thead{display:none}.pr-main .pr-difficulty-table tbody{display:block}.pr-main .pr-difficulty-table tr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:10px;margin:10px 0;padding:8px}.pr-main .pr-difficulty-table td{padding:4px;border:0}.pr-main .pr-difficulty-table td:nth-child(1)::before{content:'题号 ';color:var(--muted)}.pr-main .pr-difficulty-table td:nth-child(2)::before{content:'综合 ';color:var(--muted)}.pr-main .pr-difficulty-table td:nth-child(3)::before{content:'思考 ';color:var(--muted)}.pr-main .pr-difficulty-table td:nth-child(4)::before{content:'计算 ';color:var(--muted)}.pr-main .pr-difficulty-table td:last-child{grid-column:1/-1;border-top:1px solid var(--line);margin-top:6px;padding-top:8px;font-size:13px;line-height:1.8}}@media(prefers-reduced-motion:reduce){.pr-spinner{animation:none}}
  `;
  style.textContent += '.pr-action-message{flex:1 0 100%;min-width:0;margin:0 0 10px;box-sizing:border-box;line-height:1.7;overflow-wrap:anywhere}.pr-action-message:empty{display:none}.pr-footer:has(>.pr-action-message){flex-wrap:wrap}';
  document.head.appendChild(style);
})();
