/* app-v34.js · 深度分析(Beta) —— 自动生成,勿手改
   来源: research/analytics-page/prod/deep-beta-main.js + research/paper-analytics-lab/src/{core.js,measurement.js,trend-test.js,dynamics.js,bocpd.js,ewma.js,difficulty.js,alerts.js,goals.js,pipeline.js}
   重build: node design/build-deep-beta.js && node design/build-bundles.js */
(function () {
"use strict";
if (window.__v34kernel) return;
window.__v34kernel = 1;
var global = window; /* research 内核以 global.PAL 挂载,浏览器下指向 window */
var PAL2NS = (window.PAL = window.PAL || {});

/* ---- PAL2 kernel: core.js ---- */
/* ============================================================
 * core.js — 基础数值工具（零依赖，浏览器/Node 双端）
 * 论文级实现：逆正态变换、稳健统计、精确分位数
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 确定性随机（仿真可复现） ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var next = mulberry32(seed == null ? 0x9E3779B9 : seed);
    var cached = null;
    return {
      uniform: function () { return next(); },
      norm: function () {
        if (cached !== null) { var v = cached; cached = null; return v; }
        var u1 = next(), u2 = next();
        if (u1 < 1e-300) u1 = 1e-300;
        var r = Math.sqrt(-2 * Math.log(u1)), th = 2 * Math.PI * u2;
        cached = r * Math.sin(th);
        return r * Math.cos(th);
      },
      binomial: function (n, p) {
        if (p <= 0) return 0;
        if (p >= 1) return n;
        // 小 n 直接枚举；大 n 用正态近似 + 取整修正
        if (n <= 64) {
          var c = 0;
          for (var i = 0; i < n; i++) if (next() < p) c++;
          return c;
        }
        var mu = n * p, sd = Math.sqrt(n * p * (1 - p));
        var x = Math.max(0, Math.min(n, Math.round(mu + sd * this.norm())));
        return x;
      },
      int: function (nInclusive) {
        return Math.floor(next() * (nInclusive + 1));
      }
    };
  }

  /* ---------- 正态分布 ---------- */
  function erf(x) {
    // Abramowitz & Stegun 7.1.26，最大绝对误差 1.5e-7
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdfHigh(z) {
    // Φ(z) = z≥0 ? 1 − ½·Q(½, z²/2) : ½·Q(½, z²/2)，相对精度 ~1e-14
    var q = gammq(0.5, z * z / 2);
    return z >= 0 ? 1 - 0.5 * q : 0.5 * q;
  }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }

  /* Acklam 逆正态 + 牛顿精修（相对误差 < 1e-12） */
  function invNorm(p) {
    if (!(p > 0 && p < 1)) throw new Error('invNorm: p 必须在 (0,1)，收到 ' + p);
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01,
             2.445134137142996e+00, 3.754408661907416e+00];
    var pLow = 0.02425, q, r, x;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pLow) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    // 两步牛顿精修：x ← x − (Φ(x) − p)/φ(x)
    for (var k = 0; k < 2; k++) {
      var e = normCdfHigh(x) - p;
      var u = e * Math.sqrt(2 * Math.PI) * Math.exp(0.5 * x * x);
      x = x - u;
    }
    return x;
  }

  /* Student-t CDF（通过不完全贝塔函数），df 为正整数或一般正数 */
  function logGamma(z) {
    // Lanczos g=7, n=9
    var g = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = g[0];
    for (var i = 1; i < g.length; i++) x += g[i] / (z + i);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  /* 不完全伽马：P(a,x) 级数 与 Q(a,x) 连分式（Numerical Recipes §6.2，~机器精度） */
  function gser(a, x) {
    var ITMAX = 300, EPS = 3e-14;
    if (x <= 0) return 0;
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 1; n <= ITMAX; n++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    var gln = logGamma(a);
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  function gcf(a, x) {
    var ITMAX = 300, EPS = 3e-14, FPMIN = 1e-300;
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i <= ITMAX; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    var gln = logGamma(a);
    return Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  function gammp(a, x) { return x < a + 1 ? gser(a, x) : 1 - gcf(a, x); }
  function gammq(a, x) { return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  function betacf(a, b, x) {
    var MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function betainc(a, b, x) { // 正则化不完全贝塔 I_x(a,b)
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function tCdf(t, df) {
    var x = df / (df + t * t);
    var p = 0.5 * betainc(df / 2, 0.5, x);
    return t > 0 ? 1 - p : p;
  }
  /* 标准化 Student-t 的双侧 p 值 */
  function tSf2(t, df) { return betainc(df / 2, 0.5, df / (df + t * t)); }

  /* ---------- 描述统计 ---------- */
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function median(a) { return quantile(a, 0.5); }
  function quantile(a, q) {
    // Type-7（R 默认）线性插值
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; });
    var pos = (b.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return b[lo];
    return b[lo] + (pos - lo) * (b[hi] - b[lo]);
  }
  function variance(a, sample) {
    var n = a.length; if (n < 2) return sample ? NaN : 0;
    var m = mean(a), s = 0;
    for (var i = 0; i < n; i++) s += (a[i] - m) * (a[i] - m);
    return s / (sample ? n - 1 : n);
  }
  function sd(a, sample) { return Math.sqrt(variance(a, sample)); }
  function mad(a) {
    var m = median(a);
    var dev = a.map(function (x) { return Math.abs(x - m); });
    return median(dev); // 未乘 1.4826，由调用方决定尺度系数
  }
  function madSigma(a) { return 1.4826 * mad(a); } // MAD→σ 一致估计

  function logSumExp(arr) {
    var mx = -Infinity;
    for (var i = 0; i < arr.length; i++) if (arr[i] > mx) mx = arr[i];
    var s = 0;
    for (i = 0; i < arr.length; i++) s += Math.exp(arr[i] - mx);
    return mx + Math.log(s);
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  /* ---------- 保序回归（PAVA，权重版）：单调递增拟合 ---------- */
  function isotonic(xy) {
    // xy: [{x,y,w}]；返回同长数组 fitted（按 x 排序后单调不减）
    var pts = xy.slice().sort(function (a, b) { return a.x - b.x; });
    var vals = [], wts = [], idx = [];
    for (var i = 0; i < pts.length; i++) {
      vals.push(pts[i].y); wts.push(pts[i].w == null ? 1 : pts[i].w); idx.push(i);
      while (vals.length > 1 && vals[vals.length - 2] > vals[vals.length - 1]) {
        // 合并两个相邻块：值、权、索引三者必须同步弹出各一个，
        // 否则 idx 与 vals 失步，重建时尾部出现空洞(undefined)
        var v2 = vals.pop(), w2 = wts.pop(), i2 = idx.pop();
        var v1 = vals.pop(), w1 = wts.pop(), i1 = idx.pop();
        vals.push((v1 * w1 + v2 * w2) / (w1 + w2));
        wts.push(w1 + w2); idx.push(i2); // 块的“最后原始下标”用于重建计数
      }
    }
    var out = new Array(pts.length);
    var pos = 0;
    for (var b = 0; b < vals.length; b++) {
      var cnt = b === 0 ? idx[b] + 1 : idx[b] - idx[b - 1];
      while (cnt-- > 0) out[pos++] = vals[b];
    }
    // out 与排序后的 pts 对齐；再映射回原顺序
    var result = new Array(pts.length);
    for (var j = 0; j < pts.length; j++) result[j] = out[j]; // 已按 x 排序的拟合值
    return { sortedX: pts.map(function (p) { return p.x; }), sortedFit: result };
  }
  function interpAt(xs, ys, x0) {
    if (x0 <= xs[0]) return ys[0];
    if (x0 >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (var i = 1; i < xs.length; i++) {
      if (x0 <= xs[i]) {
        var t = (x0 - xs[i - 1]) / (xs[i] - xs[i - 1]);
        return ys[i - 1] + t * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  }

  global.PAL = global.PAL || {};
  PAL.core = {
    makeRng: makeRng, mulberry32: mulberry32,
    normCdf: normCdfHigh, normPdf: normPdf, invNorm: invNorm, erf: erf,
    tCdf: tCdf, tSf2: tSf2, logGamma: logGamma, gammp: gammp, gammq: gammq, betainc: betainc,
    mean: mean, median: median, quantile: quantile, sd: sd, variance: variance,
    mad: mad, madSigma: madSigma, logSumExp: logSumExp, sigmoid: sigmoid, clamp: clamp,
    isotonic: isotonic, interpAt: interpAt
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: measurement.js ---- */
/* ============================================================
 * measurement.js — 测量层：位比 → 潜在标准分（含不确定度传播）
 *
 * 核心思想：
 *   名次 r/N 是序数信息，但若假设同考群体能力分布近似正态，
 *   则位比可经 Blom 逆正态变换嵌入到公共潜变量 z 轴上，
 *   使不同考试、不同科目的成绩获得可比性。
 *   且由二项抽样方差经 delta 法传播，得到每个观测的
 *   解析标准误 —— 排名越靠两端 / 参考人数越少，噪声越大。
 *
 * 参考：Blom (1958); rank-based inverse normal transformation
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * 位比 → 潜分 z + 标准误（约定：z 越大越好，年级第一 → z 最大）
   * @param rank 名次（1 为第一）
   * @param N    参考人数
   * @returns {z, se, p}  p 为位比(0,1)，越小名次越靠前
   */
  function positionToZ(rank, N) {
    if (!(N >= 2) || !(rank >= 1 && rank <= N)) return null;
    var p = (rank - 0.375) / (N + 0.25);          // Blom 平移
    var q = 1 - p;                                 // 领先比例
    var z = C.invNorm(q);                          // 越大越好
    var dp = Math.sqrt(p * (1 - p) / N);           // 位比二项抽样 se
    var dz = dp / Math.max(C.normPdf(z), 1e-12);   // delta 法过 Φ⁻¹（对称）
    return { z: z, se: dz, p: p };
  }

  /**
   * 双通道一致性检验：年级位 vs 班级位
   * 若两通道显著背离 → 提示「群体构成变化」（如走班重排），
   * 该场观测在动态建模中应降权。
   * @returns null 或 {gapZ, flag}
   */
  function channelConsistency(yearPos, classPos) {
    if (!yearPos || !classPos) return null;
    var gapZ = yearPos.z - classPos.z;
    var se = Math.sqrt(yearPos.se * yearPos.se + classPos.se * classPos.se);
    if (!(se > 0)) return null;
    return { gapZ: gapZ, se: se, flag: Math.abs(gapZ) > 2.5 * se };
  }

  /* 把应用数据行规范化为统一观测格式 */
  function observe(row, opts) {
    opts = opts || {};
    var o = {};
    var y = positionToZ(row.rank, row.participants);
    if (y) { o.zYear = y; }
    var c = row.classRank ? positionToZ(row.classRank, row.classParticipants || Math.round((row.classParticipantsRatio || 45))) : null;
    if (c && c.z === c.z) o.zClass = c;
    if (o.zYear && o.zClass) {
      o.consistency = channelConsistency(o.zYear, o.zClass);
    }
    // 主通道：优先年级；仅班级时以班级为代理（标注口径）
    o.main = o.zYear || o.zClass || null;
    o.mainScope = o.zYear ? 'year' : (o.zClass ? 'class' : null);
    if (opts.rate !== undefined && opts.rate !== null && opts.max > 0) {
      o.rate = opts.rate; o.max = opts.max;
    }
    return o;
  }

  global.PAL = global.PAL || {};
  PAL.measurement = {
    positionToZ: positionToZ,
    channelConsistency: channelConsistency,
    observe: observe
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: trend-test.js ---- */
/* ============================================================
 * trend-test.js — 非参数趋势检验：Mann–Kendall + Sen 斜率
 *
 * 用途：对位比/潜分轨迹做「是否真实存在单调趋势」的假设检验，
 *       并给出稳健斜率（每场平均变化）及其置信区间。
 * 小样本（n≤9）：精确置换 p 值；n≥10：含结点修正的正态近似。
 * 参考：Mann (1945); Kendall (1975); Sen (1968); Gilbert (1987)
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function sStat(x) {
    var n = x.length, s = 0;
    for (var i = 0; i < n - 1; i++)
      for (var j = i + 1; j < n; j++)
        s += Math.sign(x[j] - x[i]);
    return s;
  }

  function tieCorrection(x) {
    var counts = {}, vals = [];
    for (var i = 0; i < x.length; i++) {
      if (counts[x[i]] === undefined) { counts[x[i]] = 0; vals.push(x[i]); }
      counts[x[i]]++;
    }
    var term = 0, hasTies = false;
    for (i = 0; i < vals.length; i++) {
      var t = counts[vals[i]];
      if (t > 1) { hasTies = true; term += t * (t - 1) * (2 * t + 5); }
    }
    return { hasTies: hasTies, term: term };
  }

  /* 精确零分布：枚举全排列 |S| ≥ |S_obs| 的比例 */
  function exactP(x, nMax) {
    var n = x.length;
    if (n > nMax) return null;
    var idx = [], i;
    for (i = 0; i < n; i++) idx.push(i);
    var count = 0, total = 0, sObs = Math.abs(sStat(x));
    function permute(k) {
      if (k === n) {
        total++;
        // 对当前排列求 S
        var arr = [];
        for (var m = 0; m < n; m++) arr.push(x[idx[m]]);
        if (Math.abs(sStat(arr)) >= sObs) count++;
        return;
      }
      for (var kk = k; kk < n; kk++) {
        var tmp = idx[k]; idx[k] = idx[kk]; idx[kk] = tmp;
        permute(k + 1);
        tmp = idx[k]; idx[k] = idx[kk]; idx[kk] = tmp;
      }
    }
    permute(0);
    return count / total; // 含观测本身，保守
  }

  /**
   * Mann–Kendall 检验
   * @param x 数值序列（按时间序）
   * @param alpha 显著性水平
   */
  function mannKendall(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length;
    if (n < 4) return { valid: false, reason: 'n<4' };
    var S = sStat(x);
    var tc = tieCorrection(x);
    var varS = (n * (n - 1) * (2 * n + 5) - tc.term) / 18;
    var z, p;
    var exact = n <= 9 ? exactP(x, 9) : null;
    if (exact !== null && !tc.hasTies) {
      p = exact;
      z = null; // 精确检验无需 z
    } else {
      if (S > 0) z = (S - 1) / Math.sqrt(varS);
      else if (S < 0) z = (S + 1) / Math.sqrt(varS);
      else z = 0;
      p = 2 * (1 - C.normCdf(Math.abs(z)));
    }
    var sen = senSlope(x);
    return {
      valid: true, n: n, S: S, varS: varS,
      z: z, p: p, exact: exact !== null,
      significant: p < alpha,
      direction: S > 0 ? 'up' : (S < 0 ? 'down' : 'flat'),
      senSlope: sen.slope, senLo: sen.lo, senHi: sen.hi
    };
  }

  /* Sen 斜率 + Gilbert (1987) 置信区间 */
  function senSlope(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length, slopes = [];
    for (var i = 0; i < n - 1; i++)
      for (var j = i + 1; j < n; j++)
        if (j - i > 0) slopes.push((x[j] - x[i]) / (j - i));
    if (!slopes.length) return { slope: 0, lo: 0, hi: 0 };
    slopes.sort(function (a, b) { return a - b; });
    var N = slopes.length;
    var slope = N % 2 ? slopes[(N - 1) / 2] : (slopes[N / 2 - 1] + slopes[N / 2]) / 2;
    // 置信区间
    var S = sStat(x), tc = tieCorrection(x);
    var varS = (n * (n - 1) * (2 * n + 5) - tc.term) / 18;
    var Cα = 1.959963984540054 * Math.sqrt(varS); // z_{0.975}
    var M1 = (N - Cα) / 2, M2 = (N + Cα) / 2;
    function rankPick(M) {
      if (M <= 0) return slopes[0];
      if (M >= N - 1) return slopes[N - 1];
      var lo = Math.floor(M), hi = Math.ceil(M);
      return lo === hi ? slopes[lo] : slopes[lo] + (M - lo) * (slopes[hi] - slopes[lo]);
    }
    var lo = rankPick(M1), hi = rankPick(M2 + 1);
    return { slope: slope, lo: lo, hi: hi };
  }

  /* 基线对照：OLS 斜率 t 检验（论文对比用） */
  function olsTrend(x, alpha) {
    alpha = alpha || 0.05;
    var n = x.length;
    if (n < 4) return { valid: false, reason: 'n<4' };
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += i; sy += x[i]; sxx += i * i; sxy += i * x[i];
    }
    var b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    var a = (sy - b * sx) / n;
    var rss = 0;
    for (i = 0; i < n; i++) { var e = x[i] - (a + b * i); rss += e * e; }
    var seB = Math.sqrt(rss / (n - 2) / (sxx - sx * sx / n));
    var t = b / seB;
    var df = n - 2;
    var p = C.tSf2(Math.abs(t), df);
    return { valid: true, slope: b, se: seB, t: t, df: df, p: p, significant: p < alpha };
  }

  global.PAL = global.PAL || {};
  PAL.trendTest = {
    mannKendall: mannKendall, senSlope: senSlope, olsTrend: olsTrend, sStat: sStat
  };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: dynamics.js ---- */
/* ============================================================
 * dynamics.js — 动态层：稳健局部线性趋势模型（贝叶斯动态线性模型）
 *
 *   状态:  θ_t = [μ_t, β_t]'   （潜分水平 / 趋势斜率）
 *   演化:  μ_t = μ_{t-1} + β_{t-1} + w_μ     （折扣因子 δ_μ）
 *          β_t = β_{t-1} + w_β               （折扣因子 δ_β）
 *   观测:  z_t ~ StudentT(ν, μ_t, σ_t²)      σ_t 为测量层解析标准误
 *
 * Student-t 噪声 → 对「失常场」（生病/失误）自动降权的鲁棒滤波。
 * 实现：IRLS 迭代加权 Kalman 滤波（West, 1981; West & Harrison, 1997）。
 * 输出：μ̂_t ± 95%CI、趋势后验、下一场后验预测分布（目标达成概率的基础）。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function kalmanPass(obs, params, weights) {
    // obs: [{z, se}]; weights: 数组或 null
    // params.interventions[t]=true 时在演化步执行 DLM 干预
    // （协方差膨胀 + 趋势归零）：与 BOCPD 触发的体制切换对齐
    var dm = params.discountMu, db = params.discountBeta, nu = params.df;
    var inflate = params.interventionInflate || 40;
    var m = [obs[0].z], b = [0];
    var Cmat = [[params.sigma0Sq || 0.25, 0], [0, params.betaVar0 || 0.02]];
    var means = [obs[0].z], lows = [], highs = [], bmeans = [0];
    var oneStepPreds = [];
    var Chist = []; // 每步更新后的状态协方差 [c00,c01,c11]，供前向预测尺度用
    for (var t = 1; t < obs.length; t++) {
      /* 演化 */
      var intervened = params.interventions && params.interventions[t];
      var aMu = m[t - 1] + b[t - 1], aBeta = b[t - 1];
      var R00 = Cmat[0][0] / dm + Cmat[0][1] / db + Cmat[1][0] / db + Cmat[1][1] / db;
      var R01 = Cmat[0][1] / db + Cmat[1][1] / db;
      var R11 = Cmat[1][1] / db;
      R00 += 1e-6;
      if (intervened) {
        R00 = Math.max(R00 * inflate, inflate * (params.minSeSq || 0.0025));
        R01 = 0;
        R11 = Math.max(R11 * inflate, params.betaVar0 || 0.02);
        aMu = m[t - 1]; aBeta = 0; // 允许水平自由跳变，趋势重置
      }
      /* 预测分布（一步向前） */
      var f = aMu;
      var qBase = Math.max(obs[t].se * obs[t].se, params.minSeSq || 0.0025);
      oneStepPreds.push({ f: f, q: R00 + qBase });
      /* 更新：观测方差按 Student-t 权重缩放 */
      var w = weights ? weights[t] : 1;
      var Qt = (R00 + qBase) / w;
      var A00 = R00 / Qt;
      var e = obs[t].z - f;
      var newM = aMu + A00 * e;
      var newB = aBeta + (R01 / Qt) * e;
      var c00 = R00 - A00 * R00;
      var c01 = R01 - A00 * R01;
      var c11 = R11 - (R01 * R01) / Qt;
      m.push(newM); b.push(newB);
      Cmat = [[c00, c01], [c01, c11]];
      Chist.push([c00, c01, c11]);
      var sdMu = Math.min(Math.sqrt(Math.max(c00 + qBase / Math.max(w, 0.05), 1e-12)), 3);
      means.push(newM); bmeans.push(newB);
      lows.push(newM - 1.959964 * sdMu); highs.push(newM + 1.959964 * sdMu);
    }
    return { mu: means, beta: bmeans, lo: [means[0]].concat(lows), hi: [means[0]].concat(highs), preds: oneStepPreds, C: Cmat, Chist: Chist };
  }

  /**
   * 稳健滤波主入口
   * @param zs [{z, se}] 时间序
   * @param opts {discountMu=0.96, discountBeta=0.90, df=6, iters=3,
   *              interventions=[bool]（BOCPD 触发的 DLM 干预标记）}
   */
  function robustFilter(zs, opts) {
    if (!zs || zs.length < 2) {
      return zs && zs.length === 1
        ? { valid: true, singlePoint: true, mu: [zs[0].z], lo: [zs[0].z - 1.96 * zs[0].se], hi: [zs[0].z + 1.96 * zs[0].se], beta: [0] }
        : { valid: false };
    }
    var p = {
      discountMu: opts && opts.discountMu || 0.96,
      discountBeta: opts && opts.discountBeta || 0.90,
      df: opts && opts.df || 6,
      iters: opts && opts.iters || 3,
      interventions: opts && opts.interventions || null,
      interventionInflate: opts && opts.interventionInflate || 40,
      /* 趋势阻尼：预测中心 = μ̂ + damping·β。
         由调用方按趋势证据门控传入（pipeline 用一阶滤波水平的
         Mann–Kendall 显著性自适应选择）；未传时 1 = 不阻尼 */
      damping: opts && opts.damping != null ? opts.damping : 1,
      sigma0Sq: 0.25, betaVar0: 0.02, minSeSq: 0.0025
    };
    /* --- 方差学习（经验贝叶斯式调谐）---
       测量层解析 se 只覆盖位比抽样噪声；日间发挥波动会表现为
       一步预测残差。用其稳健方差超出模型方差的部分估计 σ²_day。
       第二次学习时剔除被 Student-t 强降权的点（失常/突变残差
       不应计为日常噪声），部分回灌到观测噪声下限，
       全额（六折）计入后验预测。 */
    function learnDayVar(f, wts) {
      var es = [], qs = [];
      for (var t = 1; t < zs.length; t++) {
        if (wts && wts[t] !== undefined && wts[t] < 0.55) continue;
        var pr = f.preds[t - 1];
        if (!pr || !isFinite(pr.q)) continue;
        es.push(zs[t].z - pr.f);
        qs.push(pr.q);
      }
      if (es.length < 4) return 0;
      var md = C.madSigma(es);
      if (!isFinite(md)) return 0;
      return Math.max(md * md - C.mean(qs), 0);
    }

    var fit0 = kalmanPass(zs, p, null);
    var dayVar = learnDayVar(fit0);
    p.minSeSq = p.minSeSq + 0.4 * Math.min(dayVar, 1);

    var weights = null, fit = null, pass;
    for (pass = 0; pass < p.iters; pass++) {
      fit = kalmanPass(zs, p, weights);
      // 由标准化残差更新 Student-t 权重（夹紧防下溢）
      weights = [];
      for (var t = 0; t < zs.length; t++) {
        if (t === 0 || !fit.preds[t - 1]) { weights.push(1); continue; }
        var pr = fit.preds[t - 1];
        var r2 = (zs[t].z - pr.f); r2 = r2 * r2 / Math.max(pr.q, 1e-9);
        var wgt = (p.df + 1) / (p.df + r2);
        weights.push(Math.min(1, Math.max(wgt, 0.05)));
      }
    }
    dayVar = learnDayVar(fit, weights); // 用最终拟合与稳健权重重估
    // 下一场后验预测（Student-t，df=p.df）
    // 向前多演化一步：q_{n+1} = [G·C·Gᵀ]_{00} + 观测噪声 + 日间波动
    // （日间波动打六折计入：minSeSq 膨胀已吸收约四成，避免重复计数）
    var nT = zs.length;
    var nextMu = fit.mu[nT - 1] + p.damping * fit.beta[nT - 1];
    var Cf = fit.C;
    var lastSe = zs[nT - 1].se;
    var qNext = (Cf[0][0] + 2 * Cf[0][1] + Cf[1][1]) / p.discountMu +
      Math.max(lastSe * lastSe, p.minSeSq) +
      Math.min(Math.max(dayVar * 0.6, 0), 1.0);
    if (!isFinite(qNext) || qNext <= 0) qNext = 0.09;
    qNext = Math.min(qNext, 4);
    var predSd = Math.sqrt(qNext);
    /* 每步的「前向预测尺度」：从 ≤t−1 预测第 t 场时会用的尺度。
       与最终预测同公式，供共形校准使用（参照系一致） */
    var predScales = [null];
    for (var tt = 1; tt < nT; tt++) {
      var cH = fit.Chist[tt - 1];
      var qF = (cH[0] + 2 * cH[1] + cH[2]) / p.discountMu +
        Math.max(zs[tt].se * zs[tt].se, p.minSeSq) +
        Math.min(Math.max(dayVar * 0.6, 0), 1.0);
      if (!isFinite(qF) || qF <= 0) qF = 0.09;
      predScales.push(Math.sqrt(Math.min(qF, 4)));
    }
    return {
      valid: true, singlePoint: false,
      mu: fit.mu, lo: fit.lo, hi: fit.hi, beta: fit.beta,
      weights: weights,
      preds: fit.preds,
      dayVarSd: Math.sqrt(Math.max(dayVar, 0)),
      predictive: { location: nextMu, scale: predSd, df: p.df },
      predScales: predScales,
      params: p
    };
  }

  /* P(下一场潜分 ≥ x) —— 用于目标达成概率 */
  function probReach(pred, x) {
    // z_next ~ t_df(loc, scale)；P(z ≥ x) = 1 − F_t((x−loc)/scale)
    var tval = (x - pred.location) / pred.scale;
    return 1 - C.tCdf(tval, pred.df);
  }

  /* 后验预测分位数（数值求逆） */
  function predQuantile(pred, prob) {
    var lo = pred.location - 12 * pred.scale, hi = pred.location + 12 * pred.scale;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if ((1 - C.tCdf((mid - pred.location) / pred.scale, pred.df)) > prob) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  global.PAL = global.PAL || {};
  PAL.dynamics = { robustFilter: robustFilter, probReach: probReach, predQuantile: predQuantile };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: bocpd.js ---- */
/* ============================================================
 * bocpd.js — 贝叶斯在线变点检测（BOCPD）
 *
 *   Adams & MacKay (2007): Bayesian online changepoint detection.
 *   观测模型：NIG 共轭的 Gaussian（均值/方差均未知）
 *   输出：每场考试处于「新体制」的后验概率 r_t（run length 分布），
 *         以及 MAP run length —— 突变（如状态骤降/骤升）的形式化检测。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /* NIG 充分统计量的 Student-t 预测对数密度 */
  function studentTLogPdfNIG(x, s) {
    // s: {mu0, kappa, alpha, beta}
    var df = 2 * s.alpha;
    var scale2 = (s.beta * (s.kappa + 1)) / (s.alpha * s.kappa);
    var lg = C.logGamma((df + 1) / 2) - C.logGamma(df / 2) -
      0.5 * Math.log(df * Math.PI * scale2) - ((df + 1) / 2) * Math.log(1 + (x - s.mu0) * (x - s.mu0) / (df * scale2));
    return lg;
  }
  function nigUpdate(s, x) {
    return {
      mu0: (s.kappa * s.mu0 + x) / (s.kappa + 1),
      kappa: s.kappa + 1,
      alpha: s.alpha + 0.5,
      beta: s.beta + 0.5 * (s.kappa / (s.kappa + 1)) * (x - s.mu0) * (x - s.mu0)
    };
  }

  /**
   * @param x 数值序列
   * @param opts {hazard=1/20, mu0=null, kappa=1, alpha=2, beta=var prior}
   * @returns {r: 每点 MAP run length, pChange: 变点后验概率序列}
   */
  function bocpd(x, opts) {
    opts = opts || {};
    var h = opts.hazard || 1 / 30;
    var n = x.length;
    if (!n) return { valid: false };
    // 先验：以首个观测为中心的弱信息 NIG（避免全样本均值造成的信息泄漏与钝化）
    // κ0=1 抑制短序列上的过分割（控制平稳段误报）
    var varAll = Math.max(C.variance(x, true) || 0.25, 0.01);
    var base = {
      mu0: opts.mu0 !== undefined ? opts.mu0 : x[0],
      kappa: opts.kappa !== undefined ? opts.kappa : 1,
      alpha: opts.alpha || 2,
      beta: opts.beta !== undefined ? opts.beta : Math.max(0.5 * varAll * (opts.kappa || 1), 1e-4)
    };
    var MAXR = 250, PRUNE = 1e-8;
    // R[t][k] = P(run length = k | data up to t)
    var stats = [base];
    var Rprev = new Array(1); Rprev[0] = 1;
    var mapRL = [], pChange = [], recentChange = [];
    for (var t = 0; t < n; t++) {
      var maxLen = Math.min(Rprev.length, MAXR);
      var logPred = new Array(maxLen);
      for (var k = 0; k < maxLen; k++) logPred[k] = studentTLogPdfNIG(x[t], stats[k]);
      var logJoint = new Array(maxLen + 1);
      var growthAccum = [];
      for (k = 0; k < maxLen; k++) {
        growthAccum.push(logPred[k] + Math.log(Math.max(1 - h, 1e-12)) + Math.log(Rprev[k]));
      }
      // 新体制概率
      var logChangepointTerms = [];
      for (k = 0; k < maxLen; k++) logChangepointTerms.push(logPred[k] + Math.log(Rprev[k]) + Math.log(Math.max(h, 1e-12)));
      logJoint[0] = C.logSumExp(logChangepointTerms);
      for (k = 0; k < maxLen; k++) logJoint[k + 1] = growthAccum[k];
      var norm = C.logSumExp(logJoint);
      var Rnew = new Array(logJoint.length);
      for (k = 0; k < logJoint.length; k++) Rnew[k] = Math.exp(logJoint[k] - norm);
      // 近期体制变化概率：P(run length ≤ K | data)，变点后数场内保持高值
      var recent = 0;
      var KCAP = 4;
      for (k = 0; k < Math.min(Rnew.length, KCAP + 1); k++) recent += Rnew[k];
      // 剪枝
      var keep = [], cum = 0;
      for (k = 0; k < Rnew.length; k++) { if (Rnew[k] > PRUNE) keep.push(k); }
      var Rkeep = keep.map(function (kk) { return Rnew[kk]; });
      var sKeep = keep.map(function (kk) { return kk === 0 ? base : stats[kk - 1]; });
      // 更新充分统计量：每个 run length 候选都吃进当前观测
      var statsNew = [base];
      for (k = 0; k < sKeep.length; k++) statsNew.push(nigUpdate(sKeep[k], x[t]));
      var mapK = 0;
      for (k = 1; k < Rkeep.length; k++) if (Rkeep[k] > Rkeep[mapK]) mapK = k;
      mapRL.push(keep[mapK]);
      pChange.push(Rkeep[0]);
      recentChange.push(recent);
      Rprev = Rkeep;
      stats = statsNew;
    }
    return { valid: true, mapRunLength: mapRL, changeProb: pChange, recentChangeProb: recentChange };
  }

  global.PAL = global.PAL || {};
  PAL.bocpd = { run: bocpd };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: ewma.js ---- */
/* ============================================================
 * ewma.js — EWMA 指数加权移动平均控制图（SPC 早期预警）
 *
 *   Roberts (1959); Hunter (1986, J. Quality Technology)。
 *   对「连续小退步」这类渐进劣化，EWMA 比 Shewhart 单点规则
 *   灵敏得多；控制限由 ARL（平均运行长度）理论给出，
 *   误报预算 ARL0 显式可控 —— 论文中用蒙特卡洛实测 ARL0。
 * ============================================================ */
(function (global) {
  'use strict';

  /**
   * @param x 标准化残差序列（均值 0 方差 1 尺度）
   * @param opts {lambda=0.3, L=2.815}  L·λ 组合决定 ARL0
   * @returns {z: EWMA统计量路径, violations: 违限索引}
   */
  function ewma(x, opts) {
    var lambda = (opts && opts.lambda) || 0.3;
    var L = (opts && opts.L) || 2.815;
    if (!x || !x.length) return { valid: false };
    var z = [0];
    for (var t = 0; t < x.length; t++) {
      z.push(lambda * x[t] + (1 - lambda) * z[t]);
    }
    var violations = [];
    for (t = 1; t < z.length; t++) {
      // 控制限随 i 收紧：Lσ√(λ(1−(1−λ)^{2i})/(2−λ))
      var lim = L * Math.sqrt(lambda * (1 - Math.pow(1 - lambda, 2 * t)) / (2 - lambda));
      if (Math.abs(z[t]) > lim) violations.push(t - 1);
    }
    return { valid: true, z: z.slice(1), lambda: lambda, L: L, violations: violations };
  }

  /* 蒙特卡洛实测 ARL0：在标准正态白噪声下估计误报前平均场数 */
  function simulateArl0(opts, reps, rngSeedBase) {
    reps = reps || 400;
    var C = global.PAL.core;
    var rng = C.makeRng(rngSeedBase || 20260101);
    var arls = [];
    for (var r = 0; r < reps; r++) {
      var series = [];
      for (var t = 0; t < 200; t++) series.push(rng.norm());
      var res = ewma(series, opts);
      var firstViol = res.violations.length ? res.violations[0] + 2 : 201;
      arls.push(firstViol);
    }
    return { meanArl0: C.mean(arls), medianArl0: C.median(arls), q10: C.quantile(arls, 0.1) };
  }

  global.PAL = global.PAL || {};
  PAL.ewma = { ewmaChart: ewma, simulateArl0: simulateArl0 };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: difficulty.js ---- */
/* ============================================================
 * difficulty.js — 难度推断层：分-位联合的试卷难度形式化检测
 *
 * 问题：排名对卷面难度免疫（严格单调变换不变），分数不是。
 *       某场得分率显著低于「该潜分位所隐含的历史水平」→ 偏难信号。
 *
 * 方法（相对现有产品启发式的三重升级）：
 *  1. 映射曲线 m̂(z)：保序回归 + 线性回归的收缩混合
 *     （κ = n/(n+4)，样本少自动退向全局线性，避免过拟合）；
 *  2. 噪声模型：σ_total² = σ_binomial²(rate) + σ_personal²
 *     其中 σ_personal 由历史残差的 MAD 一致估计 —— 两类噪声源
 *     正交合成，替代原产品的单一自适应阈值；
 *  3. 判定输出为连续 evidence score（证据分数），而非把单学生
 *     数据包装成“试卷难度概率”。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * 用历史 (z, rate) 对拟合个人映射曲线
   */
  function fitMapping(pairs) {
    var n = pairs.length;
    var iso = C.isotonic(pairs.map(function (p) { return { x: p.z, y: p.rate, w: 1 }; }));
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) { sx += pairs[i].z; sy += pairs[i].rate; sxx += pairs[i].z * pairs[i].z; sxy += pairs[i].z * pairs[i].rate; }
    var den = n * sxx - sx * sx;
    var b = Math.abs(den) > 1e-12 ? (n * sxy - sx * sy) / den : 0;
    var a = sy / n - b * (sx / n);
    function linearAt(z) { return a + b * z; }
    var kappa = n / (n + 4);
    return {
      n: n, kappa: kappa,
      at: function (z) {
        var isoV = iso.sortedX.length > 1 ? C.interpAt(iso.sortedX, iso.sortedFit, z) : NaN;
        // 双保险：保序分支任何非有限值都退回全局线性（保守但绝不输出 NaN）
        if (!isFinite(isoV)) isoV = linearAt(z);
        var v = kappa * isoV + (1 - kappa) * linearAt(z);
        return isFinite(v) ? v : linearAt(z);
      }
    };
  }

  function binomSe(rate, M) {
    return Math.sqrt(Math.max(rate * (1 - rate), 1e-6) / Math.max(M || 100, 10));
  }

  /**
   * 序贯（因果、无泄漏）难度检测：
   * 对每个考试 t，仅用 t 之前的历史拟合映射与噪声尺度。
   * 方差分解：σ_total² = σ_binom² + σ_personal² + σ_map²
   *   σ_map² = σ_personal²·(1−κ)/κ · 外推因子 —— 映射曲线参数
   *   不确定性随历史长度 κ=n/(n+4) 收缩，避免早期过窄的伪显著。
   * @param series [{mainZ:{z,se}, rate, max}] 按时间序
   * @param opts {threshold=1.7, slope=1.1}
   */
  function detectDifficulty(series, opts) {
    opts = opts || {};
    var thr = opts.threshold || 1.7;
    var slopeK = opts.slope || 1.1;
    var out = [];
    var hist = [];
    var pastResid = [];
    for (var t = 0; t < series.length; t++) {
      var cur = series[t];
      if (!cur.mainZ || cur.rate == null || !(cur.max > 0)) { out.push({ valid: false }); continue; }
      if (hist.length >= 3) {
        var map = fitMapping(hist);
        var expected = map.at(cur.mainZ.z);
        var resid = cur.rate - expected;
        // 个人波动尺度：最近 ≤4 个残差的 RMSD（局部、低偏），下限为保守先验。
        // 首个评估点尚无历史残差 → 直接用先验下限（绝不做 0/0）
        var recent = pastResid.slice(-4);
        var personalSd = 0.035;
        if (recent.length > 0) {
          var rss0 = 0;
          for (var rr = 0; rr < recent.length; rr++) rss0 += recent[rr] * recent[rr];
          personalSd = Math.max(Math.sqrt(rss0 / recent.length), 0.035);
        }
        if (!isFinite(personalSd)) personalSd = 0.035;
        var sdTot = Math.sqrt(binomSe(cur.rate, cur.max) ** 2 + personalSd * personalSd);
        var finalZ = resid / sdTot;
        // 偏难：得分率低于潜分位隐含水平 → resid<0 → finalZ 负
        var pHard = C.sigmoid(-slopeK * (finalZ + thr));
        var pEasy = C.sigmoid(slopeK * (finalZ - thr));
        out.push({
          valid: true,
          expectedRate: expected,
          rate: cur.rate,
          resid: resid,
          sdTotal: sdTot,
          personalSd: personalSd,
          z: finalZ,
          pHard: pHard,
          pEasy: pEasy,
          evidenceHard: pHard,
          evidenceEasy: pEasy,
          verdict: pHard > 0.6 ? 'hard' : (pEasy > 0.6 ? 'easy' : 'normal'),
          mappingN: hist.length,
          shrinkage: map.kappa
        });
        pastResid.push(resid);
      } else {
        out.push({ valid: false, reason: 'insufficient-history' });
      }
      hist.push({ z: cur.mainZ.z, rate: cur.rate });
    }
    return out;
  }

  global.PAL = global.PAL || {};
  PAL.difficulty = { fitMapping: fitMapping, detectDifficulty: detectDifficulty, binomSe: binomSe };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: alerts.js ---- */
/* ============================================================
 * alerts.js — 推断层：洞察流的 FDR 多重检验控制
 *
 * 产品每次生成 N 条「提醒」（趋势/退步/难度/失常），若各自按
 * α=0.05 判定，族错误率随 N 线性膨胀。Benjamini–Hochberg (1995)
 * step-up 过程控制错误发现率（FDR）≤ q，让洞察流拥有显式的
 * 「误报预算」—— 这是把规则引擎升级为统计推断的关键一步。
 * ============================================================ */
(function (global) {
  'use strict';

  /**
   * BH step-up
   * @param tests [{id, p, ...}]  p 缺失的项直接放行（不参与校正）
   * @param q 目标 FDR 水平（默认 0.10）
   * @returns {rejected: Set(id), adjusted: Map(id→q_adj)}
   */
  function bhFdr(tests, q) {
    q = q == null ? 0.10 : q;
    var valid = tests.filter(function (t) { return typeof t.p === 'number' && t.p === t.p; });
    var sorted = valid.slice().sort(function (a, b) { return a.p - b.p; });
    var m = sorted.length;
    var rejected = {}, kMax = -1, adj = {};
    if (m) {
      for (var k = m - 1; k >= 0; k--) {
        var crit = (k + 1) / m * q;
        if (sorted[k].p <= crit) { kMax = k; break; }
      }
      // step-up：所有 ≤ kMax 的都拒绝
      var prev = 1;
      for (k = m - 1; k >= 0; k--) {
        var raw = sorted[k].p * m / (k + 1);
        prev = Math.min(prev, raw);
        adj[sorted[k].id] = Math.min(prev, 1);
        if (k <= kMax) rejected[sorted[k].id] = true;
      }
    }
    return { rejected: rejected, adjusted: adj, m: m };
  }

  global.PAL = global.PAL || {};
  PAL.alerts = { bhFdr: bhFdr };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: goals.js ---- */
/* ============================================================
 * goals.js — 决策层：概率化目标校准
 *
 * 把「下次要进前 X%」从口号变成带概率的决策问题：
 *   可达性  = P(z_next ≥ z_target | 历史轨迹, 测量噪声)
 *   推荐目标 = 后验预测分布的 (1−aspiration) 分位对应的位次
 *   分数换算 = 经个人映射曲线 m̂(z) + 难度中性化
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  /**
   * @param pred   dynamics.robustFilter 的 predictive
   * @param targetPctile 目标位比百分数（如 20 表示前 20%）
   */
  function feasibility(pred, targetPctile) {
    // 约定：潜分 z 越大越好。前 x% ⇔ cohort 中领先比例 ≥ 1−x/100 ⇔ z ≥ Φ⁻¹(1−x/100)
    var zTarget = C.invNorm(1 - targetPctile / 100);
    return {
      zTarget: zTarget,
      prob: PAL.dynamics.probReach(pred, zTarget)
    };
  }

  /* 给定抱负水平（如 0.6），推荐「六成把握冲得到」的目标位比：
     目标达成概率 = 后验预测生存函数，解 survival(z*) = aspiration，
     z* 位于预测中位之下（比典型水平略松、跳一跳够得着） */
  function recommend(pred, aspiration) {
    aspiration = aspiration == null ? 0.6 : aspiration;
    var zStar = PAL.dynamics.predQuantile(pred, aspiration);
    // z → 位比：P(cohort ≥ z)，正态假设下
    var pctile = 100 * (1 - C.normCdf(zStar));
    return { aspiration: aspiration, z: zStar, targetPercentile: pctile };
  }

  /* 目标分数换算：经个人映射曲线 + 该场难度中性化 */
  function scoreForTarget(mappingFit, targetPctile, difficultyOffset) {
    if (!mappingFit || mappingFit.n < 3) return null;
    var z = C.invNorm(1 - targetPctile / 100);
    var rate = mappingFit.at(z) + (difficultyOffset || 0);
    return { z: z, expectedRate: Math.min(Math.max(rate, 0), 1) };
  }

  global.PAL = global.PAL || {};
  PAL.goals = { feasibility: feasibility, recommend: recommend, scoreForTarget: scoreForTarget };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* ---- PAL2 kernel: pipeline.js ---- */
/* ============================================================
 * pipeline.js — 端到端分析流水线
 *
 * 输入：某学生某科（或总分）的时间序列观测
 *   [{ date, rank, N, classRank, classN, score, max }]
 * 输出：结构化分析报告 —— 每条结论都携带方法、统计量与不确定性，
 *       并经 BH-FDR 统一控制误报预算。
 * ============================================================ */
(function (global) {
  'use strict';
  var C = global.PAL.core;

  function analyzeSeries(observations, opts) {
    opts = opts || {};
    var report = { n: observations.length, valid: observations.length >= 2 };
    /* t 分布分位数（二分求逆）：展示区间与目标概率同用 Student-t 参照 */
    function tQuant(df, prob) {
      var lo = -12, hi = 12;
      for (var b = 0; b < 60; b++) {
        var mid = (lo + hi) / 2;
        if (PAL.core.tCdf(mid, df) < prob) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    /* 1. 测量层 */
    var zs = [];
    for (var i = 0; i < observations.length; i++) {
      var o = observations[i];
      var pos = PAL.measurement.positionToZ(o.rank, o.N);
      if (!pos) continue;
      zs.push({
        z: pos.z, se: pos.se, p: pos.p,
        rate: o.max ? o.score / o.max : null,
        max: o.max || null,
        date: o.date, label: o.label || ('#' + (i + 1))
      });
    }
    if (zs.length < 2) { report.valid = false; report.reason = '有效位比观测不足'; return report; }
    report.series = zs;

    /* 2. 动态层：稳健滤波（第一遍）+ BOCPD + 干预后重滤波
       机制：BOCPD 判定体制切换的场次的下一场，对 DLM 执行协方差膨胀干预，
       使水平估计快速跳到新体制，消除突变后的滞后偏差（West & Harrison 干预分析） */
    /* 消融开关仅用于 research 回测：seWeighting=false 时给所有观测
       相同标准误，检验参考人数带来的异方差权重是否真正有贡献。 */
    var commonSe = opts.commonSe != null ? opts.commonSe : 0.10;
    var zObs = zs.map(function (d) {
      return { z: d.z, se: opts.seWeighting === false ? commonSe : d.se };
    });
    var filt1 = PAL.dynamics.robustFilter(zObs, opts.filter);
    var cp = PAL.bocpd.run(zs.map(function (d) { return d.z; }), opts.bocpd);
    /* 干预门控：仅当「疑似断点之前存在已确立的体制」（MAP 游程≥5）
       且越过预热期时才触发，避免冷启动期 rc≡1 造成伪干预 */
    var interventions = zs.map(function (_, t) {
      if (t < 6) return false;
      return cp.recentChangeProb[t - 1] > (opts.interventionThreshold || 0.5) &&
        cp.mapRunLength[t - 2] >= 5;
    });
    /* 趋势检验（原始 z 序列）——同时作为趋势阻尼的证据门控 */
    var zVals = zs.map(function (d) { return d.z; });
    var mkRaw = PAL.trendTest.mannKendall(zVals);
    var filt = PAL.dynamics.robustFilter(zObs, {
      filter: null,
      discountMu: opts.filter && opts.filter.discountMu,
      discountBeta: opts.filter && opts.filter.discountBeta,
      df: opts.filter && opts.filter.df,
      iters: opts.filter && opts.filter.iters,
      interventions: interventions,
      /* 证据门控趋势阻尼：仅当原始 z 序列存在显著趋势（E2 验证的
         Mann–Kendall 检验）时保留外推，否则完全放弃——真实回测显示
         无证据动量在均值回归下反向，φ=0 的 MAE 与方向均最优（§4.5） */
      damping: opts.trend === false ? 0 :
        (mkRaw.valid && mkRaw.significant ? 0.7 : 0)
    });
    report.filter = filt;
    report.filterFirstPass = filt1;
    report.interventions = interventions;
    report.changepoint = cp;
    report.trend = {
      mk: mkRaw,
      ols: PAL.trendTest.olsTrend(zVals)
    };

    /* 5. EWMA 渐进劣化预警：用一步预测标准化残差 */
    var stdResid = [];
    for (i = 0; i < zs.length; i++) {
      if (i === 0 || !filt.preds || !filt.preds[i - 1]) { stdResid.push(0); continue; }
      var pr = filt.preds[i - 1];
      var r = zs[i].z - pr.f;
      stdResid.push(r / Math.sqrt(Math.max(pr.q, 1e-9)));
    }
    report.stdResiduals = stdResid;
    report.ewma = PAL.ewma.ewmaChart(stdResid.slice(1), opts.ewma);

    /* 5b. 滚动共形校准 + 先验收缩（真实回测 §4.5 的修复，默认开启）
       残差以前向预测尺度为参照（与部署预测同一参照系）。
       k̂ = 序列过去 |残差| 的 Q(conformalQ) 分位数；历史 <5 时向
       保守总体先验 conformalPriorK 收缩：k = (m·k_m + W·K_p)/(m+W)。
       只放宽不收紧（k≥1）。合成实验可用 opts.conformal=false 关闭 */
    var pred = filt.predictive;
    var absR = [];
    if (pred && filt.predScales && filt.preds) {
      for (i = 1; i < zs.length; i++) {
        if (!filt.preds[i - 1] || !filt.predScales[i]) continue;
        var eC = zs[i].z - filt.preds[i - 1].f;
        if (isFinite(eC)) absR.push(Math.abs(eC) / filt.predScales[i]);
      }
    }
    if (pred && opts.conformal !== false && absR.length >= 1) {
      absR.sort(function (a, b) { return a - b; });
      var cq = opts.conformalQ || 0.95;
      var qIdx = Math.min(absR.length - 1, Math.floor(cq * absR.length));
      /* 先验来自 database0 全库回测的经验定标（用户已知情同意）：
         达到名义95%覆盖需要的尺度因子中位约 6；收缩权重 W=8 */
      var W = opts.conformalPriorW != null ? opts.conformalPriorW : 8;
      var Kp = opts.conformalPriorK != null ? opts.conformalPriorK : 6;
      var m0 = absR.length;
      var kq = (m0 * absR[qIdx] + W * Kp) / (m0 + W);
      kq = Math.max(1, Math.min(kq, 14));
      if (isFinite(kq)) {
        /* kq 是「半宽倍数」：目标半宽 = kq·scaleRaw。
           消费者约定 scale 配标准 t 分位数使用，
           故换算 scaleNew = kq/t_{0.975,df} · scaleRaw，
           并限制收缩幅度（最多收到原尺度的 0.8 倍） */
        var tqLo = -8, tqHi = 8;
        for (var bi = 0; bi < 50; bi++) {
          var bm = (tqLo + tqHi) / 2;
          if (C.tCdf(bm, pred.df) < 0.975) tqLo = bm; else tqHi = bm;
        }
        var tq = (tqLo + tqHi) / 2;
        var ratio = kq / tq;
        ratio = Math.max(ratio, 0.8);
        pred.scaleRaw = pred.scale;
        pred.scale = pred.scale * ratio;
        pred.conformalK = kq;
        pred.calibrated = m0 >= 5; // 达到完全校准门槛（未达=先验主导）
      }
    }

    /* 6. 下一场后验预测的展示量（用校准后的尺度；t 分位与推断层一致） */
    if (pred) {
      var tq95 = tQuant(pred.df, 0.975);
      report.nextExam = {
        medianZ: pred.location,
        ci95: [
          pred.location - tq95 * pred.scale,
          pred.location + tq95 * pred.scale
        ],
        medianPercentile: 100 * (1 - C.normCdf(pred.location)),
        ci95Percentile: [
          100 * (1 - C.normCdf(pred.location + tq95 * pred.scale)),
          100 * (1 - C.normCdf(pred.location - tq95 * pred.scale))
        ]
      };
    }

    /* 7. 难度推断（有分数时） */
    if (zs.some(function (d) { return d.rate != null; })) {
      report.difficulty = PAL.difficulty.detectDifficulty(
        zs.map(function (d) { return { mainZ: { z: d.z, se: d.se }, rate: d.rate, max: d.max }; })
      );
    }

    /* 8. 目标校准 */
    if (filt.predictive && opts.targetPercentile != null) {
      report.goal = PAL.goals.feasibility(filt.predictive, opts.targetPercentile);
      report.recommendedGoal = PAL.goals.recommend(filt.predictive, opts.aspiration);
    }

    return report;
  }

  /**
   * 组合级分析：多科报告 + FDR 控制的洞察流
   * @param bySubject { 科目名: observations[] }
   * @param targets { 科目名: 目标前% } 可选
   */
  function analyzePortfolio(bySubject, targets, opts) {
    opts = opts || {};
    var reports = {}, tests = [];
    Object.keys(bySubject).forEach(function (s) {
      var rep = analyzeSeries(bySubject[s], { targetPercentile: targets && targets[s] });
      reports[s] = rep;
      if (!rep.valid) return;
      if (rep.trend.mk.valid) tests.push({ id: 'trend:' + s, kind: 'trend', subject: s, p: rep.trend.mk.p, direction: rep.trend.mk.direction });
      rep.changepoint.changeProb.forEach(function (pc, t) {
        if (t > 0 && pc > 0.35) tests.push({ id: 'cp:' + s + ':' + t, kind: 'changepoint', subject: s, index: t, p: Math.min(pc, 0.999), prob: pc });
      });
      if (rep.ewma.violations.length) {
        // EWMA 违限的近似 p：正态尾（保守）
        rep.ewma.violations.forEach(function (v) {
          var zz = rep.ewma.z[v] / (rep.ewma.L / 3);
          var pv = 2 * (1 - C.normCdf(Math.abs(zz)));
          tests.push({ id: 'ewma:' + s + ':' + v, kind: 'decline-early-warning', subject: s, index: v, p: Math.max(pv, 1e-6), ewmaZ: rep.ewma.z[v] });
        });
      }
      if (rep.difficulty) {
        rep.difficulty.forEach(function (d, t) {
          if (d.valid && d.verdict !== 'normal') {
            // 单侧检验：H0=正常卷 → 残差 z 服从 N(0,1)。
            // p = Φ(z)（偏难）或 Φ(−z)（偏易），与 E4 操作曲线度量一致；
            // 校准概率 pHard/pEasy 仅作为展示层输出，不参与检验换算。
            var pvDiff = d.verdict === 'hard' ? C.normCdf(d.z) : 1 - C.normCdf(d.z);
            tests.push({ id: 'diff:' + s + ':' + t, kind: 'difficulty', subject: s, index: t, p: Math.min(Math.max(pvDiff, 1e-6), 0.999), verdict: d.verdict, pHard: d.pHard, pEasy: d.pEasy, z: d.z });
          }
        });
      }
    });
    var fdr = PAL.alerts.bhFdr(tests, opts.fdrQ);
    var insights = tests.map(function (t) {
      var copy = {};
      for (var k in t) copy[k] = t[k];
      copy.passesFdr = !!fdr.rejected[t.id];
      copy.qAdj = fdr.adjusted[t.id];
      return copy;
    });
    return { reports: reports, insights: insights, fdrQ: opts.fdrQ || 0.10, nTests: tests.length };
  }

  global.PAL = global.PAL || {};
  PAL.pipeline = { analyzeSeries: analyzeSeries, analyzePortfolio: analyzePortfolio };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* deep-beta-main.js · 深度分析(Beta) 主源码 —— 由 build-deep-beta.js 与 research 内核合成 app-v34.js
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
  function prodExams() {
    try { if (typeof allExamsV32 === "function") return allExamsV32() || []; } catch (e) { }
    try { var s = state; if (s && s.exams) return s.exams || []; } catch (e) { }
    return [];
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
  var S = { cur: "__total__", goalPct: 20, distBin: 5, view: "band" };
  var REP = null; /* 当前报告缓存,供交互处理器使用 */

  /* ---------- 历史滚动预测回显 ---------- */
  function walkForward(obs) {
    var out = [];
    for (var k = 4; k < obs.length; k++) {
      try {
        var r = P2.pipeline.analyzeSeries(obs.slice(0, k));
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
    return '<span class="label">视图：</span>' +
      views.map(function (v) {
        return '<button type="button" class="' + chipCls(S.view === v.k) +
          '" data-dsb-view="' + v.k + '">' + v.t + '</button>';
      }).join('');
  }
  function dModeAndGoalMarks(rep, xOf, ihG) {
    /* 最可能点(中位)与目标的虚线标注 */
    var md = rep.nextExam ? rep.nextExam.medianPercentile : null;
    var out = "";
    if (md != null && md > 0.3 && md < 99.7) {
      var mx = xOf(md);
      out += '<line x1="' + mx.toFixed(1) + '" y1="4" x2="' + mx.toFixed(1) +
        '" y2="' + (20 + ihG) + '" stroke="#4a90d9" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>' +
        '<text x="' + (mx + 4).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">最可能 前' +
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
      var NB = 20, zBin = zRange / NB;
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
          '<text x="' + Math.min(mdX + 4, W - 90).toFixed(1) + '" y="23" font-size="9" fill="#4a90d9">最可能 前' +
          pct1(md) + '%</text>';
      }
      var gxZ = clampX(xOfP(S.goalPct));
      marksZ += '<line x1="' + gxZ.toFixed(1) + '" y1="4" x2="' + gxZ.toFixed(1) +
        '" y2="' + (20 + ih) + '" stroke="#d4574e" stroke-width="1.4" stroke-dasharray="4 3"/>' +
        '<text x="' + (gxZ + 4).toFixed(1) + '" y="13" font-size="9.5" fill="#d4574e">目标 前' +
        S.goalPct + '%</text>';
      svg = barsZ + labelsZ + marksZ;
      caption = '横轴=「发挥距离」标尺：同样 2 个名次点，越靠前对应的发挥距离越大（名次刻度按真实位置标注）。' +
        '每根柱宽度 = <b>相等的一段发挥距离</b>，柱高 = 该发挥段的命中概率 —— 柱与柱完全可比，' +
        '<span style="color:#4a90d9">最高柱=最可能点</span>。蓝色柱=达成目标前' + S.goalPct + '% 的区域';
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
          '曲线过半点 = 最可能 前' + pct1(md) + '%</text>';
      }
      var labelsCum = "";
      [0, 10, 20, 25, 50, 75, 90, 100].forEach(function (tk) {
        labelsCum += '<text x="' + (padL + iw * tk / 100).toFixed(1) + '" y="' + (H - 4) +
          '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">前' + tk + '%</text>';
      });
      svg = cumSvg + labelsCum + marksCum;
      caption = '曲线 = 「落到前X%以内」的累计命中概率：在横轴找目标名次、沿竖线到曲线、再横着读概率（如考进前' + S.goalPct +
        '% ≈ <b>' + Math.round(cumGoal * 100) + '%</b>）。曲线爬过 50% 横线的点 = 最可能点（' + (md != null ? '前' + pct1(md) + '%' : '—') + '）。';
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
      caption = '柱子 = 该名次段的命中概率（柱高=柱顶数字）；<b style="color:#4a90d9">蓝色曲线</b> = 概率密度，峰即<b>最可能点</b>（蓝色虚线处）。' +
        '命中前' + S.goalPct + '% 的概率 ≈ <b>' + Math.round(pGoal * 100) + '%</b>';
    }
    var binChips = view === "band"
      ? [2, 3, 5, 10].map(function (bn) {
        return '<button type="button" class="' + chipCls(bin === bn) +
          '" data-dsb-bin="' + bn + '">每格' + bn + '%</button>';
      }).join('')
      : "";
    return '<div class="combo-chips-v25" style="margin-bottom:8px">' + dViewChips() +
      (view === "band"
        ? '<span class="label">细度：</span>' + binChips
        : '<span class="label" style="opacity:.55">视图间可切换</span>') +
      '</div>' +
      '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:760px;display:block;color:inherit">' +
      svg + "</svg>" +
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
      '▸ ' + title + '</summary>' +
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
    return details('趋势检验（通过才算数的那个）',
      '<div style="font-size:14px;font-weight:600">' + verdict + '</div>' +
      '<div style="font-size:12px;opacity:.75;margin-top:4px">Mann–Kendall 检验 p = ' +
      (mk.valid ? mk.p.toFixed(3) : '—') + '（α=0.05）' + senTxt +
      '<br>口径说明：「动量」是描述性规则；这里只陈述通过统计检验的结论。</div>');
  }

  function signalsDetails(rep) {
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    var ev = rep.ewma || {};
    var evTxt = (ev.violations && ev.violations.length)
      ? '⚠ 第 ' + ev.violations.map(function (v) { return v + 2; }).join('、') + ' 场出现异动信号'
      : '无异动信号';
    var nInterv = rep.interventions.filter(Boolean).length;
    return details('体制信号（变点 + 渐进预警）',
      '<div style="font-size:13px;line-height:1.7">' +
      '近期体制变化概率：<b>' + cpLast.toFixed(2) + '</b>' +
      (cpLast > 0.5 ? '（偏高——最近的成绩结构可能已切换）' : '') +
      '；历史触发重估 ' + nInterv + ' 次<br>' +
      'EWMA 渐进劣化监测：' + evTxt + '</div>');
  }

  function difficultyDetails(rep) {
    var darr = rep.difficulty;
    if (!Array.isArray(darr) || !darr.length) return '';
    var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
    var ne2 = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
    return details('试卷难度推断',
      '<div style="font-size:13px">逐卷检验：判为难卷 <b>' + nh + '</b> 场、易卷 <b>' + ne2 +
      '</b> 场。难卷场次的位比波动已在模型中自动降权。</div>');
  }

  /* ---------- 计算过程:「计算收据」三层 ---------- */
  /* 第二层主体:用用户真实数据把整笔账算一遍 */
  function receiptInner(rep, obs) {
    var ne = rep.nextExam;
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
      var flag = w < 0.7 ? ' <span style="color:#d4574e;font-size:10px">⚠失常降权</span>' : "";
      rows += '<tr>' +
        '<td style="padding:3px 8px;opacity:.8">#' + (i + 1) + '</td>' +
        '<td style="padding:3px 8px">前' + pct0(o.rank / o.N * 100) + '%（' + o.rank + '/' + o.N + '）</td>' +
        '<td style="padding:3px 8px">' + (z != null ? z.toFixed(2) : "—") + '</td>' +
        '<td style="padding:3px 8px">' + w.toFixed(2) + flag + '</td></tr>';
    }
    var dampNote = (Math.abs(beta) > 1e-9 && Math.abs(effShift - beta) > 1e-9)
      ? '原始势头 ' + fs2(beta) + '，历史证明势头不常延续，只采纳 → ' + fs2(effShift)
      : '采纳全部趋势 ' + fs2(beta);
    var stepStyle = 'font-size:12.5px;line-height:1.9';
    return '<div style="' + stepStyle + '">' +
      '<div style="font-weight:600;margin-bottom:4px">第 1 步 · 你的每场比赛换算成标准分</div>' +
      '<table style="border-collapse:collapse;width:100%;font-size:12px">' +
      '<tr style="opacity:.55"><th style="text-align:left;padding:3px 8px">场次</th>' +
      '<th style="text-align:left;padding:3px 8px">位比</th>' +
      '<th style="text-align:left;padding:3px 8px">标准分 z</th>' +
      '<th style="text-align:left;padding:3px 8px">该场权重</th></tr>' + rows + "</table>" +
      '<div style="font-size:11px;opacity:.6;margin:2px 0 10px">权重低 = 这场被视为发挥失常/异常，几乎不影响后面的估计。</div>' +

      '<div style="font-weight:600;margin-top:10px">第 2 步 · 合成你的真实水平</div>' +
      '<div>加权稳定点 μ̂ = <b>' + lastMu.toFixed(2) + '</b></div>' +

      '<div style="font-weight:600;margin-top:10px">第 3 步 · 走到下一场</div>' +
      '<div>' + lastMu.toFixed(2) + ' <b>' + fs2(effShift) + '</b> = <b>' +
      pred.location.toFixed(2) + '</b>　<span style="font-size:11px;opacity:.65">' + dampNote + '</span></div>' +

      '<div style="font-weight:600;margin-top:10px">第 4 步 · 定波动范围</div>' +
      '<div>你平时的起伏 ±' + (pred.scaleRaw || pred.scale).toFixed(2) +
      (pred.conformalK != null ? '，按你历史误差放大 ×' + pred.conformalK.toFixed(2) +
        ' ⇒ ±<b>' + pred.scale.toFixed(2) + '</b>' : '') + '</div>' +

      '<div style="font-weight:600;margin-top:10px">第 5 步 · 换回名次，得到最终答案</div>' +
      '<div style="font-size:14px">最可能 <b>前' + pct1(ne.medianPercentile) + '%</b>；95%区间 ' +
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
      '· 测量层：位比 <i style="' + mth + '">r/N</i> 经 Blom 分数 <span style="' + mth + '">z = Φ<sup>−1</sup>((r−0.375)/(N+0.25))</span> 嵌入，解析 <span style="' + mth + '">se ≈ √(p(1−p)/N)</span><br>' +
      '· 动态层：局部线性 DLM（折扣 <span style="' + mth + '">δ<sub>μ</sub>=0.96, δ<sub>β</sub>=0.90</span>），观测噪声 Student-t(<i style="' + mth + '">ν</i>=6) IRLS 稳健加权；σ²<sub>day</sub> 由一步残差 MAD 学习、六折计入预测<br>' +
      '· 变点层：BOCPD(NIG) 体制切换概率 &gt;0.5 且 MAP 游程≥5 时，下一场协方差膨胀干预 ×40<br>' +
      '· 趋势门控：原始 z 序列 MK 检验显著 → μ̂+0.7β，否则 φ=0<br>' +
      '· 共形校准：前向尺度参照残差取 Q95，先验 K=6 收缩 W=8，除以 t<sub>0.975,6</sub> 换算标准尺度<br>' +
      '· 推断层：MK+Sen 主检验、EWMA(λ=.3, L=2.815)、BH-FDR q=0.10 统一预算<br>' +
      '· 区间：t(df=6) 后验分位数</div>');
    return details('📋 怎么算的？', inner + l3);
  }

  /* ---------- 默认可见区:预测主卡 ---------- */
  function mainCard(rep, obsN) {
    var ne = rep.nextExam;
    if (!ne) return '';
    var pred = rep.filter.predictive;
    var mu = rep.filter.mu[rep.filter.mu.length - 1];
    var pc = function (z) { return 100 * (1 - C.normCdf(z)); };
    var calib = pred.conformalK != null
      ? '×' + pred.conformalK.toFixed(2) + (pred.calibrated ? '' : '（先验主导）')
      : '未启用';
    return '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end">' +
      '<div><div style="font-size:11px;opacity:.6">下场最有可能</div>' +
      '<div style="font-size:20px;font-weight:700">前 ' + pct1(ne.medianPercentile) + '%</div>' +
      '<div style="font-size:11px;opacity:.55">由稳定水平 前' + pct1(pc(mu)) + '% 推算</div>' +
      '<div style="font-size:10px;opacity:.45;margin-top:3px">↑ 已剔除失常场次的影响</div></div>' +
      '<div><div style="font-size:11px;opacity:.6">下场预测（95%区间）</div>' +
      '<div style="font-size:20px;font-weight:700">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</div>' +
      '<div style="font-size:11px;opacity:.55">最可能 前' + pct1(ne.medianPercentile) +
      '% · 区间校准 ' + calib + '</div>' +
      '<div style="font-size:10px;opacity:.45;margin-top:3px">↑ 水平 ± 平时起伏' +
      (pred.conformalK != null ? ' × 你的历史误差' : '') + '</div></div>' +
      '<div style="flex:1;min-width:200px">' +
      '<div style="font-size:11px;opacity:.6;margin-bottom:4px">下次考进前 X%？</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<input id="dsbGoalPct" type="number" min="1" max="99" step="1" value="20" ' +
      'style="width:56px;padding:3px 8px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font-size:13px">' +
      '<button id="dsbGoalBtn" style="padding:4px 12px;font-size:12.5px;border-radius:8px;' +
      'border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer">算概率</button>' +
      '<span id="dsbGoalOut" style="font-size:15px;font-weight:700"></span></div></div>' +
      '</div>' +
      '<div class="dsb-tip"><b>怎么读这张卡：</b>你的稳定水平大约在<b>前 ' + pct1(pc(mu)) + '%</b>；下次考试大概率落在' +
      '<span style="color:#4a90d9">前' + pct0(ne.ci95Percentile[0]) + '% ~ 前' +
      pct0(ne.ci95Percentile[1]) + '%</span>之间。下方竖须就是过去每次「当时预测 vs 实际结果」；' +
      '点开「📋 怎么算的？」可查看本页每个数字的计算过程。</div>';
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
    var xlbl = '<text x="' + xOf(0) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" opacity=".45">#1</text>' +
      '<text x="' + xOf(n - 1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="middle" fill="currentColor" opacity=".45">#' + n + '</text>' +
      '<text x="' + (fx1) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="#4a90d9" opacity=".8">下场</text>';
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
      items.push({ t: mk.s > 0 ? "整体呈显著上升趋势" : "整体呈显著下降趋势",
        ev: "Mann–Kendall p=" + mk.p.toFixed(3) });
    }
    var cpLast = rep.changepoint.recentChangeProb[rep.changepoint.recentChangeProb.length - 1];
    if (cpLast > 0.5) items.push({ t: "最近的成绩结构可能已切换（如难度/状态突变）", ev: "体制变化概率 " + cpLast.toFixed(2) });
    var ev = rep.ewma || {};
    if (ev.violations && ev.violations.length) {
      items.push({ t: "第 " + ev.violations.map(function (v) { return v + 2; }).join("、") +
        " 场出现渐进异动信号", ev: "EWMA 控制图违限" });
    }
    var darr = rep.difficulty;
    if (Array.isArray(darr) && darr.length) {
      var nh = darr.filter(function (d) { return d.pHard > 0.4; }).length;
      var nea = darr.filter(function (d) { return d.pEasy > 0.4; }).length;
      if (nh || nea) items.push({ t: "有 " + nh + " 场难卷、" + nea + " 场易卷被判出（位比波动已降权处理）", ev: "逐卷检验 P>0.4" });
    }
    if (!items.length) items.push({ t: "成绩以正常波动为主，无显著趋势或异动信号", ev: "全部检验未触发" });
    items.push({ t: "预测区间按你近 " + obsN + " 场的波动幅度校准，真实回测覆盖94.9%", ev: "滚动共形" });
    return '<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.85">' +
      items.slice(0, 4).map(function (it) {
        return "<li>" + esc(it.t) + ' <span style="font-size:10.5px;opacity:.5">[' + esc(it.ev) + "]</span></li>";
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
    var exams = examsOverride || prodExams();
    var combo = curCombo();
    var obs = combo ? obsCombo(exams, combo)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));

    /* 学科 chips:按有效场数排序;不足4场的折叠置灰并说明原因 */
    var caliber = totalCaliber(exams);
    var totalLabel = '总分';
    if (caliber) totalLabel += caliber.kind === 'grade' ? ' · 年级口径' : ' · 组合口径?';
    var entries = subjectList(exams).map(function (s) {
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
        '⚠ 总分参与人数(' + caliber.totalN + ') ≤ 单科最大池(' + caliber.maxSubN +
        ')——疑似<b>组合内排名</b>而非全年级。组合口径衡量你在同选科群体中的位置，与年级口径含义不同；' +
        '系统按录入原样分析，解读时注意口径。</p>';
    }

    var body;
    if (obs.length < 4) {
      body = '<div style="font-size:13px;opacity:.75;padding:6px 0 2px">' +
        (combo ? '组合「' + esc(combo.name) + '」没有填写过「组合年排」，' : '该序列') +
        '有效位比观测不足 4 场，暂无法建模。' +
        (combo ? '在考试录入弹窗为组合填写「组合年排名次/年级人数」后即可解锁。' : '') + '</div>';
    } else {
      var rep = P2.pipeline.analyzeSeries(obs);
      if (!rep.valid) {
        body = '<div style="font-size:13px;opacity:.75">数据未通过有效性检查。</div>';
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
            hitN + '/' + hist.length + '）· 竖须上蓝点=当时认为最可能的位置 · '
          : '';
        var trajCap = '灰点=每场实际位比（<span style="color:#2e9e6b">绿圈</span>=落在当时预测区间内） · 蓝线=滤波真实水平 · ' +
          '阴影带=水平估计的可信范围（<b>不是</b>预测区间，预测区间是更宽的竖须） · ' +
          '右侧色阶扇区=下场落点概率密度（越深越接近最可能点，即蓝色虚线处） · ' + histNote;
        body = '<div class="dsb-block-title">下一场预测（主结论）</div>' +
          mainCard(rep, obs.length) +
          '<div class="dsb-block-title">本 期 洞 察</div>' +
          insightsList(rep, obs.length) +
          '<div class="dsb-fig" style="margin-top:14px"><div class="dsb-fig-title">排名轨迹与预测区间</div>' +
          trajectorySvg(rep, obs, hist) +
          '<div class="dsb-fig-cap">' + trajCap + '</div></div>' +
          '<div class="dsb-fig" style="margin-top:12px"><div class="dsb-fig-title">下一场落点分布</div>' +
          '<div id="dsbDistWrap">' + distBlock(rep) + '</div></div>' +
          '<div class="dsb-block-title">算法细节（点开查看各自推导）</div>' +
          '<div class="dsb-grid2">' +
          trendDetails(rep) + signalsDetails(rep) + difficultyDetails(rep) +
          calcDetails(rep, obs) + '</div>';
      }
    }

    return '<div id="dsbRoot" class="card" style="padding:16px 18px;margin-top:14px">' +
      '<div class="dsb-head">' +
      '<span style="font-size:15px;font-weight:700">⑨ 深度分析</span>' +
      '<sup style="font-size:9.5px;opacity:.55">Beta</sup>' +
      '<span class="dsb-note">研究版统计算法 · 所有数字都可展开看推导 · ⓘ 数据实时在本机计算</span></div>' +
      '<div style="margin:2px 0 10px">' +
      (comboList().length ? '<div class="combo-chips-v25">' + comboChipsHtml(combo) + '</div>' : '') +
      '<div class="combo-chips-v25"><span class="label">单科：</span>' + chips + '</div>' +
      '</div>' +
      caliberNote +
      body +
      '</div>';
  }

  /* ---------- 文档级事件委托(chips 与目标按钮在重渲染后依然可用) ---------- */
  function curReport() {
    var exams = prodExams();
    var cob = curCombo();
    var obs = cob ? obsCombo(exams, cob)
      : (S.cur === '__total__' ? obsTotal(exams) : obsSubject(exams, S.cur));
    if (obs.length < 4) return null;
    try { return P2.pipeline.analyzeSeries(obs); } catch (e) { return null; }
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
    var viewChip = t.closest("[data-dsb-view]");
    if (viewChip) {
      S.view = viewChip.getAttribute("data-dsb-view") || "band";
      renderDistInto();
      return;
    }
    var chip = t.closest("[data-dsb-subj]");
    if (chip) {
      S.cur = chip.getAttribute("data-dsb-subj");
      refresh();
      track("deep_beta_switch", { subject: S.cur });
      return;
    }
    var coc = t.closest("[data-dsb-combo]");
    if (coc) {
      var cid = coc.getAttribute("data-dsb-combo");
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
      if (!rep || !rep.filter.predictive) { out.textContent = "—"; return; }
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
      '#dsbRoot .dsb-block-title{font-size:12.5px;font-weight:700;margin:14px 0 8px;letter-spacing:1px;opacity:.85}' +
      '#dsbRoot .dsb-grid2{display:grid;gap:12px}' +
      '@media(min-width:900px){#dsbRoot .dsb-grid2{grid-template-columns:1fr 1fr}}' +
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
  function mountIfMissing() {
    if (!pageIsStats()) return;
    var c = document.getElementById("content");
    if (!c) return;
    if ($("#dsbRoot", c)) return;           /* 已挂载 */
    if (!c.firstElementChild) return;        /* 统计页还没渲染好 */
    /* 插在「数据质量与方法论」(⑩)之前 → 深度分析=⑨ 紧随全量矩阵(⑧)。
       注意: quality 卡位于 .sv31-page 内部,不能要求它是 #content 的直接子级,
       否则整块会被追加到页面末尾,出现「⑩ 排到 ⑨ 前面」 */
    var q = c.querySelector(".sv31-quality");
    if (q) q.insertAdjacentHTML("beforebegin", sectionHtml());
    else c.insertAdjacentHTML("beforeend", sectionHtml());
  }
  function refresh() {
    var root = $("#dsbRoot");
    if (!root) { mountIfMissing(); return; }
    root.outerHTML = sectionHtml();
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
    analyze: function (obs) { return P2.pipeline.analyzeSeries(obs); },
    sectionHtml: sectionHtml,
    refresh: refresh,
    mountIfMissing: mountIfMissing,
    setSubject: function (s) { S.cur = s; },
    shadowKey: LS_SHADE
  };
})();


window.PAL2 = PAL2NS; /* 主源码经 window.PAL2 取内核 */
})();

