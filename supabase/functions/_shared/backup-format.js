/* One validator for the browser preview and the authenticated import endpoint. */
(function (root) {
  'use strict';
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function object(v, label) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(label + '格式不正确');
    for (var k of Object.keys(v)) if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('备份含有不支持的字段');
    return v;
  }
  function str(v, max, label, required) {
    if (v == null) v = '';
    if (typeof v !== 'string' || v.length > max || v.includes('\u0000')) throw new Error(label + '格式或长度不正确');
    v = v.trim(); if (required && !v) throw new Error(label + '不能为空'); return v;
  }
  function number(v, label, max, min, integer) {
    if (v === null || v === undefined || v === '') return null;
    if (!['number', 'string'].includes(typeof v) || (typeof v === 'string' && !v.trim())) throw new Error(label + '必须是数字');
    var n = Number(v);
    if (!Number.isFinite(n) || n < (min || 0) || n > (max || 99999) || (integer && !Number.isInteger(n)) || (!integer && Math.abs(n * 1000 - Math.round(n * 1000)) > .00001)) throw new Error(label + '超出范围或精度不正确');
    return n;
  }
  function date(v, label, required) {
    var s = str(v, 10, label, required);
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s) throw new Error(label + '不是有效日期');
    return s;
  }
  function bool(v, label) { if (v == null) return false; if (typeof v !== 'boolean') throw new Error(label + '必须为布尔值'); return v; }
  function list(v, max, label) { if (!Array.isArray(v) || v.length > max) throw new Error(label + '须为列表，最多 ' + max + ' 项'); return v; }
  function ranks(v, label) {
    v = object(v || {}, label); var o = {};
    [['yearRank','yearParticipants'],['classRank','classParticipants']].forEach(function (pair) {
      pair.forEach(function (key) { o[key] = number(v[key], label + key, 10000000, 1, true); });
      if (o[pair[0]] != null && o[pair[1]] != null && o[pair[0]] > o[pair[1]]) throw new Error(label + '排名大于人数');
    });
    ['yearPositionPercent','classPositionPercent'].forEach(function (k) { if (own(v, k)) o[k] = number(v[k], label + k, 100); });
    return o;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function identity(exam) { return canonical([exam.name, exam.exam_date, exam.grade_level || '', Object.keys(exam.scores || {}).sort()]); }
  function normalize(raw) {
    object(raw, '备份');
    if (raw.app !== 'score-tracker') throw new Error('请选择成绩轨迹导出的「完整备份」JSON 文件');
    if (raw.backupVersion != null && raw.backupVersion !== 2) throw new Error('备份版本较新，请先更新成绩轨迹');
    var out = { app: 'score-tracker', backupVersion: 2, account: str(raw.originalUsername || raw.account, 100, '备份账号'), modules: [], subjectConfigs: [], exams: [], category: null, goal: null, participantDefaults: {}, restoreFields:{goal:own(raw,'goal'),participantDefaults:own(raw,'participantDefaults')} };
    var mods = new Map(), names = new Set(), ids = new Set();
    list(raw.modules || [], 40, '成绩组合').forEach(function (m) {
      object(m, '组合'); var id = str(m.id, 100, '组合编号', true), name = str(m.name, 30, '组合名称', true);
      if (mods.has(id) || names.has(name)) throw new Error('备份中的组合编号或名称重复');
      var subjects = list(m.subjects, 40, '组合科目').map(function (s) { return str(s, 40, '组合科目', true); });
      if (subjects.length < 2 || new Set(subjects).size !== subjects.length) throw new Error('组合须有至少两门不重复科目');
      var row = { id: id, name: name, subjects: subjects, isBuiltin: bool(m.isBuiltin, '内置组合') };
      mods.set(id, row); names.add(name); out.modules.push(row);
    });
    names.clear();
    list(raw.subjectConfigs || [], 40, '科目设置').forEach(function (s) {
      object(s, '科目设置'); var name = str(s.name, 40, '科目名称', true), max = number(s.defaultMax, '科目满分', 999, .001);
      if (max == null || names.has(name)) throw new Error('科目名称重复或缺少默认满分');
      names.add(name); out.subjectConfigs.push({ name: name, defaultMax: max });
    });
    var exams = list(raw.exams, 1000, '考试');
    if (raw.examCount != null && raw.examCount !== exams.length) throw new Error('备份考试数量与内容不一致');
    exams.forEach(function (ex, index) {
      object(ex, '考试'); var label = '第 ' + (index + 1) + ' 场考试：';
      var e = { name: str(ex.name, 100, label + '名称', true), exam_date: date(ex.exam_date, label + '日期', true), end_date: date(ex.end_date, label + '结束日期'), grade_level: str(ex.grade_level, 20, label + '分类') || null, is_hidden: bool(ex.is_hidden, label + '隐藏状态'), reflection: str(ex.reflection, 10000, label + '考后反思'), scores: {}, moduleIds: [], moduleRanks: {}, averages: {}, question_type_scores: {} };
      if (e.end_date && e.end_date < e.exam_date) throw new Error(label + '结束日期早于开始日期');
      if (ex.id != null) { e.sourceId = str(ex.id, 100, label + '编号', true); if (ids.has(e.sourceId)) throw new Error('备份中有重复考试编号'); ids.add(e.sourceId); }
      [['total_rank','total_participants'],['total_class_rank','total_class_participants'],['city_rank','city_participants'],['district_rank','district_participants']].forEach(function (pair) {
        pair.forEach(function (k) { var camel = k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); e[k] = number(ex[k] == null ? ex[camel] : ex[k], label + k, 10000000, 1, true); });
        if (e[pair[0]] != null && e[pair[1]] != null && e[pair[0]] > e[pair[1]]) throw new Error(label + '排名大于人数');
      });
      ['total_actual_score','total_raw_score'].forEach(function (k) { e[k] = number(ex[k], label + k); });
      ['total_year_position_percent','total_class_position_percent'].forEach(function (k) { e[k] = number(ex[k], label + k, 100); });
      object(ex.scores, label + '成绩');
      if (Object.keys(ex.scores).length > 40) throw new Error(label + '科目过多');
      Object.keys(ex.scores).forEach(function (key) {
        var name = str(key, 40, label + '科目', true), r = object(ex.scores[key], label + name), s = {};
        ['target','actual','raw','max','rawMax'].forEach(function (k) { s[k] = number(r[k], label + name + k,k==='raw'?9999:99999); });
        if (s.max == null) s.max = (out.subjectConfigs.find(function (c) { return c.name === name; }) || {}).defaultMax || 100;
        if (s.rawMax == null) s.rawMax = s.max;
        if (s.max <= 0 || s.rawMax <= 0 || (s.actual != null && s.actual > s.max) || (s.target != null && s.target > s.max) || (s.raw != null && s.raw > s.rawMax)) throw new Error(label + name + '成绩超过满分或满分无效');
        var rank = ranks({yearRank:r.rank,yearParticipants:r.participants,classRank:r.classRank,classParticipants:r.classParticipants}, label + name);
        s.rank=rank.yearRank; s.participants=rank.yearParticipants; s.classRank=rank.classRank; s.classParticipants=rank.classParticipants;
        s.yearPositionPercent=number(r.yearPositionPercent,label+name+'年位比',100); s.classPositionPercent=number(r.classPositionPercent,label+name+'班位比',100);
        s.excludeFromTotal=bool(r.excludeFromTotal,label+name+'计分状态'); e.scores[name]=s;
      });
      list(ex.moduleIds || [], 40, label + '组合关联').forEach(function (id) { if (!mods.has(id) || e.moduleIds.includes(id)) throw new Error(label + '引用了缺失或重复的组合'); e.moduleIds.push(id); });
      Object.entries(object(ex.moduleRanks || {}, label + '组合排名')).forEach(function (entry) {
        if (!e.moduleIds.includes(entry[0])) throw new Error(label + '组合排名没有关联组合'); e.moduleRanks[entry[0]] = ranks(entry[1], label + '组合');
      });
      Object.entries(object(ex.averages || {}, label + '均分')).forEach(function (entry) {
        var k=entry[0], r=object(entry[1],label+'均分'), avg={};
        if (k !== 'total' && !(k.startsWith('s:') && own(e.scores,k.slice(2))) && !(k.startsWith('m:') && e.moduleIds.includes(k.slice(2)))) throw new Error(label+'均分引用了缺失的科目或组合');
        ['class','year'].forEach(function (scope) { if (own(r,scope)) avg[scope]=number(r[scope],label+'均分'); });
        if (r.basis != null) avg.basis=str(r.basis,5000,label+'均分口径'); e.averages[k]=avg;
      });
      Object.entries(object(ex.question_type_scores || {}, label+'题型')).forEach(function (entry) {
        if (!own(e.scores,entry[0])) throw new Error(label+'题型缺少所属科目');
        var rows=list(entry[1],100,label+'题型').map(function (r) {
          object(r,label+'题型'); var row={name:str(r.name,40,label+'题型名称',true),score:number(r.score,label+'题型得分'),max:number(r.max,label+'题型满分')};
          if (row.max===0 || (row.score!=null && row.max!=null && row.score>row.max)) throw new Error(label+'题型得分超过满分');
          ['position','difficulty','cause','reason'].forEach(function (k) { if (r[k]!=null) row[k]=str(r[k],200,label+'题型标注'); }); return row;
        }); e.question_type_scores[entry[0]]=rows;
      });
      out.exams.push(e);
    });
    if (raw.category != null) {
      object(raw.category,'分类设置'); var options=list(raw.category.options,12,'分类选项').map(function (s) { return str(s,20,'分类选项',true); });
      if (!options.length || new Set(options).size!==options.length) throw new Error('分类选项为空或重复');
      out.category={label:str(raw.category.label,16,'分类名称',true),options:options};
    }
    if (raw.goal != null) {
      var g=object(raw.goal,'长期目标'), goals={};
      Object.entries(object(g.subjects || {},'科目目标')).forEach(function (entry) { var name=str(entry[0],40,'目标科目',true), n=number(entry[1],'科目目标',1000); if(n==null)throw new Error('科目目标不能为空');goals[name]=n; });
      if (Object.keys(goals).length>40) throw new Error('科目目标过多');
      out.goal={subjects:goals,totalGoal:number(g.totalGoal,'总分目标'),school:str(g.school,40,'理想学校'),date:date(g.date,'目标日期'),dateName:str(g.dateName,20,'倒计时名称')};
    }
    Object.entries(object(raw.participantDefaults || {},'默认人数')).forEach(function (entry) {
      var k=entry[0],r=object(entry[1],'默认人数'),v={};
      if(k!=='total' && !/^s:.{1,40}$/.test(k) && !(k.startsWith('m:')&&mods.has(k.slice(2))))throw new Error('默认人数引用了缺失的组合');
      ['class','year'].forEach(function (scope) { if(own(r,scope))v[scope]=number(r[scope],'默认人数',10000000,1,true); });out.participantDefaults[k]=v;
    });
    if(Object.keys(out.participantDefaults).length>200)throw new Error('默认人数项目过多');
    return out;
  }
  root.ScoreBackup={normalize:normalize,canonical:canonical,identity:identity,maxBytes:8*1024*1024};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ScoreBackup;
})(globalThis);
