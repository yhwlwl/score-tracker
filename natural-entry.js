/* student quick exam entry: local natural-language parsing plus optional multi-image recognition */
(function () {
  'use strict';

  if (window.__studentNaturalEntryV1) return;
  window.__studentNaturalEntryV1 = true;

  function trackUsage(eventType, metadata) {
    try {
      if (typeof window.__scoreTrackerTrack === 'function') {
        window.__scoreTrackerTrack(eventType, metadata || {}, 'record');
      }
    } catch (e) {}
  }

  var LABELS = {
    name: ['考试名称', '考试名', '考试'],
    date: ['考试日期', '日期', '考试时间'],
    endDate: ['结束日期', '结束时间'],
    grade: ['年级分类', '就读年级', '年级'],
    target: ['目标成绩', '目标分', '目标'],
    raw: ['原始成绩', '原始分', '原始'],
    rawMax: ['原始满分', '原始总分'],
    actual: ['最终分（赋分后）', '最终成绩', '最终分', '赋分成绩', '赋分分', '赋分', '真实成绩', '真实分', '考后成绩', '实际成绩', '实得分'],
    max: ['最终满分', '赋分满分', '满分'],
    yearRank: ['年级总排名', '总分年级排名', '总年排', '年级排名', '总分年排', '年排', '校次', '校排', '校排名', '学校排名', '学校名次'],
    yearPeople: ['年级总人数', '总年级人数', '全年级人数', '年级人数', '参考人数'],
    classRank: ['班级总排名', '总分班级排名', '总班排', '班级排名', '总分班排', '班排', '班次'],
    classPeople: ['班级总人数', '总班级人数', '全班人数', '班级人数'],
    yearPercent: ['年级总位比', '总分年位比', '总分年级前', '年级位比', '年位比', '总分前', '年级前'],
    classPercent: ['班级总位比', '总分班位比', '总分班级前', '班级位比', '班位比', '总班位比', '班级前'],
    finalTotal: ['最终总分', '赋分总分', '真实总分', '实际总分'],
    rawTotal: ['原始总分'],
    cityRank: ['市级排名', '市排名', '市名次', '市排'],
    cityPeople: ['市级人数', '市人数'],
    districtRank: ['区级排名', '区排名', '区名次', '区排'],
    districtPeople: ['区级人数', '区人数']
  };

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value == null ? '' : String(value));
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
    });
  }

  function text(value) {
    return String(value == null ? '' : value)
      .replace(/\r\n?/g, '\n')
      .replace(/[：]/g, ':')
      .replace(/[，]/g, ',')
      .replace(/[；]/g, ';')
      .replace(/[｜]/g, '|')
      .replace(/\u3000/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  function unique(values) {
    var seen = Object.create(null);
    return values.filter(function (value) {
      var key = String(value || '').trim();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function escapeRegExp(value) {
    return String(value).replace(/[^\w\u4e00-\u9fff]/g, '\\$&');
  }

  function labelPattern(labels) {
    return labels.slice().sort(function (a, b) { return b.length - a.length; })
      .map(escapeRegExp).join('|');
  }

  function readChunk(source, labels) {
    var body = String(source || '');
    if (!body || !labels || !labels.length) return '';
    var pattern = labelPattern(labels);
    var match = body.match(new RegExp('(?:^|[\\s,;|])(?:' + pattern + ')\\s*(?:[:=]|是)?\\s*([^\\n,;|。]+)', 'i'));
    return match ? match[1].trim() : '';
  }

  function readWide(source, labels) {
    var body = String(source || '');
    if (!body || !labels || !labels.length) return '';
    var pattern = labelPattern(labels);
    var match = body.match(new RegExp('(?:^|[\\s,;|])(?:' + pattern + ')\\s*(?:[:=]|是)?\\s*([^\\n;|。]{0,100})', 'i'));
    return match ? match[1].trim() : '';
  }

  function numbers(value) {
    var matches = String(value || '').match(/\d+(?:\.\d+)?/g);
    return matches || [];
  }

  function firstNumber(value) {
    var list = numbers(value);
    return list.length ? list[0] : '';
  }

  function pairFor(source, labels) {
    var list = numbers(readChunk(source, labels));
    return { first: list[0] || '', second: list[1] || '' };
  }

  function numberFor(source, labels) {
    var chunk = readChunk(source, labels);
    if (chunk) return firstNumber(chunk);
    return firstNumber(readWide(source, labels));
  }

  function percentFor(source, labels) {
    var chunk = readChunk(source, labels) || readWide(source, labels);
    var match = String(chunk || '').match(/前?\s*(\d+(?:\.\d+)?)\s*%?/);
    return match ? match[1] : '';
  }

  function parseDate(value) {
    var match = String(value || '').match(/(\d{4})\s*[.\-/年]\s*(\d{1,2})\s*[.\-/月]\s*(\d{1,2})\s*日?/);
    if (!match) {
      match = String(value || '').match(/(\d{1,2})\s*[.\-/月]\s*(\d{1,2})\s*日?/);
      if (match) {
        var year = new Date().getFullYear();
        return year + '-' + String(Number(match[1])).padStart(2, '0') + '-' + String(Number(match[2])).padStart(2, '0');
      }
      return '';
    }
    return match[1] + '-' + String(Number(match[2])).padStart(2, '0') + '-' + String(Number(match[3])).padStart(2, '0');
  }

  function valueOrEmpty(value) {
    var normalized = value == null ? '' : String(value).trim().toLowerCase();
    return !normalized || ['-', '—', '–', '_', '空', '无', '未填写', '未知', 'n/a', 'na', 'null'].indexOf(normalized) > -1 ? '' : String(value).trim();
  }

  function addFieldCount(result, value) {
    if (value !== undefined && value !== null && value !== '') result.fieldCount += 1;
  }

  function modalSubjectNames(modal) {
    var names = [];
    if (!modal) return names;
    modal.querySelectorAll('.exam-subject-card-v10 .exam-subject-name-v10').forEach(function (input) {
      if (input.value) names.push(input.value.trim());
    });
    var picker = modal.querySelector('#subjectPickerV21');
    if (picker) Array.prototype.forEach.call(picker.options, function (option) {
      if (option.value) names.push(option.value.trim());
    });
    try {
      if (typeof state !== 'undefined' && state.subjectConfigs) {
        state.subjectConfigs.forEach(function (item) {
          if (item && item.name) names.push(String(item.name).trim());
        });
      }
    } catch (e) {}
    return unique(names).sort(function (a, b) { return b.length - a.length; });
  }

  function modalModuleNames(modal) {
    var names = [];
    if (!modal) return names;
    var picker = modal.querySelector('#comboPickerV21');
    if (picker) Array.prototype.forEach.call(picker.options, function (option) {
      if (option.value) names.push({ name: option.textContent.trim(), id: option.value });
    });
    return names.sort(function (a, b) { return b.name.length - a.name.length; });
  }

  function occurrencesFor(source, names) {
    var found = [];
    names.forEach(function (name) {
      var start = 0;
      while (start < source.length) {
        var position = source.indexOf(name, start);
        if (position < 0) break;
        var before = position ? source.charAt(position - 1) : '';
        var after = source.slice(position + name.length, position + name.length + 36);
        var likelyBoundary = !before || /[\s,;|]/.test(before);
        var likelyValue = /[:\d]|目标|原始|最终|真实|成绩|年排|班排|位比|排名|满分/.test(after);
        if (likelyBoundary && likelyValue) found.push({ name: name, position: position });
        start = position + name.length;
      }
    });
    found.sort(function (a, b) {
      if (a.position !== b.position) return a.position - b.position;
      return b.name.length - a.name.length;
    });
    var result = [];
    found.forEach(function (item) {
      var previous = result[result.length - 1];
      if (previous && item.position < previous.position + previous.name.length) {
        if (item.name.length > previous.name.length) result[result.length - 1] = item;
      } else {
        result.push(item);
      }
    });
    return result.map(function (item, index) {
      return {
        name: item.name,
        body: source.slice(item.position + item.name.length, index + 1 < result.length ? result[index + 1].position : source.length)
          .replace(/^[\s:：]+/, '')
          .trim()
      };
    });
  }

  function globalOnlySource(source, subjectNames) {
    var names = subjectNames || [];
    return String(source || '').split(/[\n;|。]/).filter(function (chunk) {
      var value = chunk.trim();
      if (!value) return false;
      return !names.some(function (name) {
        var pattern = '^' + escapeRegExp(name) + '(?:\\s|:|目标|原始|最终|真实|成绩|年排|班排|位比|排名|\\d)';
        return new RegExp(pattern).test(value);
      });
    }).join('\n');
  }

  function mergeSubject(result, name, next) {
    if (!result.subjects[name]) result.subjects[name] = {};
    Object.keys(next).forEach(function (key) {
      if (next[key] !== undefined && next[key] !== null && next[key] !== '') result.subjects[name][key] = next[key];
    });
  }

  function subjectBodyOnly(body) {
    var source = String(body || '');
    var boundary = source.search(/(?:^|[\n;,])\s*(?:总分|全科|年级总|总年级|班级总|总班级|市级|区级|市排名|区排名)/);
    return boundary > 0 ? source.slice(0, boundary).trim() : source;
  }

  function parseSubjectBody(body) {
    body = subjectBodyOnly(body);
    var data = {};
    var targetPair = pairFor(body, LABELS.target);
    var rawPair = pairFor(body, LABELS.raw);
    var actualPair = pairFor(body, LABELS.actual);
    var targetChunk = readChunk(body, LABELS.target);
    var rawChunk = readChunk(body, LABELS.raw);
    var actualChunk = readChunk(body, LABELS.actual);

    data.target = firstNumber(targetChunk);
    data.raw = firstNumber(rawChunk);
    data.actual = firstNumber(actualChunk);

    if (targetPair.second && /\//.test(targetChunk)) data.max = targetPair.second;
    if (rawPair.first) {
      data.raw = data.raw || rawPair.first;
      if (rawPair.second) data.rawMax = rawPair.second;
    }
    if (actualPair.first) {
      data.actual = data.actual || actualPair.first;
      if (actualPair.second) data.max = data.max || actualPair.second;
    }

    var rawMax = numberFor(body, LABELS.rawMax);
    var finalMax = numberFor(body, LABELS.max);
    if (rawMax) data.rawMax = rawMax;
    if (finalMax) data.max = finalMax;

    var scoreBody = String(body).split(/年排|班排|年级位比|年位比|班级位比|班位比|排名/)[0];
    var genericPair = scoreBody.match(/(\d+(?:\.\d+)?)\s*[/／]\s*(\d+(?:\.\d+)?)/);
    if (!data.target && !data.raw && !data.actual && genericPair) {
      data.actual = genericPair[1];
      data.max = data.max || genericPair[2];
    } else if (data.target && !data.actual && genericPair && !/目标[^,;|]*[/／]/.test(body)) {
      data.actual = genericPair[1];
      data.max = data.max || genericPair[2];
    }

    if (!data.actual && data.raw && !actualChunk) {
      data.actual = data.raw;
      if (!data.max && data.rawMax) data.max = data.rawMax;
    }

    if (!data.actual && !data.raw && !data.target) {
      var scoreOnlyBody = String(body).split(/年排|班排|年级位比|年位比|班级位比|班位比|排名/)[0];
      var fallback = firstNumber(scoreOnlyBody);
      if (fallback) data.actual = fallback;
    }

    var yearPair = pairFor(body, LABELS.yearRank);
    var classPair = pairFor(body, LABELS.classRank);
    var yearRank = yearPair.first || numberFor(body, LABELS.yearRank);
    var classRank = classPair.first || numberFor(body, LABELS.classRank);
    if (yearRank) data.rank = yearRank;
    if (yearPair.second) data.participants = yearPair.second;
    if (classRank) data.classRank = classRank;
    if (classPair.second) data.classParticipants = classPair.second;

    var yearPeople = numberFor(body, LABELS.yearPeople);
    var classPeople = numberFor(body, LABELS.classPeople);
    if (yearPeople) data.participants = yearPeople;
    if (classPeople) data.classParticipants = classPeople;

    var yearPercent = percentFor(body, LABELS.yearPercent);
    var classPercent = percentFor(body, LABELS.classPercent);
    if (yearPercent) data.yearPositionPercent = yearPercent;
    if (classPercent) data.classPositionPercent = classPercent;

    if (/不计入总分|不计总分|统计项/.test(body)) data.excludeFromTotal = true;
    if (/计入总分/.test(body) && !/不计入总分|不计总分/.test(body)) data.excludeFromTotal = false;
    return data;
  }

  function parseModuleBody(body) {
    var year = pairFor(body, LABELS.yearRank);
    var cls = pairFor(body, LABELS.classRank);
    return {
      yearRank: year.first || numberFor(body, LABELS.yearRank),
      yearParticipants: year.second || numberFor(body, LABELS.yearPeople),
      classRank: cls.first || numberFor(body, LABELS.classRank),
      classParticipants: cls.second || numberFor(body, LABELS.classPeople)
    };
  }

  function parseInput(raw, modal) {
    var source = text(raw);
    var result = {
      name: '',
      date: '',
      endDate: '',
      gradeLevel: '',
      hidden: null,
      total: {},
      city: {},
      subjects: {},
      modules: {},
      rankMode: '',
      warnings: [],
      errors: [],
      fieldCount: 0
    };
    if (!source) {
      result.errors.push('请先输入要识别的内容。');
      return result;
    }

    result.name = valueOrEmpty(readChunk(source, LABELS.name));
    var dateChunk = readChunk(source, LABELS.date);
    var freeDate = source.match(/\d{4}\s*[.\-/年]\s*\d{1,2}\s*[.\-/月]\s*\d{1,2}\s*日?/);
    result.date = parseDate(dateChunk) || (freeDate ? parseDate(freeDate[0]) : '');
    result.endDate = parseDate(readChunk(source, LABELS.endDate));
    result.gradeLevel = valueOrEmpty(readChunk(source, LABELS.grade));
    if (/年级排名|年级人数|总年排/.test(result.gradeLevel)) result.gradeLevel = '';

    if (!result.name) {
      var datePosition = source.search(/\d{4}\s*[.\-/年]\s*\d{1,2}\s*[.\-/月]\s*\d{1,2}/);
      if (datePosition > 0) {
        var beforeDate = source.slice(0, datePosition).split(/[\n;,]/).pop().trim();
        if (beforeDate && beforeDate.length <= 60 && !/考试名称|日期|年级|目标|原始|真实|最终/.test(beforeDate)) result.name = beforeDate;
      }
    }
    if (!result.name) {
      var firstLine = source.split('\n').map(function (line) { return line.trim(); }).find(function (line) {
        return line && !/考试日期|日期|年级|目标|原始|真实|最终|年排|班排|位比/.test(line);
      });
      if (firstLine && firstLine.length <= 60 && !/:/.test(firstLine)) result.name = firstLine;
    }

    var subjectNames = modalSubjectNames(modal);
    var globalSource = globalOnlySource(source, subjectNames);
    var totalYear = pairFor(source, ['年级总排名', '总分年级排名', '总年排', '总分年排']);
    if (!totalYear.first) totalYear = pairFor(globalSource, ['年级排名', '年排']);
    var totalClass = pairFor(source, ['班级总排名', '总分班级排名', '总班排', '总分班排']);
    if (!totalClass.first) totalClass = pairFor(globalSource, ['班级排名', '班排']);
    var yearPeople = numberFor(source, ['年级总人数', '总年级人数', '全年级人数', '参考人数']);
    if (!yearPeople) yearPeople = numberFor(globalSource, ['年级人数']);
    var classPeople = numberFor(source, ['班级总人数', '总班级人数', '全班人数']);
    if (!classPeople) classPeople = numberFor(globalSource, ['班级人数']);
    result.total.yearRank = totalYear.first || numberFor(globalSource, ['年级排名', '年排']);
    result.total.yearParticipants = totalYear.second || yearPeople;
    result.total.classRank = totalClass.first || numberFor(globalSource, ['班级排名', '班排']);
    result.total.classParticipants = totalClass.second || classPeople;
    result.total.yearPositionPercent = percentFor(source, ['年级总位比', '总分年位比', '总分年级前']) || percentFor(globalSource, ['年级位比', '年级前']);
    result.total.classPositionPercent = percentFor(source, ['班级总位比', '总分班位比', '总分班级前']) || percentFor(globalSource, ['班级位比', '班级前']);
    result.total.actualScore = numberFor(source, LABELS.finalTotal);
    result.total.rawScore = numberFor(source, LABELS.rawTotal);
    result.city.cityRank = pairFor(source, LABELS.cityRank).first || numberFor(source, LABELS.cityRank);
    result.city.cityParticipants = pairFor(source, LABELS.cityRank).second || numberFor(source, LABELS.cityPeople);
    result.city.districtRank = pairFor(source, LABELS.districtRank).first || numberFor(source, LABELS.districtRank);
    result.city.districtParticipants = pairFor(source, LABELS.districtRank).second || numberFor(source, LABELS.districtPeople);

    var hiddenNo = /(?:隐藏|图表显示)\s*[:=]?\s*(?:否|不|false|0)|不隐藏|恢复显示|参与图表|正常显示/i.test(source);
    var hiddenYes = /(?:隐藏|图表显示)\s*[:=]?\s*(?:是|是的|true|1)|不参与图表|不显示/i.test(source);
    if (hiddenYes) result.hidden = true;
    else if (hiddenNo) result.hidden = false;
    else if (/隐藏这次|隐藏考试/.test(source)) result.hidden = true;

    addFieldCount(result, result.name);
    addFieldCount(result, result.date);
    addFieldCount(result, result.endDate);
    addFieldCount(result, result.gradeLevel);
    Object.keys(result.total).forEach(function (key) { addFieldCount(result, result.total[key]); });
    Object.keys(result.city).forEach(function (key) { addFieldCount(result, result.city[key]); });

    var subjects = occurrencesFor(source, subjectNames);
    subjects.forEach(function (item) {
      var parsed = parseSubjectBody(item.body);
      if (Object.keys(parsed).length) mergeSubject(result, item.name, parsed);
    });
    Object.keys(result.subjects).forEach(function (name) {
      Object.keys(result.subjects[name]).forEach(function (key) { addFieldCount(result, result.subjects[name][key]); });
    });

    var modules = occurrencesFor(source, modalModuleNames(modal).map(function (item) { return item.name; }));
    modules.forEach(function (item) {
      var parsed = parseModuleBody(item.body);
      result.modules[item.name] = parsed;
      Object.keys(parsed).forEach(function (key) { addFieldCount(result, parsed[key]); });
    });

    var hasRank = ['yearRank', 'yearParticipants', 'classRank', 'classParticipants'].some(function (key) {
      return result.total[key] || Object.keys(result.subjects).some(function (name) { return result.subjects[name][key === 'yearRank' ? 'rank' : key === 'classRank' ? 'classRank' : key === 'yearParticipants' ? 'participants' : 'classParticipants']; });
    });
    var hasPercent = ['yearPositionPercent', 'classPositionPercent'].some(function (key) {
      return result.total[key] || Object.keys(result.subjects).some(function (name) { return result.subjects[name][key]; });
    });
    result.rankMode = hasPercent && !hasRank ? 'percent' : (hasRank ? 'rank' : '');
    if (hasRank && hasPercent) result.warnings.push('同时识别到了名次和位比；原表一次只能保存一种排名录入方式，本次优先回填名次。');

    if (!result.fieldCount) result.errors.push('没有识别到可回填字段。请给出考试名称、日期、科目或排名标签。');
    return result;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function mark(element, value) {
    if (!element || value === undefined || value === null || value === '') return 0;
    var next = String(value);
    if (element.value !== next) {
      element.value = next;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    element.classList.add('nl-entry-filled');
    return 1;
  }

  function markChecked(element, checked) {
    if (!element || checked === null || checked === undefined) return 0;
    var next = !!checked;
    if (element.checked !== next) {
      element.checked = next;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    element.classList.add('nl-entry-filled');
    return 1;
  }

  function findSubjectCard(modal, name) {
    var match = null;
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function (card) {
      var input = card.querySelector('.exam-subject-name-v10');
      if (input && input.value.trim() === name) match = card;
    });
    return match;
  }

  async function ensureSubjectCard(modal, name) {
    var current = findSubjectCard(modal, name);
    if (current) return current;
    var picker = modal.querySelector('#subjectPickerV21');
    if (picker) {
      var option = Array.prototype.find.call(picker.options, function (item) {
        return item.value.trim() === name;
      });
      if (option) {
        picker.value = option.value;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
        for (var i = 0; i < 5; i += 1) {
          await delay(24);
          current = findSubjectCard(modal, name);
          if (current) return current;
        }
      }
    }
    var addButton = modal.querySelector('#addExamSubjectV16');
    if (addButton && typeof addButton.onclick === 'function') {
      addButton.onclick();
      await delay(0);
      var cards = modal.querySelectorAll('.exam-subject-card-v10');
      current = cards[cards.length - 1] || null;
      if (current) {
        var nameInput = current.querySelector('.exam-subject-name-v10');
        if (nameInput && !nameInput.readOnly) mark(nameInput, name);
        if (nameInput && nameInput.value.trim() === name) return current;
      }
    }
    return null;
  }

  function findModuleCard(modal, name) {
    var card = null;
    modal.querySelectorAll('.combo-card-v21').forEach(function (item) {
      var title = item.querySelector('.combo-head-v21 b');
      if (title && title.textContent.trim() === name) card = item;
    });
    return card;
  }

  async function ensureModuleCard(modal, name) {
    var current = findModuleCard(modal, name);
    if (current) return current;
    var picker = modal.querySelector('#comboPickerV21');
    if (!picker) return null;
    var option = Array.prototype.find.call(picker.options, function (item) {
      return item.textContent.trim() === name;
    });
    if (!option) return null;
    picker.value = option.value;
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    for (var i = 0; i < 5; i += 1) {
      await delay(24);
      current = findModuleCard(modal, name);
      if (current) return current;
    }
    return null;
  }

  function setSelect(modal, selector, value) {
    if (!value) return 0;
    var select = modal.querySelector(selector);
    if (!select) return 0;
    var option = Array.prototype.find.call(select.options, function (item) {
      return item.value === String(value) || item.textContent.trim() === String(value).trim();
    });
    if (!option) return 0;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.classList.add('nl-entry-filled');
    return 1;
  }

  function setRankMode(modal, mode) {
    if (!mode) return;
    var button = modal.querySelector('[data-entry-mode-v17="' + mode + '"]');
    if (button && modal.dataset.rankEntryModeV17 !== mode) button.click();
  }

  function applyField(modal, selector, value, result) {
    var element = modal.querySelector(selector);
    if (!element && value !== undefined && value !== null && value !== '') {
      result.warnings.push('原表中没有找到字段：' + selector);
      return 0;
    }
    return mark(element, value);
  }

  async function applyResult(modal, result) {
    var count = 0;
    count += applyField(modal, '#examName', result.name, result);
    count += applyField(modal, '#examDate', result.date, result);
    count += applyField(modal, '#examEndDateV25', result.endDate, result);
    count += setSelect(modal, '#gradeLevelV14', result.gradeLevel);

    if (result.rankMode) setRankMode(modal, result.rankMode);
    count += applyField(modal, '#totalRankV16', result.total.yearRank, result);
    count += applyField(modal, '#totalParticipantsV16', result.total.yearParticipants, result);
    count += applyField(modal, '#totalClassRankV16', result.total.classRank, result);
    count += applyField(modal, '#totalClassParticipantsV16', result.total.classParticipants, result);
    count += applyField(modal, '.total-year-position-v17', result.total.yearPositionPercent, result);
    count += applyField(modal, '.total-class-position-v17', result.total.classPositionPercent, result);
    count += applyField(modal, '.total-actual-override-v24', result.total.actualScore, result);
    count += applyField(modal, '.total-raw-override-v24', result.total.rawScore, result);

    var cityValues = [
      ['#v33CityR', result.city.cityRank],
      ['#v33CityN', result.city.cityParticipants],
      ['#v33DistR', result.city.districtRank],
      ['#v33DistN', result.city.districtParticipants]
    ];
    cityValues.forEach(function (item) { count += applyField(modal, item[0], item[1], result); });
    if (Object.keys(result.city).some(function (key) { return result.city[key]; })) {
      count += markChecked(modal.querySelector('#v33ApplyCity'), true);
    }
    if (result.hidden !== null) {
      var hidden = modal.querySelector('#examHiddenV16');
      var currentHidden = hidden && hidden.value === '1';
      if (hidden && currentHidden !== result.hidden) {
        var toggle = modal.querySelector('#toggleHiddenV16');
        if (toggle) toggle.click();
        else hidden.value = result.hidden ? '1' : '0';
        count += 1;
      }
    }

    var subjectNames = Object.keys(result.subjects);
    for (var i = 0; i < subjectNames.length; i += 1) {
      var name = subjectNames[i];
      var card = await ensureSubjectCard(modal, name);
      if (!card) {
        result.warnings.push('未找到科目「' + name + '」；请先在账号设置中添加该科目。');
        continue;
      }
      var data = result.subjects[name];
      count += applyField(card, '.target-v16', data.target, result);
      count += applyField(card, '.raw-v16', data.raw, result);
      count += applyField(card, '.actual-v16', data.actual, result);
      count += applyField(card, '.rawmax-v16', data.rawMax, result);
      count += applyField(card, '.max-v16', data.max, result);
      if (result.rankMode === 'rank') {
        count += applyField(card, '.year-rank-v16', data.rank, result);
        count += applyField(card, '.year-participants-v16', data.participants, result);
        count += applyField(card, '.class-rank-v16', data.classRank, result);
        count += applyField(card, '.class-participants-v16', data.classParticipants, result);
      } else if (result.rankMode === 'percent') {
        count += applyField(card, '.year-position-v17', data.yearPositionPercent, result);
        count += applyField(card, '.class-position-v17', data.classPositionPercent, result);
      }
      if (data.excludeFromTotal !== undefined) {
        count += markChecked(card.querySelector('.exclude-total-check-v17'), data.excludeFromTotal);
      }
    }

    var moduleNames = Object.keys(result.modules);
    for (var j = 0; j < moduleNames.length; j += 1) {
      var moduleCard = await ensureModuleCard(modal, moduleNames[j]);
      if (!moduleCard) {
        result.warnings.push('未找到组合「' + moduleNames[j] + '」；请先在账号中维护该组合。');
        continue;
      }
      var moduleData = result.modules[moduleNames[j]];
      count += applyField(moduleCard, '.combo-yr-v25', moduleData.yearRank, result);
      count += applyField(moduleCard, '.combo-yp-v25', moduleData.yearParticipants, result);
      count += applyField(moduleCard, '.combo-cr-v25', moduleData.classRank, result);
      count += applyField(moduleCard, '.combo-cp-v25', moduleData.classParticipants, result);
    }

    return count;
  }

  function showResult(modal, result, count) {
    var old = modal.querySelector('.nl-entry-result');
    if (!old) {
      old = document.createElement('div');
      old.className = 'nl-entry-result';
      var body = modal.querySelector('.modal-body');
      if (body) body.insertBefore(old, body.firstChild);
    }
    var warning = result.warnings.length
      ? '<div class="nl-entry-warning">提示：' + result.warnings.slice(0, 3).map(esc).join('；') + '</div>'
      : '';
    old.innerHTML = '<b>快速录入已回填 ' + count + ' 个字段</b><span>请检查原表后再保存。</span>' + warning;
    old.scrollIntoView({ block: 'nearest' });
  }

  function aiPromptText() {
    return '你是“成绩录入格式化助手”。请把我提供的考试成绩文字整理成下方格式，供 Score Tracker 的“快速录入”使用。\n\n' +
      '规则：\n' +
      '1. 只填写原文明确出现的内容，不要猜测、补全、换算或计算。\n' +
      '2. 日期统一为 YYYY-MM-DD；排名统一写成“名次/人数”；位比只保留“前 x%”中的数字。\n' +
      '3. 所有缺失字段统一填写半角短横线“-”；成对字段也要保留斜杠，例如“50/-”“120/-”，不要省略斜杠或用后面的数字补全。\n' +
      '4. 如果原文只有一个成绩或一组“成绩/满分”，默认填写在“最终分（赋分后）”；只有明确出现原始分时才填写原始分。\n' +
      '5. 排名不要机械依赖固定字段名，也不要要求标签必须和“年排/班排”完全一致：请结合成绩单表头、分组、相邻行和同一科目的语义判断。校次/校排/校排名/学校名次按年排整理；年排/年级排名也按年排整理；班次/班排/班级排名按班排整理；联考名次/联考排名属于多个学校或联考范围，目前不参考，统一填“-”，不要把它当成年排或班排。总分排名必须单独放在“总分...”行，不能复制某一科的排名。\n' +
      '6. 只输出整理后的纯文本，不要输出 Markdown、代码块或解释。\n\n' +
      '输出格式：\n' +
      '考试名称：-\n' +
      '考试日期：-\n' +
      '结束日期：-\n' +
      '年级：-\n' +
      '总分年排：名次/-\n' +
      '总分班排：名次/-\n' +
      '总分年位比：前 x%\n' +
      '总分班位比：前 x%\n' +
      '最终总分：-\n' +
      '原始总分：-\n' +
      '市排名：名次/-\n' +
      '区排名：名次/-\n' +
      '隐藏：是/否\n' +
      '语文：目标：-，原始分：原始分/原始满分，最终分（赋分后）：最终分/最终满分，年排：名次/-，班排：名次/-，年级位比：前 x%，班级位比：前 x%\n' +
      '数学：目标：-，原始分：原始分/原始满分，最终分（赋分后）：最终分/最终满分，年排：名次/-，班排：名次/-，年级位比：前 x%，班级位比：前 x%\n' +
      '（继续列出原文中出现的其他科目或组合；缺失字段统一写“-”）\n\n' +
      '待整理内容：\n';
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) {}
    try {
      var helper = document.createElement('textarea');
      helper.value = value;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      var copied = document.execCommand('copy');
      helper.remove();
      return copied;
    } catch (e) {
      return false;
    }
  }

  function openQuickEntry(modal) {
    trackUsage('quick_entry_opened', { source: 'exam_modal' });
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop nl-entry-backdrop';
    backdrop.innerHTML =
      '<div class="modal nl-entry-modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><div><h3>快速录入</h3><p class="nl-entry-subtitle">选择识别方式，识别后回填到原来的录入表</p></div><button class="close-btn" type="button" aria-label="关闭">×</button></div>' +
      '<div class="nl-entry-tabs" role="tablist" aria-label="快速录入方式">' +
      '<button type="button" class="nl-entry-tab is-active" data-entry-tab="image" role="tab" aria-selected="true">拍照录入</button>' +
      '<button type="button" class="nl-entry-tab" data-entry-tab="text" role="tab" aria-selected="false">自然语言录入</button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<section class="nl-entry-pane nl-entry-image-pane is-active" data-entry-pane="image">' +
      '<div class="nl-entry-upload-card"><label class="nl-entry-file-button"><span>选择成绩单图片</span><small>支持多选，最多 6 张</small><input class="nl-entry-files" type="file" accept="image/*" multiple></label><p>可按成绩单顺序选择多张截图，系统会合并识别同一次考试。</p></div>' +
      '<div class="nl-entry-image-list" aria-live="polite"><span class="nl-entry-empty">还没有选择图片</span></div>' +
      '<p class="nl-entry-vision-note">图片会发送到管理员配置的识图模型处理；系统不保存原图。</p>' +
      '<div class="nl-entry-progress" hidden aria-live="polite"><div class="nl-entry-progress-head"><span>识别进度</span><strong class="nl-entry-elapsed">0.0s</strong></div><ol class="nl-entry-progress-steps"><li class="nl-entry-progress-step" data-progress-step="0"><span class="nl-entry-progress-dot">1</span><span>读取并压缩图片</span></li><li class="nl-entry-progress-step" data-progress-step="1"><span class="nl-entry-progress-dot">2</span><span>发送图片与请求</span></li><li class="nl-entry-progress-step" data-progress-step="2"><span class="nl-entry-progress-dot">3</span><span>等待 AI 识别</span></li><li class="nl-entry-progress-step" data-progress-step="3"><span class="nl-entry-progress-dot">4</span><span>整理可编辑结果</span></li></ol></div>' +
      '<p class="nl-entry-vision-edit-hint" hidden>识别结果可直接编辑，确认无误后再点击“确认并填入”。</p>' +
      '<textarea class="nl-entry-vision-output" aria-label="识别结果，可编辑" spellcheck="false" hidden></textarea>' +
      '<div class="modal-actions"><button class="primary nl-entry-vision-submit" type="button" disabled>识别图片</button></div>' +
      '</section>' +
      '<section class="nl-entry-pane nl-entry-text-pane" data-entry-pane="text" hidden>' +
      '<textarea class="nl-entry-text" aria-label="快速录入内容" spellcheck="false" placeholder="例如：\n考试名称：高一上学期期中考试\n考试日期：2026-09-20\n年级：高一\n语文：目标120，原始112/150，最终112/150，年排36/620，班排8/45\n数学：目标135，真实128/150\n总分年排：36/620，班排：8/45"></textarea>' +
      '<p class="nl-entry-help">支持考试名称、日期、年级、结束日期、各科目标 / 原始分 / 最终分（赋分后） / 满分 / 年排 / 班排 / 位比、市区排名、总分和图表显示状态。只有一个成绩时默认填入最终分。<br><strong>你也可以复制下面的提示词，并将它和成绩单截图一起发给豆包等 AI，整理后再粘贴回来。</strong></p>' +
      '<details class="nl-entry-prompt"><summary>给 AI 的识别提示词（可复制） <span>点击展开并复制</span></summary><div class="nl-entry-prompt-box"><pre class="nl-entry-prompt-text"></pre><button class="secondary nl-entry-copy" type="button">复制提示词</button></div></details>' +
      '<div class="modal-actions"><button class="primary nl-entry-submit" type="button">识别并填入</button></div>' +
      '</section>' +
      '<div class="nl-entry-error" role="status"></div>' +
      '<div class="modal-actions nl-entry-footer-actions"><button class="secondary nl-entry-cancel" type="button">取消</button></div>' +
      '</div></div>';

    document.body.appendChild(backdrop);
    var closeButton = backdrop.querySelector('.close-btn');
    var cancelButton = backdrop.querySelector('.nl-entry-cancel');
    var submitButton = backdrop.querySelector('.nl-entry-submit');
    var visionSubmitButton = backdrop.querySelector('.nl-entry-vision-submit');
    var textarea = backdrop.querySelector('.nl-entry-text');
    var error = backdrop.querySelector('.nl-entry-error');
    var fileInput = backdrop.querySelector('.nl-entry-files');
    var imageList = backdrop.querySelector('.nl-entry-image-list');
    var visionOutput = backdrop.querySelector('.nl-entry-vision-output');
    var visionEditHint = backdrop.querySelector('.nl-entry-vision-edit-hint');
    var visionProgress = backdrop.querySelector('.nl-entry-progress');
    var visionElapsed = backdrop.querySelector('.nl-entry-elapsed');
    var visionSteps = Array.prototype.slice.call(backdrop.querySelectorAll('[data-progress-step]'));
    var visionTimer = null;
    var visionStartedAt = 0;
    var visionProgressStep = 0;
    var promptText = aiPromptText();
    var promptBox = backdrop.querySelector('.nl-entry-prompt-text');
    var copyButton = backdrop.querySelector('.nl-entry-copy');
    var selectedFiles = [];
    var visionText = '';
    var visionPayload = null;

    if (promptBox) promptBox.textContent = promptText;
    if (copyButton) copyButton.onclick = async function () {
      var copied = await copyText(promptText);
      trackUsage('quick_entry_prompt_copied', { copied: copied });
      copyButton.textContent = copied ? '已复制' : '复制失败，请手动选择';
      setTimeout(function () { copyButton.textContent = '复制提示词'; }, 1600);
    };

    function close() {
      if (visionTimer) {
        clearInterval(visionTimer);
        visionTimer = null;
      }
      backdrop.remove();
    }
    function elapsedText() {
      return ((Math.max(0, Date.now() - visionStartedAt)) / 1000).toFixed(1) + 's';
    }
    function updateVisionProgress(step, completed, failed) {
      visionProgressStep = step;
      if (visionProgress) visionProgress.hidden = false;
      visionSteps.forEach(function (item, index) {
        item.classList.toggle('is-done', completed || index < step);
        item.classList.toggle('is-active', !completed && !failed && index === step);
        item.classList.toggle('is-error', !!failed && index === step);
      });
      if (visionElapsed) visionElapsed.textContent = elapsedText();
    }
    function startVisionProgress() {
      if (visionTimer) clearInterval(visionTimer);
      visionStartedAt = Date.now();
      visionProgressStep = 0;
      if (visionProgress) {
        visionProgress.hidden = false;
        visionProgress.classList.remove('is-complete', 'has-error');
      }
      updateVisionProgress(0, false, false);
      visionTimer = setInterval(function () {
        if (visionElapsed) visionElapsed.textContent = elapsedText();
      }, 100);
    }
    function setVisionProgress(step) {
      updateVisionProgress(step, false, false);
    }
    function finishVisionProgress(success) {
      if (visionTimer) {
        clearInterval(visionTimer);
        visionTimer = null;
      }
      updateVisionProgress(visionProgressStep, success, !success);
      if (visionProgress) {
        visionProgress.classList.toggle('is-complete', success);
        visionProgress.classList.toggle('has-error', !success);
      }
    }
    function resetVisionProgress() {
      if (visionTimer) {
        clearInterval(visionTimer);
        visionTimer = null;
      }
      visionStartedAt = 0;
      visionProgressStep = 0;
      if (visionProgress) {
        visionProgress.hidden = true;
        visionProgress.classList.remove('is-complete', 'has-error');
      }
      visionSteps.forEach(function (item) {
        item.classList.remove('is-done', 'is-active', 'is-error');
      });
      if (visionElapsed) visionElapsed.textContent = '0.0s';
      if (visionEditHint) visionEditHint.hidden = true;
    }
    function clearError() { error.textContent = ''; }
    closeButton.onclick = close;
    cancelButton.onclick = close;
    backdrop.onclick = function (event) { if (event.target === backdrop) close(); };

    function setTab(name) {
      backdrop.querySelectorAll('[data-entry-tab]').forEach(function (tab) {
        var active = tab.dataset.entryTab === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      backdrop.querySelectorAll('[data-entry-pane]').forEach(function (pane) {
        var active = pane.dataset.entryPane === name;
        pane.classList.toggle('is-active', active);
        pane.hidden = !active;
      });
      trackUsage('quick_entry_mode_changed', { mode: name });
      clearError();
      if (name === 'text') textarea.focus();
    }
    backdrop.querySelectorAll('[data-entry-tab]').forEach(function (tab) {
      tab.onclick = function () { setTab(tab.dataset.entryTab); };
    });

    function renderFiles() {
      imageList.innerHTML = '';
      if (!selectedFiles.length) {
        imageList.innerHTML = '<span class="nl-entry-empty">还没有选择图片</span>';
        visionSubmitButton.disabled = true;
        return;
      }
      selectedFiles.forEach(function (file, index) {
        var row = document.createElement('div');
        row.className = 'nl-entry-image-item';
        row.innerHTML = '<span class="nl-entry-image-index">' + (index + 1) + '</span><span class="nl-entry-image-name"></span><button type="button" class="nl-entry-image-remove" aria-label="移除图片">×</button>';
        row.querySelector('.nl-entry-image-name').textContent = file.name || ('图片 ' + (index + 1));
        row.querySelector('.nl-entry-image-remove').onclick = function () {
          selectedFiles.splice(index, 1);
          visionText = '';
          visionPayload = null;
          visionOutput.hidden = true;
          visionOutput.value = '';
          resetVisionProgress();
          visionSubmitButton.textContent = '识别图片';
          renderFiles();
        };
        imageList.appendChild(row);
      });
      visionSubmitButton.disabled = false;
    }
    fileInput.onchange = function () {
      var incoming = Array.prototype.slice.call(fileInput.files || []).filter(function (file) {
        return /^image\//i.test(file.type);
      });
      var allowed = Math.max(0, 6 - selectedFiles.length);
      selectedFiles = selectedFiles.concat(incoming.slice(0, allowed));
      if (incoming.length > allowed) error.textContent = '最多选择 6 张图片。';
      else clearError();
      visionText = '';
      visionPayload = null;
      visionOutput.hidden = true;
      visionOutput.value = '';
      resetVisionProgress();
      visionSubmitButton.textContent = '识别图片';
      fileInput.value = '';
      renderFiles();
      trackUsage('quick_entry_images_selected', { image_count: selectedFiles.length });
    };

    function fileDataUrl(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(new Error('读取图片失败')); };
        reader.readAsDataURL(file);
      });
    }
    function compactImage(dataUrl) {
      return new Promise(function (resolve) {
        var image = new Image();
        image.onload = function () {
          var maxSide = 1800;
          var scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
          canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
          var context = canvas.getContext('2d');
          if (!context) { resolve(dataUrl); return; }
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          try { resolve(canvas.toDataURL('image/jpeg', 0.84)); } catch (e) { resolve(dataUrl); }
        };
        image.onerror = function () { resolve(dataUrl); };
        image.src = dataUrl;
      });
    }
    function visionContext() {
      var grade = modal.querySelector('#gradeLevelV14');
      var classificationOptions = grade
        ? Array.prototype.map.call(grade.options || [], function (option) { return option.textContent.trim(); }).filter(Boolean)
        : [];
      return { classificationOptions: classificationOptions, subjectNames: modalSubjectNames(modal) };
    }
    async function callVision(images) {
      var token = localStorage.getItem('st_token') || '';
      if (!token) {
        var authError = new Error('请先登录后再使用拍照录入。（HTTP 401）');
        authError.requestStatus = 401;
        authError.upstreamStatus = 0;
        throw authError;
      }
      var response;
      try {
        response = await fetch('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-vision-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, images: images, context: visionContext(modal) })
        });
      } catch (cause) {
        var networkError = new Error('无法连接识别服务，请检查网络后重试。');
        networkError.requestStatus = 0;
        networkError.upstreamStatus = 0;
        networkError.upstreamMessage = cause && cause.message ? String(cause.message).slice(0, 180) : '';
        throw networkError;
      }
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        var requestStatus = Number(response.status || 0);
        var upstreamStatus = Number(payload.upstream_status || requestStatus || 0);
        var detail = payload.upstream_message ? String(payload.upstream_message).slice(0, 180) : '';
        var retryAfter = Number(payload.retry_after_seconds || 0);
        if (!detail && retryAfter > 0) detail = '约 ' + retryAfter + ' 秒后可重试';
        var label = payload.error || '识图服务暂时不可用';
        var suffix = '（HTTP ' + (upstreamStatus || requestStatus || 0) + (detail ? '：' + detail : '') + '）';
        var serviceError = new Error(String(label) + suffix);
        serviceError.requestStatus = requestStatus;
        serviceError.upstreamStatus = upstreamStatus;
        serviceError.upstreamMessage = detail;
        throw serviceError;
      }
      return payload;
    }
    function visionFailureMeta(error) {
      return {
        image_count: selectedFiles.length,
        error_count: 1,
        request_status: Number(error && (error.requestStatus || error.status) || 0),
        upstream_status: Number(error && error.upstreamStatus || 0),
        error_message: String(error && error.message || '识图失败').slice(0, 240)
      };
    }
    function displayValue(value) {
      return value === null || value === undefined || value === '' ? '-' : String(value);
    }
    function displayPair(value, total) {
      return value === null || value === undefined || value === '' ? '-' : displayValue(value) + '/' + displayValue(total);
    }
    function visionToText(payload) {
      var exam = payload && payload.exam || {};
      var lines = [
        '考试名称：' + displayValue(exam.name),
        '考试日期：' + displayValue(exam.date),
        '结束日期：-',
        '年级：' + displayValue(exam.category),
        '总分年排：' + displayPair(exam.yearRank, exam.yearParticipants),
        '总分班排：' + displayPair(exam.classRank, exam.classParticipants),
        '总分年位比：-',
        '总分班位比：-',
        '最终总分：' + displayValue(exam.finalTotal),
        '原始总分：' + displayValue(exam.rawTotal),
        '市排名：-',
        '区排名：-',
        '隐藏：-'
      ];
      (payload && Array.isArray(payload.subjects) ? payload.subjects : []).forEach(function (subject) {
        var finalScore = subject.finalScore;
        if ((finalScore === null || finalScore === undefined || finalScore === '') && subject.ambiguousScore !== null && subject.ambiguousScore !== undefined) {
          finalScore = subject.ambiguousScore;
        }
        lines.push(
          displayValue(subject.name) + '：目标：' + displayValue(subject.target) +
          '，原始分：' + displayPair(subject.rawScore, subject.rawMax) +
          '，最终分（赋分后）：' + displayPair(finalScore, subject.finalMax) +
          '，年排：' + displayPair(subject.yearRank, subject.yearParticipants) +
          '，班排：' + displayPair(subject.classRank, subject.classParticipants)
        );
      });
      return lines.join('\n');
    }
    async function encodeImages() {
      var images = [];
      for (var i = 0; i < selectedFiles.length; i += 1) {
        var source = await fileDataUrl(selectedFiles[i]);
        images.push(await compactImage(source));
      }
      return images;
    }
    async function applyVisionResult() {
      if (visionOutput && !visionOutput.hidden) visionText = visionOutput.value;
      var parsed = parseInput(visionText, modal);
      if (parsed.errors.length) {
        error.textContent = parsed.errors.join(' ');
        return;
      }
      parsed.warnings = (visionPayload && Array.isArray(visionPayload.warnings) ? visionPayload.warnings : []).slice(0, 5);
      visionSubmitButton.disabled = true;
      visionSubmitButton.textContent = '正在填入…';
      try {
        var count = await applyResult(modal, parsed);
        trackUsage('quick_entry_image_recognition_succeeded', { image_count: selectedFiles.length, field_count: parsed.fieldCount, applied_count: count });
        close();
        showResult(modal, parsed, count);
        if (typeof toast === 'function') toast('图片已识别并回填，请检查后保存');
      } catch (e) {
        trackUsage('quick_entry_image_recognition_failed', visionFailureMeta(e));
        error.textContent = '回填失败：' + (e.message || '请稍后重试');
        visionSubmitButton.disabled = false;
        visionSubmitButton.textContent = '确认并填入';
      }
    }
    visionSubmitButton.onclick = async function () {
      clearError();
      if (visionOutput && !visionOutput.hidden) {
        visionText = visionOutput.value;
        await applyVisionResult();
        return;
      }
      if (visionText) {
        await applyVisionResult();
        return;
      }
      if (!selectedFiles.length) {
        error.textContent = '请先选择至少 1 张成绩单图片。';
        return;
      }
      visionSubmitButton.disabled = true;
      visionSubmitButton.textContent = '识别中…';
      startVisionProgress();
      trackUsage('quick_entry_image_recognition_started', { image_count: selectedFiles.length });
      try {
        setVisionProgress(0);
        var images = await encodeImages();
        setVisionProgress(1);
        setVisionProgress(2);
        visionPayload = await callVision(images);
        setVisionProgress(3);
        visionText = visionToText(visionPayload);
        visionOutput.value = visionText;
        visionOutput.hidden = false;
        if (visionEditHint) visionEditHint.hidden = false;
        finishVisionProgress(true);
        visionSubmitButton.disabled = false;
        visionSubmitButton.textContent = '确认并填入';
      } catch (e) {
        finishVisionProgress(false);
        trackUsage('quick_entry_image_recognition_failed', visionFailureMeta(e));
        error.textContent = e.message || '识图失败，请稍后重试。';
        visionSubmitButton.disabled = false;
        visionSubmitButton.textContent = '识别图片';
      }
    };

    submitButton.onclick = async function () {
      clearError();
      var inputChars = textarea.value.trim().length;
      trackUsage('quick_entry_natural_recognition_started', { input_chars: inputChars });
      var parsed = parseInput(textarea.value, modal);
      if (parsed.errors.length) {
        trackUsage('quick_entry_natural_recognition_failed', { error_count: parsed.errors.length, input_chars: inputChars });
        error.textContent = parsed.errors.join(' ');
        return;
      }
      submitButton.disabled = true;
      submitButton.textContent = '识别中…';
      try {
        var count = await applyResult(modal, parsed);
        trackUsage('quick_entry_natural_recognition_succeeded', { field_count: parsed.fieldCount, applied_count: count, rank_mode: parsed.rankMode || 'none' });
        close();
        showResult(modal, parsed, count);
        if (typeof toast === 'function') toast('已回填，请检查后保存');
      } catch (e) {
        trackUsage('quick_entry_natural_recognition_failed', { error_count: 1, input_chars: inputChars });
        error.textContent = '回填失败：' + (e.message || '请稍后重试');
        submitButton.disabled = false;
        submitButton.textContent = '识别并填入';
      }
    };
    renderFiles();
    setTab('image');
  }

  function decorateModal(modal) {
    if (!modal || modal.dataset.nlEntryReady === '1') return;
    modal.dataset.nlEntryReady = '1';
    var head = modal.querySelector('.modal-head');
    var title = head && head.querySelector('h3');
    var close = head && head.querySelector('.close-btn');
    if (!head || !title) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary nl-entry-trigger';
    button.textContent = '快速录入';
    button.title = '用一段话填入考试信息和成绩';
    button.onclick = function () { openQuickEntry(modal); };
    if (close) head.insertBefore(button, close);
    else head.appendChild(button);
  }

  var style = document.createElement('style');
  style.id = 'student-natural-entry-style';
  style.textContent = [
    '.modal-head{gap:10px}',
    '.modal-head>h3,.modal-head>div:first-child{min-width:0}',
    '.nl-entry-trigger{margin-left:auto;white-space:nowrap;padding:8px 12px;font-size:11px;font-weight:700;color:#fff!important;background:linear-gradient(135deg,var(--accent,#5d72e8),#7c6ee8)!important;border:1px solid transparent!important;box-shadow:0 5px 14px rgba(93,114,232,.2);transition:transform .15s,box-shadow .15s,filter .15s}',
    '.nl-entry-trigger:hover{filter:brightness(1.04);box-shadow:0 7px 17px rgba(93,114,232,.26)}',
    '.nl-entry-trigger:active{transform:translateY(1px)}',
    '.nl-entry-backdrop{z-index:250;background:rgba(22,28,39,.52)}',
    '.nl-entry-modal{width:min(650px,100%);max-height:min(88vh,820px)}',
    '.nl-entry-subtitle{margin:4px 0 0;color:var(--muted,#788392);font-size:11px;line-height:1.5}',

    '.nl-entry-tabs{display:flex;gap:8px;padding:12px 14px 0;border-bottom:1px solid var(--line,#e8ebf0)}',
    '.nl-entry-tab{flex:1;border:1px solid var(--line,#e8ebf0);border-bottom:0;border-radius:12px 12px 0 0;background:var(--cell,#f7f9fc);color:var(--muted,#788392);padding:9px 10px;font-size:12px;font-weight:700;cursor:pointer}',
    '.nl-entry-tab.is-active{background:var(--panel-solid,#fff);color:var(--accent,#5d72e8);border-color:#98a6f2;box-shadow:0 -2px 0 #98a6f2 inset}',
    '.nl-entry-pane{padding-top:2px}',
    '.nl-entry-upload-card{border:1px dashed #9aa9ec;border-radius:14px;background:linear-gradient(135deg,#f6f7ff,#fbfcff);padding:18px;text-align:center}',
    '.nl-entry-file-button{display:inline-flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;color:var(--accent,#5d72e8);font-weight:750;font-size:13px}',
    '.nl-entry-file-button small{font-size:10px;color:var(--muted,#788392);font-weight:500}',
    '.nl-entry-files{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}',
    '.nl-entry-upload-card p{margin:10px 0 0;color:var(--muted,#788392);font-size:11px;line-height:1.55}',
    '.nl-entry-image-list{display:grid;gap:7px;margin-top:12px}',
    '.nl-entry-empty{display:block;padding:14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;color:var(--muted,#788392);font-size:11px;text-align:center}',
    '.nl-entry-image-item{display:flex;align-items:center;gap:8px;border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:7px 9px;background:var(--panel-solid,#fff);font-size:11px}',
    '.nl-entry-image-index{display:grid;place-items:center;width:20px;height:20px;border-radius:7px;background:#eef0ff;color:var(--accent,#5d72e8);font-weight:750;flex:none}',
    '.nl-entry-image-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text,#18212f)}',
    '.nl-entry-image-remove{border:0;background:transparent;color:var(--muted,#788392);font-size:16px;line-height:1;padding:2px 5px;cursor:pointer}',
    '.nl-entry-vision-note{font-size:10.5px;line-height:1.55;color:var(--muted,#788392);margin:10px 2px 0}',
    '.nl-entry-progress{margin:12px 0 0;border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:11px 12px;background:var(--cell,#f7f9fc)}',
    '.nl-entry-progress-head{display:flex;align-items:center;justify-content:space-between;color:var(--muted,#788392);font-size:11px;font-weight:700}',
    '.nl-entry-elapsed{color:var(--accent,#5d72e8);font-variant-numeric:tabular-nums}',
    '.nl-entry-progress-steps{list-style:none;margin:9px 0 0;padding:0;display:grid;gap:6px}',
    '.nl-entry-progress-step{display:flex;align-items:center;gap:8px;color:var(--muted,#788392);font-size:10.5px;line-height:1.35}',
    '.nl-entry-progress-dot{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--line,#e8ebf0);border-radius:50%;background:var(--panel-solid,#fff);font-size:9px;font-weight:800;flex:0 0 auto}',
    '.nl-entry-progress-step.is-active{color:var(--accent,#5d72e8);font-weight:700}',
    '.nl-entry-progress-step.is-active .nl-entry-progress-dot{border-color:var(--accent,#5d72e8);box-shadow:0 0 0 3px rgba(93,114,232,.12)}',
    '.nl-entry-progress-step.is-done{color:var(--green,#32a77a)}',
    '.nl-entry-progress-step.is-done .nl-entry-progress-dot{border-color:var(--green,#32a77a);background:var(--green-soft,#e9f8f2);color:var(--green,#32a77a)}',
    '.nl-entry-progress-step.is-error{color:var(--danger,#d9534f)}',
    '.nl-entry-progress-step.is-error .nl-entry-progress-dot{border-color:var(--danger,#d9534f);background:var(--danger-soft,#fff0f0);color:var(--danger,#d9534f)}',
    '.nl-entry-progress.is-complete{border-color:#bfe8d5;background:var(--green-soft,#e9f8f2)}',
    '.nl-entry-progress.has-error{border-color:#f0c5c5;background:var(--danger-soft,#fff5f5)}',
    '.nl-entry-vision-edit-hint{font-size:10.5px;line-height:1.55;color:var(--muted,#788392);margin:10px 2px 0}',
    '.nl-entry-vision-output{display:block;width:100%;box-sizing:border-box;min-height:220px;max-height:360px;resize:vertical;overflow:auto;white-space:pre-wrap;margin:8px 0 0;border:1px solid #9aa9ec;border-radius:12px;padding:11px;background:#f5f8ff;color:#526174;font:11px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;outline:0}',
    '.nl-entry-vision-output:focus{border-color:var(--accent,#5d72e8);box-shadow:0 0 0 3px rgba(93,114,232,.12)}',
    '.nl-entry-footer-actions{margin-top:0}',
    '.nl-entry-text{display:block;width:100%;min-height:250px;box-sizing:border-box;resize:vertical;border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:13px 14px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:13px;line-height:1.7;outline:none}',
    '.nl-entry-text:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}',
    '.nl-entry-help{font-size:11px;line-height:1.65;color:var(--muted,#788392);margin:9px 2px 0}',
    '.nl-entry-help strong{display:block;margin-top:5px;color:var(--text,#18212f);font-weight:750;line-height:1.55}',
    '.nl-entry-prompt{margin-top:12px;border:1px solid var(--line,#e8ebf0);border-radius:12px;background:var(--cell,#f7f9fc);overflow:hidden}',
    '.nl-entry-prompt summary{cursor:pointer;padding:10px 12px;color:var(--text,#18212f);font-size:11.5px;font-weight:700}',
    '.nl-entry-prompt summary span{float:right;color:var(--muted,#788392);font-size:10.5px;font-weight:400}',
    '.nl-entry-prompt-box{padding:0 12px 12px}',
    '.nl-entry-prompt-text{max-height:220px;overflow:auto;white-space:pre-wrap;margin:0 0 9px;border:1px solid var(--line,#e8ebf0);border-radius:10px;padding:10px;background:var(--panel-solid,#fff);color:var(--muted,#596474);font:11px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}',
    '.nl-entry-copy{padding:7px 10px;font-size:11px}',
    '.nl-entry-error{min-height:18px;color:var(--danger,#d9534f);font-size:11.5px;line-height:1.6;margin:7px 2px 0}',
    '.nl-entry-result{border:1px solid #d9e3f3;background:#f5f8ff;color:#526174;border-radius:12px;padding:10px 12px;margin-bottom:13px;font-size:12px;line-height:1.65}',
    '.nl-entry-result b,.nl-entry-result span{display:block}',
    '.nl-entry-warning{color:#9a6a20;margin-top:3px}',
    '.nl-entry-filled{background:#f4f7ff!important;box-shadow:0 0 0 2px rgba(93,114,232,.16)!important;transition:background .2s,box-shadow .2s}',
    '@media(max-width:620px){.nl-entry-trigger{padding:7px 8px;font-size:10.5px}.nl-entry-modal{border-radius:18px}.nl-entry-text{min-height:230px}}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);

  window.__naturalEntryStudent = {
    parse: parseInput,
    apply: applyResult
  };

  if (typeof document === 'undefined' || typeof openExam !== 'function') return;

  var openExamBeforeNaturalEntry = openExam;
  openExam = function openExamWithNaturalEntry() {
    var result = openExamBeforeNaturalEntry.apply(this, arguments);
    decorateModal(state && state.modal ? state.modal : document.querySelector('.modal-backdrop'));
    return result;
  };
})();
