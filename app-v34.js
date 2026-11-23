/* app-v34.js · 学习状态预测界面
   挂载方式:不占一级导航;作为区块追加在现有「统计分析」页底部,
   用 MutationObserver 跟随统计页内部重渲染自愈。
   算法细节默认折叠(<details>),用户点开才展开 */
"use strict";
(function () {
  if (window.__v34main) return;
  window.__v34main = 1;

  var P2 = window.PAL2 || window.PAL;
  var C = P2.core;

  /* ---------- 基础 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function n34(v) { var x = typeof v === "string" ? parseFloat(v) : v; return (typeof x === "number" && isFinite(x)) ? x : null; }
  function track(ev, meta) { try { if (typeof window.__stTrack === "function") window.__stTrack(ev, meta || {}); } catch (e) { } }

  /* ---------- 数据适配(对齐 app-v32 字段口径) ---------- */
  function deepCfg(){return typeof state!=='undefined'&&state.sv31||{};}
  function globalDeepSubject(){var c=deepCfg();return c.subjModule?'__combo:'+c.subjModule:c.subjMod&&c.subjMod.length===1?c.subjMod[0]:'__total__';}
  function globalDeepLabel(){var k=globalDeepSubject();if(k==='__total__')return '总分';if(k.indexOf('__combo:')===0){var m=comboList().find(function(x){return String(x.id)===k.slice(8);});return m?m.name:'组合';}return k;}
  function syncDeepSubject(){if(!S.localSubject)S.cur=globalDeepSubject();}
  function prodExams() {
    try{var a=Array.isArray(state.allExams)?state.allExams:state.exams||[],c=S.fullHistory?'__all__':deepCfg().scope;return c&&c!=='__all__'?a.filter(function(e){return c==='__none__'?!e.grade_level:e.grade_level===c;}):a;}catch(e){return [];}
  }
  function obsTotal(exams) {
    var out = [];
    (exams || []).forEach(function (e) {
      if (e.is_hidden) return;
      var r = n34(e.total_rank), n = n34(e.total_participants);
      if (r === null || !n || r < 1) return;
      out.push({ rank: r, N: n, date: e.exam_date || "", label: e.name || "" });
    });
    return out;
  }
  function obsSubject(exams, subj) {
    var out = [];
    (exams || []).forEach(function (e) {
      if (e.is_hidden) return;
      var row = (e.scores || {})[subj];
      if (!row) return;
      var r = n34(row.rank);
      var n = n34(row.participants); if (n === null) n = n34(e.total_participants);
      if (r === null || !n || r < 1) return;
      var o = { rank: r, N: n, date: e.exam_date || "", label: e.name || "" };
      var a = n34(row.actual), m = n34(row.max);
      if (a !== null && m) { o.score = a; o.max = m; }
      out.push(o);
    });
    return out;
  }
  function subjectList(exams) {
    var seen = {}, out = [];
    (exams || []).forEach(function (e) {
      Object.keys(e.scores || {}).forEach(function (s) {
        if (!seen[s]) {
          var ok = obsSubject([e], s).length > 0;
          if (ok) { seen[s] = 1; out.push(s); }
        }
      });
    });
    return out;
  }

  /* ---------- 数学小件 ---------- */
  function probit(p) { /* Acklam 逆正态 */
    if (p <= 0) return -8; if (p >= 1) return 8;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
        b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
        c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
        d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00],
        pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* ---------- 影子日志 ---------- */
  var LS_SHADE = "st_deep_beta_log";
  function pushShadow(rec) {
    try {
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem(LS_SHADE) || "[]"); } catch (e) { }
      rec.t = Date.now();
      arr.push(rec);
      while (arr.length > 200) arr.shift();
      localStorage.setItem(LS_SHADE, JSON.stringify(arr));
    } catch (e) { }
  }

  /* ---------- 状态 ---------- */
  var S = { cur: "__total__", localSubject:false, fullHistory:false, goalPct: 20, distBin: 5, zmapBins: 20, view: "band" };
  var REP = null; /* 当前报告缓存,供交互处理器使用 */

  var PROD_ANALYSIS_OPTS = P2.productionOptions;
  function analyzeProd(obs) {
    return P2.pipeline.analyzeSeries(obs, PROD_ANALYSIS_OPTS);
  }

  /* ---------- 历史滚动预测回显 ---------- */
  function walkForward(obs) {
    var out = [];
    for (var k = 4; k < obs.length; k++) {
      try {
        var r = analyzeProd(obs.slice(0, k));
        if (!r || !r.valid || !r.nextExam) continue;
        var ne = r.nextExam;
        var act = obs[k].rank / obs[k].N * 100;
        out.push({ k: k, mid: ne.medianPercentile,
          lo: ne.ci95Percentile[0], hi: ne.ci95Percentile[1],
          act: act, inside: act >= ne.ci95Percentile[0] && act <= ne.ci95Percentile[1] });
      } catch (e) { }
    }
    return out;
  }

  /* ---------- 下场位置概率分布(视图:名次段 / 发挥标尺 / 累计) ---------- */
  function dViewChips() {
    var views = [
      { k: "band", t: "名次段" }, { k: "zmap", t: "发挥标尺" }, { k: "cum", t: "累计概率" }
    ];
    return '<select class="compact-select-v60" data-dsb-view-select aria-label="图表视图">'+views.map(function(v){return '<option value="'+v.k+'"'+(S.view===v.k?' selected':'')+'>'+v.t+'</option>';}).join('')+'</select>';
  }
  function dModeAndGoalMarks(rep, xOf, ihG) {
    /* 状态模型中心(中位)与目标的虚线标注 */
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;
    var out = "";
    if (md != null && md > 0.3 && md < 99.7) {
      var mx = xOf(md);
      out += '<line x1="' + mx.toFixed(1) + '" y1="4" x2="' + mx.toFixed(1) +
        '" y2="' + (20 + ihG) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
        '<text x="' + (mx + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">模型中心 前' +
        pct1(md) + '%</text>';
    }
    var gx = xOf(S.goalPct);
    out += '<line x1="' + gx.toFixed(1) + '" y1="4" x2="' + gx.toFixed(1) +
      '" y2="' + (20 + ihG) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
      '<text x="' + (gx + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
      S.goalPct + '%</text>';
    return out;
  }
  function distBlock(rep) {
    var pred = rep.filter.predictive;
    var W = 720, H = 158, padL = 30, padR = 10, padB = 18;
    var iw = W - padL - padR, ih = H - padB - 14;
    var view = S.view || "band";
    var bin = S.distBin || 5;
    var B = Math.round(100 / bin), bw = iw / B;
    var svg = "", caption = "";
    var zT = probit(1 - S.goalPct / 100);
    var pGoal = P2.dynamics.probReach(pred, zT);
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;

    if (view === "zmap") {
      /* 发挥标尺视图:横轴=标准分标尺,每根柱=相等的一段「发挥距离」,
         柱高=该发挥段命中概率 → 柱与柱完全可比,峰即最可能点 */
      var zTop = 4, zBot = -4, zRange = zTop - zBot;
      var NB = S.zmapBins || 20, zBin = zRange / NB;
      var xOfZ = function (z) { return padL + iw * (zTop - z) / zRange; };
      var xOfP = function (p) {
        var z = probit(1 - p / 100);
        return clampX(xOfZ(z));
      };
      function clampX(x) { return Math.max(padL, Math.min(padL + iw, x)); }
      var maxP2 = 0, zbars = [];
      for (var kz = 0; kz < NB; kz++) {
        var zA = zTop - kz * zBin, zB = zA - zBin; /* zA(高位) > zB(低位) */
        var pMass = Math.max(0, C.tCdf((zA - pred.location) / pred.scale, pred.df) -
          C.tCdf((zB - pred.location) / pred.scale, pred.df));
        zbars.push({ p: pMass, x0: xOfZ(zA), x1: xOfZ(zB) });
        if (pMass > maxP2) maxP2 = pMass;
      }
      var barsZ = "";
      var goalZ = probit(1 - S.goalPct / 100);
      for (kz = 0; kz < NB; kz++) {
        var hg = ih * (zbars[kz].p / (maxP2 || 1));
        var isGoal = zbars[kz].x1 >= xOfZ(goalZ) - .5; /* 柱的右侧(更好侧)达到目标线 */
        barsZ += '<rect x="' + (zbars[kz].x0 + .5).toFixed(1) + '" y="' + (20 + ih - hg).toFixed(1) +
          '" width="' + Math.max(zbars[kz].x1 - zbars[kz].x0 - 1, .8).toFixed(1) +
          '" height="' + Math.max(hg, .6).toFixed(1) +
          '" rx="1.5" fill="' + (isGoal ? '#4a90d9' : 'currentColor') +
          '" opacity="' + (isGoal ? '.6' : '.22') + '"/>';
        var pvZ = zbars[kz].p * 100;
        if (pvZ >= 3.5) barsZ += '<text x="' + ((zbars[kz].x0 + zbars[kz].x1) / 2).toFixed(1) +
          '" y="' + (16 + ih - hg).toFixed(1) + '" font-size="8" text-anchor="middle" ' +
          'fill="currentColor" opacity=".6">' + pvZ.toFixed(1) + '%</text>';
      }
      /* 名次刻度:按各自在"发挥标尺"上的真实位置标注 */
      var ticks = [0, 0.5, 1, 2.5, 5, 10, 20, 30, 50, 70, 90, 99.5, 100];
      var labelsZ = "", prevX = null;
      ticks.forEach(function (tk) {
        var px = xOfP(tk);
        if (px <= padL - .5 || px >= padL + iw + .5) return;
        if (prevX !== null && px - prevX < 12) { prevX = px; return; }
        prevX = px;
        labelsZ += '<text x="' + px.toFixed(1) + '" y="' + (H - 4) +
          '" font-size="8.2" text-anchor="middle" fill="currentColor" opacity=".45">前' +
          (tk < 1 ? String(tk) : Math.round(tk)) + '%</text>';
      });
      var mdX = md != null ? clampX(xOfP(md)) : null;
      var marksZ = "";
      if (mdX !== null) {
        marksZ += '<line x1="' + mdX.toFixed(1) + '" y1="4" x2="' + mdX.toFixed(1) +
          '" y2="' + (20 + ih) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
          '<text x="' + Math.min(mdX + 4, W - 90).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">模型中心 前' +
          pct1(md) + '%</text>';
      }
      var gxZ = clampX(xOfP(S.goalPct));
      marksZ += '<line x1="' + gxZ.toFixed(1) + '" y1="4" x2="' + gxZ.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
        '<text x="' + (gxZ + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
        S.goalPct + '%</text>';
      svg = barsZ + labelsZ + marksZ;
      caption = '横轴=「发挥距离」标尺：同样 2 个名次点，越靠前对应的发挥距离越大（名次刻度按真实位置标注）。' +
        '每根柱宽度 = <b>相等的一段发挥距离</b>，柱高 = 该发挥段的命中概率；柱与柱完全可比，' +
        '<span style="color:#4a90d9">最高柱=状态模型中心</span>。蓝色柱=达成目标前' + S.goalPct +
        '% 的区域。当前分为 <b>' + NB + ' 格</b>；调细只会显示更多局部起伏，不会改变预测结果';
    } else if (view === "cum") {
      /* 累计概率视图:曲线=「落到前X%以内」的总概率,直接读数 */
      var cumPts = "", cumY = [], midY = null;
      for (var cp = 0; cp <= 100; cp += 1) {
        var zC = probit(1 - cp / 100);
        var cum = 1 - C.tCdf((zC - pred.location) / pred.scale, pred.df);
        var cyY = 20 + ih - ih * Math.min(Math.max(cum, 0), 1);
        cumPts += (cp ? " L" : "M") + (padL + iw * cp / 100).toFixed(1) + "," + cyY.toFixed(1);
        cumY.push(cum);
      }
      var cumSvg = '<path d="' + cumPts + '" fill="none" stroke="#4a90d9" stroke-width="1.8" opacity=".9"/>';
      var gxCum = padL + iw * (S.goalPct / 100);
      var cumGoal = cumY[S.goalPct];
      var yGCum = 20 + ih - ih * cumGoal;
      var gxC = gxCum + 4;
      var marksCum =
        '<line x1="' + gxCum.toFixed(1) + '" y1="4" x2="' + gxCum.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.3" stroke-dasharray="4 3"/>' +
        '<line x1="' + gxCum.toFixed(1) + '" y1="' + yGCum.toFixed(1) + '" x2="' + (padL + iw + 30) +
        '" y2="' + yGCum.toFixed(1) + '" stroke="#d4574e" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>' +
        '<text x="' + gxC.toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' + S.goalPct +
        '% → ' + Math.round(cumGoal * 100) + '%</text>';
      if (md != null) {
        var mXC = padL + iw * md / 100;
        var y50 = 20 + ih - ih * 0.5;
        marksCum += '<line x1="' + mXC.toFixed(1) + '" y1="' + y50.toFixed(1) + '" x2="' + (padL + iw + 30) +
          '" y2="' + y50.toFixed(1) + '" stroke="#4a90d9" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>' +
          '<line x1="' + mXC.toFixed(1) + '" y1="4" x2="' + mXC.toFixed(1) + '" y2="' + (20 + ih) +
          '" stroke="#4a90d9" stroke-width="1.1" stroke-dasharray="3 3" opacity=".8"/>' +
          '<text x="' + (mXC + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">' +
          '曲线过半点 = 模型中心 前' + pct1(md) + '%</text>';
      }
      var labelsCum = "";
      [0, 10, 20, 25, 50, 75, 90, 100].forEach(function (tk) {
        labelsCum += '<text x="' + (padL + iw * tk / 100).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' + tk + '%</text>';
      });
      svg = cumSvg + labelsCum + marksCum;
      caption = '曲线 = 「落到前X%以内」的累计命中概率：在横轴找目标名次、沿竖线到曲线、再横着读概率（如考进前' + S.goalPct +
        '% ≈ <b>' + Math.round(cumGoal * 100) + '%</b>）。曲线爬过 50% 横线的点 = 状态模型中心（' + (md != null ? '前' + pct1(md) + '%' : '暂无') + '）。';
    } else {
      /* 名次段视图(默认):柱=该名次段命中概率,柱高=柱顶数字;蓝色密度曲线峰=最可能点 */
      var bars = "", labelsB = "", curve = "";
      var maxP = 0, probs = [], dens = [];
      for (var j = 0; j < B; j++) {
        var a = j * bin, b = a + bin;
        var za = probit(1 - b / 100), zb = probit(1 - a / 100);
        var zw = Math.max(zb - za, 1e-9);
        var p = Math.max(0, C.tCdf((zb - pred.location) / pred.scale, pred.df) -
          C.tCdf((za - pred.location) / pred.scale, pred.df));
        probs.push(p); dens.push({ d: p / zw, p: p });
        if (p > maxP) maxP = p;
      }
      var cs = 1, maxCd = 0, cys = [];
      for (var cj = 0; cj < 100 / cs; cj++) {
        var ca = cj * cs, cb = ca + cs;
        var cza = probit(1 - cb / 100), czb = probit(1 - ca / 100);
        var cw = Math.max(czb - cza, 1e-9);
        var cp2 = Math.max(0, C.tCdf((czb - pred.location) / pred.scale, pred.df) -
          C.tCdf((cza - pred.location) / pred.scale, pred.df));
        var cd = cp2 / cw;
        cys.push(cd);
        if (cd > maxCd) maxCd = cd;
      }
      for (cj = 0; cj < cys.length; cj++) {
        var cyy = 20 + ih - ih * (cys[cj] / (maxCd || 1));
        curve += (cj ? " L" : "M") + (padL + iw * ((cj * cs + cs / 2) / 100)).toFixed(1) + "," + cyy.toFixed(1);
      }
      var curveSvg = '<path d="' + curve + '" fill="none" stroke="#4a90d9" ' +
        'stroke-width="1.6" opacity=".85"/>';
      for (j = 0; j < B; j++) {
        var hgt = ih * (probs[j] / (maxP || 1));
        var bx = (padL + j * bw + 1).toFixed(1);
        bars += '<rect x="' + bx + '" y="' + (20 + ih - hgt).toFixed(1) +
          '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(hgt, .5).toFixed(1) +
          '" rx="2" fill="currentColor" opacity=".22"/>';
        var pv = probs[j] * 100;
        if (bw >= 22 || pv >= maxP * 100 * 0.35) {
          var txt = (pv >= 9.95 ? pv.toFixed(0) : pv.toFixed(1)) + "%";
          bars += '<text x="' + (padL + j * bw + bw / 2).toFixed(1) + '" y="' +
            (16 + ih - hgt).toFixed(1) + '" font-size="8.2" text-anchor="middle" ' +
            'fill="currentColor" opacity=".62">' + txt + "</text>";
        }
      }
      var stepLbl = Math.max(bin, 10);
      for (j = 0; j <= B; j += stepLbl / bin) {
        labelsB += '<text x="' + (padL + j * bw).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' +
          Math.round(j * bin) + '%</text>';
      }
      var xOfPct = function (p) { return padL + iw * p / 100; };
      svg = bars + curveSvg + labelsB + dModeAndGoalMarks(rep, xOfPct, ih);
      caption = '柱子 = 该名次段的命中概率（柱高=柱顶数字）；<b style="color:#4a90d9">蓝色曲线</b> = 状态模型概率密度，峰值对应<b>模型中心</b>（蓝色虚线处）。' +
        '命中前' + S.goalPct + '% 的概率 ≈ <b>' + Math.round(pGoal * 100) + '%</b>';
    }
    var binChips = view === "band"?'<select class="compact-select-v60" data-dsb-bin-select aria-label="名次段细度">'+[2,3,5,10].map(function(bn){return '<option value="'+bn+'"'+(bin===bn?' selected':'')+'>每格 '+bn+'%</option>';}).join('')+'</select>':"";
    var zBinChips = view === "zmap"
      ? [
        { n: 10, t: "较粗", tip: "10格，轮廓更平滑" },
        { n: 20, t: "标准", tip: "20格，兼顾轮廓和细节" },
        { n: 40, t: "较细", tip: "40格，显示更多局部细节" }
      ].map(function (opt) {
        return '<option value="'+opt.n+'"'+((S.zmapBins||20)===opt.n?' selected':'')+'>'+opt.t+'</option>';
      }).join('')
      : "";
    return '<div class="deep-chart-controls-v60">' + dViewChips() +
      (view === "band"?binChips:view === "zmap"?'<select class="compact-select-v60" data-dsb-zbins-select aria-label="发挥标尺细度">'+zBinChips+'</select>':'') +
      '</div>' +
      '<div class="dsb-scroll"><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      svg + "</svg></div>" +
      '<div class="dsb-fig-cap">' + caption + '</div>';
  }
  function renderDistInto() {
    var wrap = $("#dsbDistWrap");
    if (wrap && REP) wrap.innerHTML = distBlock(REP);
  }

  /* ---------- 格式化 ---------- */
  function pct1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function pct0(v) { return Math.round(v).toFixed(0); }
  function fs2(v) { return (v >= 0 ? "+" : "") + v.toFixed(2); }

  function details(title, bodyHtml, open) {
    return '<details' + (open ? ' open' : '') + ' style="margin-top:10px">' +
      '<summary style="cursor:pointer;font-size:13px;opacity:.72;user-select:none">' +
      title + '</summary>' +
      '<div style="padding:8px 2px 2px">' + bodyHtml + '</div></details>';
  }

  /* ---------- 卡片(全部收进 details 的算法区) ---------- */
  function trendDetails(rep) {
    var mk = rep.trend.mk;
    var senTxt = "";
    if (mk.valid && mk.senSlope != null) {
      senTxt = '；Sen 斜率 ' + fs2(mk.senSlope) + 'σ/场 [' + mk.senLo.toFixed(3) + ', ' + mk.senHi.toFixed(3) + ']';
    }
    var verdict = !mk.valid ? '场次不足' :
      mk.significant ? (mk.s > 0 ? '存在显著上升趋势' : '存在显著下降趋势') : '无统计显著趋势';
    return details('长期方向检验',
      '<div style="font-size:14px;font-weight:600">' + verdict + '</div>' +
      '<div style="font-size:12px;opacity:.75;margin-top:4px">Mann-Kendall 检验 p = ' +
      (mk.valid ? mk.p.toFixed(3) : '暂无') + '（α=0.05）' + senTxt +
      '<br>口径说明：「动量」是描述性规则；这里只陈述通过统计检验的结论。</div>');
  }

  function signalsDetails(rep) {
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var ev = rep.ewma || {};
    var evTxt = (ev.violations && ev.violations.length)
      ? '第 ' + ev.violations.map(function (v) { return v + 2; }).join('、') + ' 场出现连续偏移信号'
      : '无异动信号';
    var nInterv = rep.interventions.filter(Boolean).length;
    return details('突然变化与连续偏移',
      '<div style="font-size:13px;line-height:1.7">' +
      '近期体制变化概率：<b>' + cpLast.toFixed(2) + '</b>' +
      (cpLast > 0.5 ? '（偏高，最近的成绩结构可能已切换）' : '') +
      '；历史触发重估 ' + nInterv + ' 次<br>' +
      'EWMA 残差监测：' + evTxt + '</div>');
  }

  function difficultyDetails(rep) {
    var darr = rep.difficulty;
    if (!Array.isArray(darr) || !darr.length) return '';
    var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
    var ne2 = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
    return details('分数与排名是否一致',
      '<div style="font-size:13px;line-height:1.75">有 <b>' + nh +
      '</b> 场得分低于个人在相近排名下的通常水平，有 <b>' + ne2 +
      '</b> 场高于通常水平。这里只说明个人历史关系出现偏离，不判断试卷客观难易。</div>');
  }

  /* 第二层：只解释判断逻辑，不要求用户理解统计名词。 */
  function whyDetails(rep, obsN) {
    var mk = rep.trend.mk;
    var direction = !mk.valid || !mk.significant ? '暂未看出稳定的长期方向' :
      (mk.s > 0 ? '多场记录共同支持整体向好' : '多场记录共同支持整体回落');
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var shift = cpLast > 0.5 ? '近期可能出现了较明显的状态切换' : '近期没有发现明确的突然换挡';
    var ev = rep.ewma || {};
    var drift = ev.violations && ev.violations.length
      ? '连续几场的小幅偏移已经累积成提醒'
      : '连续小幅偏移尚未达到提醒条件';
    return details('为什么得到这些结论',
      '<div class="dsb-why-grid">' +
      '<div><b>先统一比较口径</b><span>不同参考人数的名次先换到同一把尺子上。</span></div>' +
      '<div><b>再降低偶发失常影响</b><span>单次异常不会直接被解释成长期进步或退步。</span></div>' +
      '<div><b>分别检查三类变化</b><span>' + esc(direction) + '；' + esc(shift) + '；' + esc(drift) + '。</span></div>' +
      '<div><b>最后给出参考范围</b><span>范围结合当前状态与近 ' + obsN +
      ' 场预测误差。它表达可能波动，不是成绩保证。</span></div>' +
      '</div>');
  }

  /* ---------- 计算过程:「计算收据」三层 ---------- */
  /* 第二层主体:用用户真实数据把整笔账算一遍 */
  function receiptInner(rep, obs) {
    var ne = rep.nextExam;
    var ewf = rep.ewmaForecast;
    var pred = rep.filter.predictive;
    var lastMu = rep.filter.mu[rep.filter.mu.length - 1];
    var effShift = pred.location - lastMu;
    var beta = rep.filter.beta[rep.filter.beta.length - 1];
    var weights = rep.filter.weights || [];
    var M = PAL2posToZ();
    /* 数据底表:最近最多6场 */
    var startI = Math.max(0, obs.length - 6);
    var rows = "";
    for (var i = startI; i < obs.length; i++) {
      var o = obs[i];
      var z = M ? M.positionToZ(o.rank, o.N).z : null;
      var w = weights[i] != null ? weights[i] : 1;
      var flag = w < 0.7 ? ' <span style="color:#d4574e;font-size:10px">异常降权</span>' : "";
      rows += '<tr>' +
        '<td style="padding:3px 8px;opacity:.8">#' + (i + 1) + '</td>' +
        '<td style="padding:3px 8px">前' + pct0(o.rank / o.N * 100) + '%（' + o.rank + '/' + o.N + '）</td>' +
        '<td style="padding:3px 8px">' + (z != null ? z.toFixed(2) : "暂无") + '</td>' +
        '<td style="padding:3px 8px">' + w.toFixed(2) + flag + '</td></tr>';
    }
    var dampNote = (Math.abs(beta) > 1e-9 && Math.abs(effShift - beta) > 1e-9)
      ? '原始势头 ' + fs2(beta) + '，历史证明势头不常延续，只采纳 → ' + fs2(effShift)
      : '采纳全部趋势 ' + fs2(beta);
    var stepStyle = 'font-size:12.5px;line-height:1.9';
    return '<div style="' + stepStyle + '">' +
      '<div style="font-weight:600;margin-bottom:4px">第 1 步 · 你的每场考试换算成标准分</div>' +
      '<table style="border-collapse:collapse;width:100%;font-size:12px">' +
      '<tr style="opacity:.55"><th style="text-align:left;padding:3px 8px">场次</th>' +
      '<th style="text-align:left;padding:3px 8px">位比</th>' +
      '<th style="text-align:left;padding:3px 8px">标准分 z</th>' +
      '<th style="text-align:left;padding:3px 8px">该场权重</th></tr>' + rows + "</table>" +
      '<div style="font-size:11px;opacity:.6;margin:2px 0 10px">权重低 = 这场被视为发挥失常/异常，几乎不影响后面的估计。</div>' +

      '<div style="font-weight:600;margin-top:10px">第 2 步 · 合成你的真实水平</div>' +
      '<div>加权稳定点 μ̂ = <b>' + lastMu.toFixed(2) + '</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 3 步 · 状态模型走到下一场</div>' +
      '<div>' + lastMu.toFixed(2) + ' <b>' + fs2(effShift) + '</b> = <b>' +
      pred.location.toFixed(2) + '</b>　<span style="font-size:11px;opacity:.65">' + dampNote + '</span></div>' +

      '<div style="font-weight:600;margin-top:10px">第 4 步 · 近期成绩单独做平滑参考</div>' +
      '<div>最近一场占 40%，更早记录逐渐衰减，得到 <b>前' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : '未知') + '%</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 5 步 · 定状态模型的波动范围</div>' +
      '<div>你平时的起伏 ±' + (pred.scaleRaw || pred.scale).toFixed(2) +
      (pred.conformalK != null ? '，按你历史误差放大 ×' + pred.conformalK.toFixed(2) +
        ' ⇒ ±<b>' + pred.scale.toFixed(2) + '</b>' : '') + '</div>' +

      '<div style="font-weight:600;margin-top:10px">第 6 步 · 分开阅读两个结果</div>' +
      '<div style="font-size:14px">近期平滑参考 <b>前' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : '未知') + '%</b>；状态模型参考范围 ' +
      '<b>[前' + pct0(ne.ci95Percentile[0]) + '%, 前' + pct0(ne.ci95Percentile[1]) + '%]</b></div>' +
      "</div>";
  }
  function PAL2posToZ() { return P2.measurement || null; }
  function calcDetails(rep, obs) {
    var inner = receiptInner(rep, obs);
    if (!inner) return '';
    var mth = 'font-family:Georgia,serif;font-style:italic';
    var l3 = details('方法与参数',
      '<div style="font-size:12px;line-height:2;opacity:.85">' +
      '· 点预测：EWMA Forecast 直接平滑原始位比，α=0.40，仅输出下一场参考点<br>' +
      '· 测量层：位比 <i style="' + mth + '">r/N</i> 经 Blom 分数 <span style="' + mth + '">z = Φ<sup>−1</sup>((r−0.375)/(N+0.25))</span> 嵌入；参考人数 SE 仅保留研究诊断，生产状态模型使用等权观测<br>' +
      '· 动态层：局部线性 DLM（折扣 <span style="' + mth + '">δ<sub>μ</sub>=0.96, δ<sub>β</sub>=0.90</span>），观测噪声 Student-t(<i style="' + mth + '">ν</i>=6) IRLS 稳健加权；σ²<sub>day</sub> 由一步残差 MAD 学习、六折计入预测<br>' +
      '· 变点层：BOCPD(NIG) 体制切换概率 &gt;0.5 且 MAP 游程≥5 时，下一场协方差膨胀干预 ×40<br>' +
      '· 趋势门控：原始 z 序列 MK 检验显著 → μ̂+0.7β，否则 φ=0<br>' +
      '· 历史残差校准：前向尺度参照残差取 Q95，no-SE 五折先验 K=4.54、收缩 W=4，除以 t<sub>0.975,6</sub> 换算标准尺度<br>' +
      '· 推断层：MK+Sen 主检验、EWMA Residual Monitor(λ=.3, L=2.815)、BH-FDR q=0.10 统一预算<br>' +
      '· 区间：t(df=6) 后验分位数</div>');
    return details('查看完整计算过程', inner + l3);
  }

  /* ---------- 默认可见区:预测主卡 ---------- */
  function mainCard(rep, obsN) {
    var ne = rep.nextExam;
    if (!ne) return '';
    var ewf = rep.ewmaForecast;
    return '<div class="dsb-summary-row">' +
      '<div class="dsb-summary-item"><div class="dsb-summary-label">下一场参考位置</div>' +
      '<div class="dsb-summary-value">前 ' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : pct1(ne.medianPercentile)) + '%</div>' +
      '<div class="dsb-summary-help">最近的考试影响更大，适合作为下一场的简单参考</div></div>' +
      '<div class="dsb-summary-item"><div class="dsb-summary-label">可能波动范围</div>' +
      '<div style="font-size:20px;font-weight:700">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</div>' +
      '<div class="dsb-summary-help">状态模型综合稳定水平、平时起伏和偶发失常</div></div>' +
      '<div class="dsb-summary-item dsb-goal-box">' +
      '<div class="dsb-summary-label">达到目标的参考把握</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<input id="dsbGoalPct" type="number" min="1" max="99" step="1" value="20" ' +
      'aria-label="目标年级位置，填写1到99" ' +
      'style="width:56px;padding:3px 8px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font-size:13px">' +
      '<button id="dsbGoalBtn" style="padding:4px 12px;font-size:12.5px;border-radius:8px;' +
      'border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer">查看把握</button>' +
      '<span id="dsbGoalOut" style="font-size:15px;font-weight:700"></span></div></div>' +
      '</div>' +
      '<div class="dsb-tip"><b>一句话理解：</b>近期成绩推算的参考点是<b>前 ' +
      (ewf && ewf.valid ? pct1(ewf.percentile) : pct1(ne.medianPercentile)) + '%</b>。考虑正常发挥起伏后，状态模型给出的参考范围是' +
      '<span style="color:#4a90d9">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</span>。参考点和范围来自不同方法，应分开阅读；它们都不是成绩保证。</div>';
  }

  /* ---------- 轨迹图(SVG):原始位比点 + 滤波带 + 预测扇区 + 历史预测回显 ---------- */
  function trajectorySvg(rep, obs, hist) {
    var W = 720, H = 220, padL = 34, padR = 86, padT = 12, padB = 22;
    var n = obs.length, futW = 46; /* 预测区宽度 */
    var iw = W - padL - padR, ih = H - padT - padB;
    var yOf = function (pct) { return padT + ih * (pct / 100); }; /* 前0%在顶 */
    var xOf = function (i) { return padL + iw * i / Math.max(n - 1, 1); };
    var pc = function (z) { return Math.max(0, Math.min(100, 100 * (1 - C.normCdf(z)))); };
    var pts = "", dots = "";
    obs.forEach(function (o, i) {
      pts += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(o.rank / o.N * 100).toFixed(1);
      dots += '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + yOf(o.rank / o.N * 100).toFixed(1) +
        '" r="2.6" fill="currentColor" opacity=".55"/>';
    });
    /* 滤波带:上边顺序 + 下边逆序,闭合为正规缎带(避免蝴蝶结自交割裂) */
    var bandUp = "", bandDn = "";
    rep.filter.mu.forEach(function (m, i) {
      bandUp += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(pc(rep.filter.hi[i])).toFixed(1);
    });
    for (var bi = rep.filter.mu.length - 1; bi >= 0; bi--) {
      bandDn += " L" + xOf(bi).toFixed(1) + "," + yOf(pc(rep.filter.lo[bi])).toFixed(1);
    }
    var band = '<path d="' + bandUp + bandDn + ' Z" fill="currentColor" opacity=".08"/>';
    var muPath = "";
    rep.filter.mu.forEach(function (m, i) {
      muPath += (i ? " L" : "M") + xOf(i).toFixed(1) + "," + yOf(pc(m)).toFixed(1);
    });
    /* 历史预测回显:竖须=当时95%预测区间;圆点=当时认为最可能的位置(中性蓝);
       判定色套在"实际结果"上——绿圈=实际落区间内,红叉=失手 */
    var histSvg = "", actMarks = "";
    (hist || []).forEach(function (h) {
      var x = xOf(h.k).toFixed(1), col = h.inside ? "#2e9e6b" : "#d4574e";
      histSvg += '<line x1="' + x + '" y1="' + yOf(h.lo).toFixed(1) +
        '" x2="' + x + '" y2="' + yOf(h.hi).toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.6" opacity=".9"/>' +
        '<circle cx="' + x + '" cy="' + yOf(h.mid).toFixed(1) +
        '" r="2.3" fill="#4a90d9"/>';
      var ax = xOf(h.k), ay = yOf(h.act);
      if (h.inside) {
        actMarks += '<circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) +
          '" r="4.6" fill="none" stroke="#2e9e6b" stroke-width="1.4" opacity=".85"/>';
      } else {
        var s = 3;
        actMarks += '<line x1="' + (ax - s).toFixed(1) + '" y1="' + (ay - s).toFixed(1) +
          '" x2="' + (ax + s).toFixed(1) + '" y2="' + (ay + s).toFixed(1) +
          '" stroke="#d4574e" stroke-width="1.6"/>' +
          '<line x1="' + (ax - s).toFixed(1) + '" y1="' + (ay + s).toFixed(1) +
          '" x2="' + (ax + s).toFixed(1) + '" y2="' + (ay - s).toFixed(1) +
          '" stroke="#d4574e" stroke-width="1.6"/>';
      }
    });
    /* 内联标注:第一次出现处直接点名,不靠底部图例 */
    var inlineLbl = "";
    if ((hist || []).length) {
      var hx = xOf(hist[0].k);
      inlineLbl = '<text x="' + (hx + 5).toFixed(1) + '" y="' + (padT + 9) +
        '" font-size="8.6" fill="#2e9e6b" opacity=".85">竖须=当时的预测区间</text>';
    }
    if (n >= 2) {
      inlineLbl += '<text x="' + (padL + 4) + '" y="' + (padT + ih - 4) +
        '" font-size="8.6" fill="currentColor" opacity=".45">阴影带=水平估计范围(非预测区间)</text>';
    }
    /* 预测扇区:按概率密度(每格概率÷该格换算宽度)分档着色,越接近最可能点越深 */
    var ne = rep.nextExam;
    var pred = rep.filter.predictive;
    var fx0 = xOf(n - 1), fx1 = xOf(n - 1) + futW, fw = futW - 4;
    var fanBins = 24, fanHtml = "";
    var yLo = Math.max(0.5, ne.ci95Percentile[0] - 8), yHi = Math.min(99.5, ne.ci95Percentile[1] + 8);
    var spanB = (yHi - yLo) / fanBins, maxPb = 0, probs2 = [], zw2 = [];
    for (var fb = 0; fb < fanBins; fb++) {
      var pa = yLo + fb * spanB, pb = pa + spanB;
      var za = probit(1 - pb / 100), zb = probit(1 - pa / 100);
      var zw = Math.max(zb - za, 1e-9);
      var pp = Math.max(0, C.tCdf((zb - pred.location) / pred.scale, pred.df) -
        C.tCdf((za - pred.location) / pred.scale, pred.df));
      probs2.push(pp); zw2.push(zw);
      var dd2 = pp / zw;
      if (dd2 > maxPb) maxPb = dd2;
    }
    for (fb = 0; fb < fanBins; fb++) {
      var rel = maxPb > 0 ? (probs2[fb] / zw2[fb]) / maxPb : 0;
      if (rel < 0.04) continue;
      var ya = padT + ih * ((yLo + fb * spanB) / 100);
      var yb = padT + ih * ((yLo + (fb + 1) * spanB) / 100);
      fanHtml += '<rect x="' + (fx0 + 3).toFixed(1) + '" y="' + ya.toFixed(1) +
        '" width="' + fw.toFixed(1) + '" height="' + Math.max(yb - ya, .6).toFixed(1) +
        '" fill="#4a90d9" opacity="' + (0.07 + 0.45 * rel).toFixed(3) + '"/>';
    }
    var fan = '<line x1="' + fx0.toFixed(1) + '" y1="' + yOf(ne.medianPercentile).toFixed(1) +
      '" x2="' + fx1.toFixed(1) + '" y2="' + yOf(ne.medianPercentile).toFixed(1) +
      '" stroke="#4a90d9" stroke-width="1.6" stroke-dasharray="5 4"/>' + fanHtml;
    var grid = "", lbl = "";
    [0, 25, 50, 75, 100].forEach(function (p) {
      grid += '<line x1="' + padL + '" y1="' + yOf(p) + '" x2="' + (padL + iw + futW) +
        '" y2="' + yOf(p) + '" stroke="currentColor" opacity=".07"/>';
      lbl += '<text x="' + (padL - 6) + '" y="' + (yOf(p) + 3.5) +
        '" font-size="9" text-anchor="end" fill="currentColor" opacity=".45">' + p + '</text>';
    });
    /* x 轴:真实考试名称(超长截断;考试多时每隔一场标一次,保持可读) */
    var xlbl = "";
    var xStep = n > 8 ? 2 : 1;
    for (var xi = 0; xi < n; xi += xStep) {
      var xnm = String(obs[xi].label || obs[xi].date || "").trim();
      if (xnm.length > 5) xnm = xnm.slice(0, 5) + "…";
      xlbl += '<text x="' + xOf(xi).toFixed(1) + '" y="' + (H - 6) +
        '" font-size="8.6" text-anchor="middle" fill="currentColor" opacity=".45">' +
        esc(xnm) + '</text>';
    }
    xlbl += '<text x="' + (fx1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="#4a90d9" opacity=".8">下场</text>';
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      grid + lbl + xlbl + band + histSvg +
      '<path d="' + muPath + '" fill="none" stroke="#4a90d9" stroke-width="2"/>' +
      '<path d="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/>' +
      dots + fan + actMarks + inlineLbl + "</svg>";
  }

  /* ---------- 洞察流(默认可见,≤3条,每条带依据标签) ---------- */
  function insightsList(rep, obsN) {
    var items = [];
    var mk = rep.trend.mk;
    if (mk.valid && mk.significant) {
      items.push(mk.s > 0
        ? "多场记录共同支持整体向好，不是只看最近一次成绩"
        : "多场记录共同支持整体回落，建议结合近期学习和考试情况查看");
    }
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    if (cpLast > 0.5) items.push("最近的表现可能出现了明显换挡，旧记录的参考价值正在下降");
    var ev = rep.ewma || {};
    if (ev.violations && ev.violations.length) {
      items.push("连续几场的小幅变化已经累积成提醒，建议关注是否存在持续原因");
    }
    var darr = rep.difficulty;
    if (Array.isArray(darr) && darr.length) {
      var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
      var nea = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
      if (nh) items.push("有 " + nh + " 场得分低于个人在相近排名下的通常水平，原因需要结合试卷和临场情况判断");
      if (nea) items.push("有 " + nea + " 场得分高于个人在相近排名下的通常水平");
    }
    if (!items.length) items.push("目前以正常波动为主，没有发现需要特别提醒的长期方向或连续异动");
    items.push("参考范围结合了近 " + obsN + " 场的历史误差；记录越少，范围通常越不稳定");
    return '<ul class="dsb-plain-insights">' +
      items.slice(0, 4).map(function (it) {
        return "<li>" + esc(it) + "</li>";
      }).join("") + "</ul>";
  }

  /* ---------- 组合(module)支持:下拉选组合,序列=成员科目位比中位数 ---------- */
  function comboList() {
    try { return ((typeof state !== 'undefined' && state.modulesV18) || []); } catch (e) { return []; }
  }
  /* 组合排名的取数:exam.moduleRanks(云端字段)优先,其次本机兜底缓存(与 v25 首页同一套数据源) */
  function moduleRanksForExam(e, modId) {
    if (!e || modId == null) return null;
    try {
      var mr = (e.moduleRanks && typeof e.moduleRanks === 'object' && Object.keys(e.moduleRanks).length)
        ? e.moduleRanks : null;
      if (mr && (mr[String(modId)] || mr[modId])) return mr[String(modId)] || mr[modId];
    } catch (err) { }
    try {
      var u = (typeof state !== 'undefined' && state.user && state.user.username) || 'anon';
      var cache = JSON.parse(localStorage.getItem('st_moduleranks_v25_' + u) || '{}');
      var row = cache[(e.exam_date || '') + '|' + (e.name || '')];
      if (row && typeof row === 'object') return row;
    } catch (err) { }
    return null;
  }
  /* 该场「计入总分的科目」与所选组合完全一致?(如六科组合且总分=这六科 → 总分排名即组合排名) */
  function examTotalMatchesCombo(e, set, selN) {
    if (!e || !set || !selN) return false;
    var n = 0, inc = 0;
    Object.keys(e.scores || {}).forEach(function (s) {
      var r = e.scores[s] || {};
      var has = n34(r.actual) != null || n34(r.target) != null ||
        n34(r.rank) != null || n34(r.classRank) != null;
      if (!has || r.excludeFromTotal) return;
      n++; if (set[s]) inc++;
    });
    return selN >= 2 && n === selN && inc === n;
  }
  /* 组合(module)口径:序列=用户在考试录入时为组合填写的「组合年排」(exam.moduleRanks)。
     没填排名的场次:若该场总分=组合(科目完全一致,如六科组合)则直接沿用总分排名;
     否则跳过,绝不拿成员科目位比中位数去合成年排/班排 */
  function obsCombo(exams, mod) {
    var out = [];
    var set = {}, selN = (mod && mod.subjects && mod.subjects.length) || 0;
    (mod && mod.subjects || []).forEach(function (s) { set[s] = 1; });
    (exams || []).forEach(function (e) {
      var mr = moduleRanksForExam(e, mod.id);
      if (mr) {
        var rk = n34(mr.yearRank), N = n34(mr.yearParticipants);
        if (rk == null || rk < 1) return;              /* 年排没填 → 该场不计入 */
        if (N == null) N = n34(e.total_participants);  /* 与全站一致:人数缺省时用该场总人数 */
        if (!N) return;
        out.push({ rank: rk, N: N, date: e.exam_date || '', label: e.name || '' });
        return;
      }
      if (examTotalMatchesCombo(e, set, selN)) {
        var rk2 = n34(e.total_rank), N2 = n34(e.total_participants);
        if (rk2 == null || rk2 < 1 || !N2) return;
        out.push({ rank: rk2, N: N2, date: e.exam_date || '', label: e.name || '' });
      }
    });
    return out;
  }
  function curCombo() {
    if (S.cur && S.cur.indexOf('__combo:') === 0) {
      var id = S.cur.slice(8);
      /* id 可能存成数字或字符串,统一按字符串比 */
      var hit = comboList().filter(function (m) { return String(m.id) === String(id); })[0];
      if (hit) return hit;
    }
    return null;
  }
  /* 统一 chip 样式(与全站 .chip 一致,主题可变) */
  function chipCls(on) { return 'chip' + (on ? ' active' : ''); }
  function comboChipsHtml(combo) {
    var mods = comboList();
    if (!mods.length) return '';
    return '<span class="label">组合：</span>' +
      (combo ? '<button type="button" class="chip" data-dsb-combo="__exit__">退出</button>' : '') +
      mods.map(function (m) {
        return '<button type="button" class="' + chipCls(combo && String(combo.id) === String(m.id)) +
          '" data-dsb-combo="' + esc(String(m.id)) + '" title="成员: ' +
          esc((m.subjects || []).join(' / ')) + '">' + esc(m.name) + '</button>';
      }).join('');
  }

  /* ---------- 总分口径检测:年级池 vs 组合/小池 ---------- */
  function totalCaliber(exams) {
    var ev = null;
    for (var i = exams.length - 1; i >= 0; i--) {
      if (!exams[i].is_hidden && n34(exams[i].total_participants)) { ev = exams[i]; break; }
    }
    if (!ev) return null;
    var tN = n34(ev.total_participants);
    var subNs = [];
    Object.keys(ev.scores || {}).forEach(function (s) {
      var row = ev.scores[s] || {};
      var n = n34(row.participants);
      if (n) subNs.push(n);
    });
    if (!subNs.length || !tN) return null;
    var maxS = Math.max.apply(null, subNs);
    /* 总分人数 ≥ 单科最大池的1.15倍 → 年级口径;否则疑似组合/分层口径 */
    return { totalN: tN, maxSubN: maxS,
      kind: tN >= maxS * 1.15 ? "grade" : "combo" };
  }

  /* ---------- 整个板块的 HTML(单一根节点,便于事件绑定与自愈挂载) ---------- */
  function sectionHtml(examsOverride) {
    syncDeepSubject();var exams = examsOverride || prodExams();
    var combo = curCombo();
    var obs = combo ? obsCombo(exams, combo)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));

    /* 学科 chips:按有效场数排序;不足4场的折叠置灰并说明原因 */
    var caliber = totalCaliber(exams);
    var totalLabel = '总分';
    if (caliber) totalLabel += caliber.kind === 'grade' ? ' · 年级口径' : ' · 组合口径?';
    var entries = Array.from(new Set(subjectList(exams).concat(typeof state!=='undefined'&&Array.isArray(state.allExams)?subjectList(state.allExams):[]))).map(function (s) {
      return { key: s, label: s, n: obsSubject(exams, s).length };
    }).sort(function (a, b) { return b.n - a.n; });
    var chipsOk = [{ key: '__total__', label: totalLabel, n: obsTotal(exams).length }]
      .concat(entries.filter(function (e) { return e.n >= 4; }));
    var chipsPoor = entries.filter(function (e) { return e.n < 4; });
    var chipBtn = function (e) {
      var act = !combo && S.cur === e.key;
      return '<button type="button" class="' + chipCls(act) + '" data-dsb-subj="' +
        esc(e.key) + '" title="' + esc(e.n + ' 场有效位比') + '">' +
        esc(e.label) + ' <span style="font-size:9.5px;opacity:.6">' + e.n + '</span></button>';
    };
    var chips = chipsOk.map(chipBtn).join('');
    if (chipsPoor.length) {
      chips += '<span style="font-size:10px;opacity:.45;white-space:nowrap">数据不足(需≥4场):</span>' +
        chipsPoor.map(function (e) {
          return '<button type="button" disabled title="仅 ' + e.n +
            ' 场有效位比，样本太少无法建模，且可能混有换池/旧数据干扰" class="chip" style="opacity:.32">' +
            esc(e.label) + ' <span style="font-size:9.5px">' + e.n + '</span></button>';
        }).join('');
    }
    var caliberNote = '';
    if (combo) {
      caliberNote = '<p class="dsb-caliber" style="margin:-4px 0 10px">当前口径：组合「<b>' +
        esc(combo.name) + '</b>」 · 序列=你为组合填写的「组合年排」；未填写时若该场总分=该组合（如六科组合），则沿用总分排名</p>';
    } else if (S.cur === '__total__' && caliber && caliber.kind === 'combo') {
      caliberNote = '<p class="dsb-caliber" style="margin:-4px 0 10px">' +
        '<b>注意：</b>总分参与人数(' + caliber.totalN + ') ≤ 单科最大池(' + caliber.maxSubN +
        ')，疑似<b>组合内排名</b>而非全年级。组合口径衡量你在同选科群体中的位置，与年级口径含义不同；' +
        '系统按录入原样分析，解读时注意口径。</p>';
    }

    var body;
    if (obs.length < 4) {
      body = '<div style="font-size:13px;opacity:.75;padding:6px 0 2px">' +
        (combo ? '组合「' + esc(combo.name) + '」没有填写过「组合年排」，' : '当前成绩') +
        '还需要至少 4 次有效排名。' +
        (combo ? '在考试录入弹窗为组合填写「组合年排名次/年级人数」后即可解锁。' : '') + '</div>';
    } else {
      var rep = analyzeProd(obs);
      if (!rep.valid) {
        body = '<div style="font-size:13px;opacity:.75">暂时没有足够的有效记录。</div>';
      } else {
        pushShadow({ subj: S.cur, n: obs.length,
          mid: +rep.nextExam.medianPercentile.toFixed(1),
          lo: +rep.nextExam.ci95Percentile[0].toFixed(1),
          hi: +rep.nextExam.ci95Percentile[1].toFixed(1),
          k: rep.filter.predictive.conformalK != null
            ? +rep.filter.predictive.conformalK.toFixed(2) : null });
        REP = rep;
        var hist = walkForward(obs);
        var hitN = hist.filter(function (h) { return h.inside; }).length;
        var histNote = hist.length
          ? '竖须=过去每场「当时的预测区间」（绿=实际落内、<span style="color:#d4574e">红叉</span>=失手，命中 ' +
            hitN + '/' + hist.length + '）· 竖须上蓝点=当时的状态模型中心 · '
          : '';
        var trajCap = '灰点=每场实际排名位置（<span style="color:#2e9e6b">绿圈</span>=落在当时预测区间内） · 蓝线=综合多场记录后的稳定水平 · ' +
          '阴影带=当前水平可能范围（<b>不是</b>下一场预测区间，下一场范围通常更宽） · ' +
          '右侧色阶扇区=状态模型的下场落点概率密度（越深越接近模型中心） · ' + histNote;
        body = '<div class="dsb-level-head"><b>近期表现</b></div>' +
          mainCard(rep, obs.length) +
          '<div class="dsb-block-title">本期提醒</div>' +
          insightsList(rep, obs.length) +
          '<div class="dsb-level-head"><b>变化与依据</b></div>' +
          whyDetails(rep, obs.length) +
          '<div class="dsb-fig" style="margin-top:14px"><div class="dsb-fig-title">排名轨迹与预测区间</div>' +
          '<div class="dsb-scroll">' + trajectorySvg(rep, obs, hist) + '</div>' +
          '<div class="dsb-fig-cap">' + trajCap + '</div></div>' +
          '<div class="dsb-fig" style="margin-top:12px"><div class="dsb-fig-title">下一场落点分布</div>' +
          '<div id="dsbDistWrap">' + distBlock(rep) + '</div></div>' +
          '<div class="dsb-level-head"><b>计算细节</b></div>' +
          '<div class="dsb-grid2">' +
          trendDetails(rep) + signalsDetails(rep) + difficultyDetails(rep) +
          calcDetails(rep, obs) + '</div>';
      }
    }

    return '<div id="dsbRoot" class="card" style="padding:16px 18px;margin-top:14px">' +
      '<div class="dsb-head">' +
      '<span style="font-size:15px;font-weight:700">⑨ 深度分析</span>' +
      '<sup style="font-size:9.5px;opacity:.55">Beta</sup>' +
      '</div>' +
      '<div class="dsb-privacy-note" role="note">为改进预测质量，本模块会使用经匿名化、去标识化处理的使用数据进行统计分析；不会记录密码等敏感内容。</div>' +
      '<div class="deep-filters-v60"><select class="compact-select-v60" data-deep-subject-v60 aria-label="深度分析对象"><option value="__inherit__"'+(!S.localSubject?' selected':'')+'>跟随全局 · '+esc(globalDeepLabel())+'</option><optgroup label="独立分析">'+chipsOk.map(function(e){return '<option value="'+esc(e.key)+'"'+(S.localSubject&&S.cur===e.key?' selected':'')+'>'+esc(e.label)+' · '+e.n+' 场</option>';}).join('')+chipsPoor.map(function(e){return '<option value="'+esc(e.key)+'" disabled'+(S.localSubject&&S.cur===e.key?' selected':'')+'>'+esc(e.label)+' · '+e.n+' 场（不足4场）</option>';}).join('')+comboList().map(function(m){return '<option value="__combo:'+esc(String(m.id))+'"'+(S.localSubject&&S.cur==='__combo:'+String(m.id)?' selected':'')+'>'+esc(m.name)+'</option>';}).join('')+'</optgroup></select><select class="compact-select-v60" data-deep-history-v60 aria-label="深度分析历史范围"><option value="inherit"'+(!S.fullHistory?' selected':'')+'>跟随考试分类</option><option value="all"'+(S.fullHistory?' selected':'')+'>全部历史</option></select></div>' +
      caliberNote +
      body +
      '</div>';
  }

  /* ---------- 文档级事件委托(chips 与目标按钮在重渲染后依然可用) ---------- */
  function curReport() {
    syncDeepSubject();var exams = prodExams();
    var cob = curCombo();
    var obs = cob ? obsCombo(exams, cob)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));
    if (obs.length < 4) return null;
    try { return analyzeProd(obs); } catch (e) { return null; }
  }
  function onDocClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var binChip = t.closest("[data-dsb-bin]");
    if (binChip) {
      S.distBin = parseInt(binChip.getAttribute("data-dsb-bin"), 10) || 5;
      renderDistInto();
      return;
    }
    var zBinChip = t.closest("[data-dsb-zbins]");
    if (zBinChip) {
      var nextBins = parseInt(zBinChip.getAttribute("data-dsb-zbins"), 10);
      S.zmapBins = [10, 20, 40].indexOf(nextBins) >= 0 ? nextBins : 20;
      renderDistInto();
      return;
    }
    var viewChip = t.closest("[data-dsb-view]");
    if (viewChip) {
      S.view = viewChip.getAttribute("data-dsb-view") || "band";
      renderDistInto();
      return;
    }
    var chip = t.closest("[data-dsb-subj]");
    if (chip) {
      S.localSubject=true;S.cur = chip.getAttribute("data-dsb-subj");
      refresh();
      track("deep_beta_switch", { subject: S.cur });
      return;
    }
    var coc = t.closest("[data-dsb-combo]");
    if (coc) {
      S.localSubject=true;var cid = coc.getAttribute("data-dsb-combo");
      if (cid === "__exit__") { S.cur = S.lastScope || "__total__"; }
      else {
        if (S.cur.indexOf("__combo:") !== 0) S.lastScope = S.cur;
        S.cur = "__combo:" + cid;
      }
      refresh();
      track("deep_beta_combo", { id: cid });
      return;
    }
    if (t.closest("#dsbGoalBtn")) {
      var out = $("#dsbGoalOut");
      var inp = $("#dsbGoalPct");
      if (!out || !inp) return;
      var v = parseFloat(inp.value);
      if (!(v >= 1 && v <= 99)) { out.textContent = "1~99"; return; }
      var rep = curReport();
      if (!rep || !rep.filter.predictive) { out.textContent = "暂无"; return; }
      var zTarget = probit(1 - v / 100);
      S.goalPct = Math.round(v);
      var pr = P2.dynamics.probReach(rep.filter.predictive, zTarget);
      out.textContent = '≈ ' + Math.round(pr * 100) + '%';
      renderDistInto();
      track("deep_beta_goal", { target: v, p: Math.round(pr * 100) });
    }
  }

  /* ---------- 自愈挂载:跟随统计页的重渲染 ---------- */
  var STYLE_ID = "dsb-style";
  function injectStyle() {
    if ($("#" + STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      '#dsbRoot summary{list-style:none;cursor:pointer;font-size:13px;opacity:.78;' +
      'user-select:none;padding:7px 0;font-weight:500}' +
      '#dsbRoot summary:hover{opacity:1}' +
      '#dsbRoot details{border-top:1px dashed rgba(127,127,127,.22)}' +
      '#dsbRoot details[open]>summary:before{content:"▾ "}' +
      '#dsbRoot summary:before{content:"▸ "}' +
      '/* ---- 排版(与统计页卡片体系统一,主题可变) ---- */' +
      '#dsbRoot .dsb-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}' +
      '#dsbRoot .dsb-note{margin-left:auto;font-size:10.5px;opacity:.5;text-align:right}' +
      '#dsbRoot .dsb-privacy-note{font-size:10.5px;line-height:1.6;opacity:.52;margin:-5px 0 11px;color:var(--muted,#667085)}' +
      '#dsbRoot .dsb-block-title{font-size:12.5px;font-weight:700;margin:14px 0 8px;letter-spacing:1px;opacity:.85}' +
      '#dsbRoot .dsb-level-head{display:flex;align-items:baseline;gap:8px;margin:18px 0 9px;' +
      'padding-top:12px;border-top:1px solid var(--line,#e8ebf0)}' +
      '#dsbRoot .dsb-level-head:first-of-type{margin-top:10px;padding-top:0;border-top:0}' +
      '#dsbRoot .dsb-level-head span{font-size:10px;font-weight:700;color:#4a90d9}' +
      '#dsbRoot .dsb-level-head b{font-size:14px}' +
      '#dsbRoot .dsb-level-head small{font-size:10.5px;opacity:.5}' +
      '#dsbRoot .dsb-summary-row{display:grid;grid-template-columns:minmax(150px,.9fr) minmax(190px,1.15fr) minmax(210px,1fr);' +
      'gap:18px;align-items:end}' +
      '#dsbRoot .dsb-summary-item{min-width:0}' +
      '#dsbRoot .dsb-summary-label{font-size:11px;opacity:.62;margin-bottom:3px}' +
      '#dsbRoot .dsb-summary-value{font-size:20px;font-weight:700}' +
      '#dsbRoot .dsb-summary-help{font-size:10.5px;opacity:.52;margin-top:4px;line-height:1.55}' +
      '#dsbRoot .dsb-plain-insights{margin:0;padding-left:18px;font-size:13px;line-height:1.85}' +
      '#dsbRoot .dsb-why-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;font-size:12.5px;line-height:1.65}' +
      '#dsbRoot .dsb-why-grid div{display:grid;gap:2px}' +
      '#dsbRoot .dsb-why-grid span{opacity:.7}' +
      '#dsbRoot .dsb-grid2{display:grid;gap:12px}' +
      '@media(min-width:900px){#dsbRoot .dsb-grid2{grid-template-columns:1fr 1fr}}' +
      '@media(max-width:760px){#dsbRoot .dsb-summary-row{grid-template-columns:1fr 1fr;gap:14px 12px}' +
      '#dsbRoot .dsb-goal-box{grid-column:1/-1}#dsbRoot .dsb-why-grid{grid-template-columns:1fr}' +
      '#dsbRoot .dsb-level-head{align-items:flex-start;flex-wrap:wrap}#dsbRoot .dsb-level-head small{width:100%;margin-left:42px}}' +
      '#dsbRoot .dsb-fig{border:1px solid var(--line,#e8ebf0);border-radius:14px;padding:12px 14px;' +
      'background:var(--panel-solid,#fff);min-width:0}' +
      '#dsbRoot .dsb-fig-title{font-size:12.5px;font-weight:700;margin-bottom:6px;opacity:.9}' +
      '#dsbRoot .dsb-fig-cap{font-size:10.5px;opacity:.55;margin-top:4px;line-height:1.65}' +
      '#dsbRoot .dsb-tip{font-size:12.5px;line-height:1.85;opacity:.78;margin-top:12px;' +
      'border:1px dashed var(--line,#cfd6e4);border-radius:12px;padding:10px 13px;background:var(--chip-bg,#fbfcfe)}' +
      '#dsbRoot .combo-chips-v25 .label{font-size:12px;font-weight:700;color:var(--muted,#667085);' +
      'white-space:nowrap;align-self:center}' +
      '#dsbRoot .combo-chips-v25 .chip{flex:0 0 auto}' +
      '#dsbRoot .dsb-caliber{font-size:11px;opacity:.6;margin:-4px 0 10px;line-height:1.7}' +
      '/* ---- 手机端:图表露一部分+横滑(与首页图表一致) ---- */' +
      '#dsbRoot .dsb-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;' +
      'overscroll-behavior-x:contain;padding:2px 1px 4px}' +
      '#dsbRoot .dsb-scroll svg{min-width:640px;height:auto}' +
      '/* ---- 暗色主题:同款结构提亮,避免颜色过深 ---- */' +
      'html[data-theme="night"] #dsbRoot .dsb-fig{background:var(--panel-solid,#161c26)}' +
      'html[data-theme="night"] #dsbRoot .dsb-tip{background:rgba(29,36,49,.5);border-color:rgba(140,150,170,.3)}' +
      'html[data-theme="night"] #dsbRoot .combo-chips-v25 .label{color:#aab4c8}' +
      'html[data-theme="night"] #dsbRoot .dsb-fig-cap,html[data-theme="night"] #dsbRoot .dsb-note{opacity:.7}';
    document.head.appendChild(st);
  }
  function pageIsStats() {
    try { return state.page === "stats"; } catch (e) { return false; }
  }
  /* ---------- 可见性埋点:只在板块/隐私说明真正进入视口时触发 ---------- */
  var deepBetaViewTracked = false;
  var privacyNoticeViewTracked = false;
  var deepBetaVisibilityObserver = null;
  var privacyNoticeVisibilityObserver = null;
  var visibilityFallbackBound = false;
  function trackDeepBetaView() {
    if (deepBetaViewTracked) return;
    deepBetaViewTracked = true;
    track("deep_beta_view", { surface: "stats" });
  }
  function trackPrivacyNoticeView() {
    if (privacyNoticeViewTracked) return;
    privacyNoticeViewTracked = true;
    track("privacy_notice_view", { surface: "deep_beta", notice_version: "v1" });
  }
  function isInViewport(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.right > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) &&
      r.left < (window.innerWidth || document.documentElement.clientWidth);
  }
  function checkVisibilityFallback() {
    if (!pageIsStats()) return;
    var root = $("#dsbRoot");
    if (!root) return;
    if (isInViewport(root)) trackDeepBetaView();
    var note = root.querySelector(".dsb-privacy-note");
    if (isInViewport(note)) trackPrivacyNoticeView();
  }
  function disconnectVisibilityObservers() {
    try { if (deepBetaVisibilityObserver) deepBetaVisibilityObserver.disconnect(); } catch (e) { }
    try { if (privacyNoticeVisibilityObserver) privacyNoticeVisibilityObserver.disconnect(); } catch (e) { }
    deepBetaVisibilityObserver = null;
    privacyNoticeVisibilityObserver = null;
  }
  function observeSectionVisibility(root) {
    if (!root || root.getAttribute("data-dsb-visibility-observed") === "1") return;
    root.setAttribute("data-dsb-visibility-observed", "1");
    if (typeof window.IntersectionObserver === "function") {
      disconnectVisibilityObservers();
      deepBetaVisibilityObserver = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) trackDeepBetaView();
      }, { threshold: 0.1 });
      deepBetaVisibilityObserver.observe(root);
      var note = root.querySelector(".dsb-privacy-note");
      if (note) {
        privacyNoticeVisibilityObserver = new IntersectionObserver(function (entries) {
          if (entries[0] && entries[0].isIntersecting) trackPrivacyNoticeView();
        }, { threshold: 0.1 });
        privacyNoticeVisibilityObserver.observe(note);
      }
    } else {
      if (!visibilityFallbackBound) {
        visibilityFallbackBound = true;
        window.addEventListener("scroll", checkVisibilityFallback, { passive: true });
        window.addEventListener("resize", checkVisibilityFallback, { passive: true });
      }
      setTimeout(checkVisibilityFallback, 0);
    }
  }
  function resetVisibilityTrackingIfOutsideStats() {
    if (pageIsStats()) return;
    deepBetaViewTracked = false;
    privacyNoticeViewTracked = false;
    disconnectVisibilityObservers();
  }
  function mountIfMissing() {
    if (!pageIsStats()) { resetVisibilityTrackingIfOutsideStats(); return; }
    var c = document.getElementById("content");
    if (!c) return;
    var existing = $("#dsbRoot", c);
    if (existing) { observeSectionVisibility(existing); return; }           /* 已挂载 */
    if (!c.firstElementChild) return;        /* 统计页还没渲染好 */
    /* 插在「数据质量与方法论」(⑩)之前 → 深度分析=⑨ 紧随全量矩阵(⑧)。
       注意: quality 卡位于 .sv31-page 内部,不能要求它是 #content 的直接子级,
       否则整块会被追加到页面末尾,出现「⑩ 排到 ⑨ 前面」 */
    var q = c.querySelector(".sv31-quality");
    if (q) q.insertAdjacentHTML("beforebegin", sectionHtml());
    else c.insertAdjacentHTML("beforeend", sectionHtml());
    observeSectionVisibility($("#dsbRoot", c));
  }
  function refresh() {
    var root = $("#dsbRoot");
    if (!root) { mountIfMissing(); return; }
    root.outerHTML = sectionHtml();
    observeSectionVisibility($("#dsbRoot"));
  }
  var mountTimer = null;
  function scheduleMount() {
    if (mountTimer) return;
    mountTimer = setTimeout(function () {
      mountTimer = null;
      try { mountIfMissing(); } catch (e) { }
    }, 0);
  }
  function boot() {
    try { injectStyle(); } catch (e) { }
    document.addEventListener("click", onDocClick, false);
    document.addEventListener('change',function(ev){var t=ev.target;if(t.matches('[data-dsb-view-select]')){S.view=t.value;renderDistInto();}else if(t.matches('[data-dsb-bin-select]')){S.distBin=Number(t.value);renderDistInto();}else if(t.matches('[data-dsb-zbins-select]')){S.zmapBins=Number(t.value);renderDistInto();}else if(t.matches('[data-deep-subject-v60]')){S.localSubject=t.value!=='__inherit__';if(S.localSubject)S.cur=t.value;else syncDeepSubject();refresh();if(S.cur.indexOf('__combo:')===0)track('deep_beta_combo',{id:S.cur.slice(8)});else track('deep_beta_switch',{subject:S.cur});document.querySelector('[data-deep-subject-v60]')?.focus({preventScroll:true});}else if(t.matches('[data-deep-history-v60]')){S.fullHistory=t.value==='all';refresh();}},false);
    /* 目标输入实时联动分布图 */
    document.addEventListener("input", function (ev) {
      var t = ev.target;
      if (!t || t.id !== "dsbGoalPct") return;
      var v = parseFloat(t.value);
      if (v >= 1 && v <= 99) { S.goalPct = Math.round(v); renderDistInto(); }
    }, false);
    /* 兜底1:包装渲染入口链——每次页面路由后检查挂载 */
    var prevRender = (typeof window.renderPage === "function") ? window.renderPage : null;
    window.renderPage = function v34RenderPage() {
      if (prevRender) { try { prevRender(); } catch (e) { } }
      scheduleMount();
    };
    /* 兜底2:全树观察(#content 本身是动态创建的,不能只盯固定节点) */
    try {
      var mo = new MutationObserver(function () { scheduleMount(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) { }
    /* 兜底3:导航点击后延迟检查 */
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest('[data-page="stats"]')) {
        setTimeout(function () { try { mountIfMissing(); } catch (e) { } }, 60);
      }
    }, false);
    scheduleMount();
  }
  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }

  /* ---------- 测试钩子 ---------- */
  window.__v34 = {
    obsTotal: obsTotal,
    obsSubject: obsSubject,
    subjectList: subjectList,
    probit: probit,
    analyze: function (obs) { return analyzeProd(obs); },
    sectionHtml: sectionHtml,
    refresh: refresh,
    mountIfMissing: mountIfMissing,
    setSubject: function (s) { S.localSubject=true;S.cur = s; },
    analysisOptions: {
      seWeighting: PROD_ANALYSIS_OPTS.seWeighting,
      ewmaForecastAlpha: PROD_ANALYSIS_OPTS.ewmaForecastAlpha,
      conformalPriorK: PROD_ANALYSIS_OPTS.conformalPriorK,
      conformalPriorW: PROD_ANALYSIS_OPTS.conformalPriorW
    },
    shadowKey: LS_SHADE
  };
})();
