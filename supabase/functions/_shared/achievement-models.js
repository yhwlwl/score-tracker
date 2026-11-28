/* Generated from score-worth-model.js and app-v34.js production kernel. Keep in sync. */
(function(g){const window={}; var PAL=window.PAL={};
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
   * 下一场位比点预测。alpha 表示最近一场的权重。
   * 与论文真实数据回测保持同一口径：输入为原始位比 100*r/N，
   * 不使用潜在标准分，也不承担区间或趋势解释。
   */
  function forecast(percentiles, alpha) {
    alpha = alpha == null ? 0.40 : alpha;
    if (!percentiles || !percentiles.length || !(alpha > 0 && alpha <= 1)) {
      return { valid: false };
    }
    var value = Number(percentiles[0]);
    if (!isFinite(value)) return { valid: false };
    for (var i = 1; i < percentiles.length; i++) {
      var current = Number(percentiles[i]);
      if (!isFinite(current)) continue;
      value = alpha * current + (1 - alpha) * value;
    }
    return { valid: true, percentile: value, alpha: alpha, historyCount: percentiles.length };
  }

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
  PAL.ewma = { forecast: forecast, ewmaChart: ewma, simulateArl0: simulateArl0 };
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

    /* 透明点预测基线：直接平滑原始位比。它只回答“下一场参考落点”，
       与后面的状态模型、区间和目标概率保持职责分离。 */
    report.ewmaForecast = PAL.ewma.forecast(observations.map(function (d) {
      return 100 * d.rank / d.N;
    }), opts.ewmaForecastAlpha == null ? 0.40 : opts.ewmaForecastAlpha);

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

/* A retrospective, personal score/rank scale. Not population test equating. */
(function () {
  'use strict';
  var cache = new WeakMap();
  function present(v) { return v != null && !(typeof v === 'string' && v.trim() === ''); }
  function num(v) { if (!present(v) || (typeof v !== 'string' && typeof v !== 'number')) return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var i = a.length >> 1; return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2; }
  function sigmoid(y) { return y >= 0 ? 1 / (1 + Math.exp(-y)) : Math.exp(y) / (1 + Math.exp(y)); }
  function logit(p) { p = clamp(p, 0.005, 0.995); return Math.log(p / (1 - p)); }
  function day(e) { var s = String(e.exam_date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; var t = Date.parse(s + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? t / 86400000 : null; }
  function key(e) { return e.id != null && e.id !== '' ? 'id:' + e.id : JSON.stringify([e.exam_date || '', e.name || '', e.grade_level || '']); }
  function invNormal(p) {
    // Reuse the application's tested statistical kernel when it is present.
    var core = window.PAL2 && window.PAL2.core || window.PAL && window.PAL.core;
    if (core && core.invNorm) return core.invNorm(p);
    // Standalone fallback: invert an Abramowitz–Stegun normal CDF approximation.
    function cdf(x) {
      var a = Math.abs(x), t = 1 / (1 + 0.2316419 * a), tail = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI) * t *
        (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
      return x >= 0 ? 1 - tail : tail;
    }
    var lo = -8, hi = 8;
    for (var i = 0; i < 48; i++) { var m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function observation(e, subject, index) {
    var r = e && e.scores && e.scores[subject] || {}, score = num(r.actual), max = num(r.max);
    var N = present(r.participants) ? num(r.participants) : num(e.total_participants);
    var rank = num(r.rank), pos = num(r.yearPositionPercent);
    if (present(r.yearPositionPercent)) { if (pos === null || pos <= 0 || pos > 100) pos = null; }
    else if (rank !== null && N !== null && Number.isInteger(rank) && rank >= 1 && rank <= N) pos = rank / N * 100;
    var o = { e: e, index: index, score: score, max: max, N: N, pos: pos, day: day(e),
      scoreValid: score !== null && max !== null && max > 0 && score >= 0 && score <= max,
      rankValid: pos !== null && N !== null && Number.isSafeInteger(N) && N >= 30 };
    o.valid = o.scoreValid && o.rankValid && o.day !== null;
    if (o.valid) { var edge = Math.max(0.5 / N, 1e-8); o.z = invNormal(1 - clamp(pos / 100 - 0.5 / N, edge, 1 - edge)); o.y = logit(score / max); }
    return o;
  }
  function fit(points) {
    var mx = mean(points.map(function (p) { return p.z; })), my = mean(points.map(function (p) { return p.y; }));
    var cx = median(points.map(function (p) { return p.z; })), sx = Math.max(0.15, 1.4826 * median(points.map(function (p) { return Math.abs(p.z - cx); })));
    var weights = points.map(function (p) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)); });
    var b = 0, a = my, raw = 0;
    for (var t = 0; t < 24; t++) {
      var sw = 0, x = 0, y = 0;
      points.forEach(function (p, i) { sw += weights[i]; x += weights[i] * p.z; y += weights[i] * p.y; }); x /= sw; y /= sw;
      var xx = 0, xy = 0; points.forEach(function (p, i) { xx += weights[i] * (p.z - x) * (p.z - x); xy += weights[i] * (p.z - x) * (p.y - y); });
      raw = xx > 1e-10 ? xy / xx : 0; var nextB = Math.max(0, raw), nextA = y - nextB * x;
      var residuals = points.map(function (p) { return p.y - nextA - nextB * p.z; }), rm = median(residuals);
      var scale = Math.max(0.03, 1.4826 * median(residuals.map(function (v) { return Math.abs(v - rm); })));
      weights = points.map(function (p, i) { return Math.min(1, 2.5 * sx / Math.max(Math.abs(p.z - cx), 1e-9)) * Math.min(1, 1.345 * scale / Math.max(Math.abs(residuals[i]), 1e-9)); });
      if (Math.abs(nextB - b) + Math.abs(nextA - a) < 1e-9) { a = nextA; b = nextB; break; } a = nextA; b = nextB;
    }
    var residual = points.map(function (p) { return p.y - a - b * p.z; }), med = median(residual);
    var dispersion = 1.4826 * median(residual.map(function (v) { return Math.abs(v - med); }));
    return { b: b, rawSlope: raw, meanZ: mx, meanY: my, dispersion: dispersion,
      spreadZ: Math.sqrt(mean(points.map(function (p) { return (p.z - mx) * (p.z - mx); }))) };
  }
  function hardness(p, model, slope) { var b = slope == null ? model.b : slope; return b * (p.z - model.meanZ) - (p.y - model.meanY); }
  function difficultyIndex(h) { return 100 * sigmoid(h); }
  function context(exams, subject, allHistory) {
    var observations = exams.map(function (e, i) { return observation(e, subject, i); });
    var signature = JSON.stringify(observations.map(function (o) { return [key(o.e), o.day, o.e.grade_level || '', o.score, o.max, o.pos, o.N]; }));
    var perSubject = cache.get(exams); if (!perSubject) { perSubject = Object.create(null); cache.set(exams, perSubject); }
    var cacheKey = JSON.stringify([subject, !!allHistory]);
    if (perSubject[cacheKey] && perSubject[cacheKey].signature === signature) return perSubject[cacheKey];
    var seen = Object.create(null), unique = [];
    // Duplicate IDs are one exam; keep the final supplied record.
    observations.slice().reverse().forEach(function (o) { var k = key(o.e); if (!seen[k]) { seen[k] = true; if (o.valid) unique.push(o); } });
    unique.sort(function (a, b) { return a.day - b.day || key(a.e).localeCompare(key(b.e)); });
    var categories = Object.create(null), groups = [], byIndex = Object.create(null);
    unique.forEach(function (o) {
      var category = allHistory ? '__history__' : String(o.e.grade_level || ''), group = categories[category];
      var medianN = group && !allHistory ? median(group.points.map(function (p) { return p.N; })) : null;
      if (!group || (!allHistory && Math.abs(o.N - medianN) / Math.max(o.N, medianN) >= 0.3)) {
        group = { points: [], category: category }; groups.push(group); categories[category] = group;
      }
      group.points.push(o); o.group = group; byIndex[o.index] = o;
    });
    groups.forEach(function (group) { if (group.points.length >= 3) group.model = fit(group.points); });
    var result = { signature: signature, observations: observations, groups: groups, byIndex: byIndex };
    perSubject[cacheKey] = result; return result;
  }
  function scoreOnScale(cur, delta, max) {
    if (Math.abs(delta) < 1e-10) return cur.score / cur.max * max;
    return max * sigmoid(cur.y + delta);
  }
  function compare(exams, subject, index, options) {
    options = options || { mode: 'history' };
    var e = exams[index], out = { kind: 'empty', referenceMode: options.mode || 'history', references: [] };
    if (!e) { out.reason = '先录入一次考试，就可以建立你的成绩参考尺子。'; return out; }
    var cur = observation(e, subject, index); out.current = cur;
    if (!cur.scoreValid) { out.reason = '补齐这次的成绩和满分，就能开始比较。'; return out; }
    if (out.referenceMode === 'exam' && Number(options.exam) === index) {
      out.kind = 'identity'; out.value = cur.score; out.targetMax = cur.max; out.low = cur.score; out.high = cur.score; out.references = [cur]; out.referenceLabel = e.name || '本次考试'; out.quality = 'identity';
      var self = context(exams, subject, true).byIndex[index];
      if (self && self.group.model) { out.modelN = self.group.points.length; out.difficulty = out.referenceDifficulty = difficultyIndex(hardness(self, self.group.model)); }
      return out;
    }
    if (!cur.rankValid) { out.reason = '还需要这科的年级排名（或排名位置）和参考人数。少于 30 人时，暂不估计难度。'; return out; }
    if (cur.day === null) { out.reason = '补齐有效的考试日期，就能建立参考尺子。'; return out; }
    var ctx = context(exams, subject, out.referenceMode !== 'period'), point = ctx.byIndex[index];
    if (!point) { out.reason = '这场考试有重复记录，已避免重复计入参考尺子。'; return out; }
    var group = point.group, model = group.model; out.modelN = group.points.length;
    if (!model) { out.reason = (out.referenceMode !== 'period' ? '这科全部历史中的有效记录还不足 3 场。' : '这组可比较的记录还不足 3 场。') + '补齐成绩、满分和年级排名后，就能估计相对难度。'; return out; }
    var refs = group.points, max = cur.max, label = '历史平均';
    if (out.referenceMode === 'period') {
      var start = day({ exam_date: options.start }), end = day({ exam_date: options.end });
      if (start === null || end === null || start > end) { out.reason = '选一个完整的日期范围，开始日期要早于或等于结束日期。'; return out; }
      refs = refs.filter(function (p) { return p.day >= start && p.day <= end; }); label = options.start + ' 至 ' + options.end;
    } else if (out.referenceMode === 'exam') {
      var ref = ctx.byIndex[Number(options.exam)];
      if (!ref || ref.group !== group) { out.reason = '参照考试需要有效的同科成绩、满分、年级排名、参考人数和日期。'; return out; }
      refs = [ref]; max = ref.max; label = ref.e.name || '参照考试';
    }
    if (!refs.length) { out.reason = '这个时间段内没有可用的参照考试，试试扩大日期范围。'; return out; }
    var h = hardness(point, model), refH = mean(refs.map(function (p) { return hardness(p, model); }));
    out.kind = 'estimate'; out.referenceLabel = label; out.references = refs; out.targetMax = max;
    out.value = scoreOnScale(point, h - refH, max); out.difficulty = difficultyIndex(h); out.referenceDifficulty = difficultyIndex(refH);
    out.sameMaxValue = scoreOnScale(point, h - refH, point.max); out.offset = h - refH;
    if (!group.slopes) {
      var count = Math.min(80, group.points.length), slopes = [];
      for (var i = 0; i < count; i++) {
        var omit = count === 1 ? 0 : Math.round(i * (group.points.length - 1) / (count - 1));
        slopes.push(fit(group.points.filter(function (_, j) { return j !== omit; })).b);
      }
      group.slopes = slopes;
    }
    // Sensitivity of the fitted slope: fixed full-history centering and fixed reference inputs.
    var values = group.slopes.map(function (b) {
      var delta = hardness(point, model, b) - mean(refs.map(function (p) { return hardness(p, model, b); }));
      return scoreOnScale(point, delta, max);
    }).concat(out.value);
    out.low = Math.min.apply(null, values); out.high = Math.max.apply(null, values); out.sensitivityRuns = group.slopes.length;
    var reasons = [];
    if (group.points.length < 8) reasons.push('历史记录还少');
    if (model.spreadZ < 0.15) reasons.push('历史排名变化较小，尺子的斜率还不明确');
    if (model.rawSlope <= 0 && model.spreadZ >= 0.15) reasons.push('分数与排名的历史关系较弱，换算更接近参照范围的平均得分率');
    if (model.dispersion > 0.5) reasons.push('历史分数与排名关系波动较大');
    if (out.high - out.low > max * 0.1) reasons.push('少用一场历史记录，换算结果就会明显变化');
    if (point.score === 0 || point.score === point.max || refs.some(function (p) { return p.score === 0 || p.score === p.max; })) reasons.push('含零分或满分，边界附近的换算更不确定');
    if (refs.length === 1) reasons.push('参照仅有一场考试，个人状态可能影响其难度估计');
    out.quality = reasons.length ? 'limited' : 'supported'; out.warnings = reasons; out.model = model;
    return out;
  }
  function cells(exams, subjects, allHistory) {
    var result = Object.create(null);
    subjects.forEach(function (subject) {
      var ctx = context(exams, subject, allHistory);
      Object.keys(ctx.byIndex).forEach(function (i) {
        var p = ctx.byIndex[i], m = p.group.model;
        if (m) result[i + '|' + subject] = { index: difficultyIndex(hardness(p, m)), n: p.group.points.length,
          limited: p.group.points.length < 8 || m.spreadZ < 0.15 || m.rawSlope <= 0 || m.dispersion > 0.5 };
      });
    }); return result;
  }
  window.__stScoreWorthModel = { observation: observation, compare: compare, cells: cells, fit: fit, context: context, day: day, key: key, difficultyIndex: difficultyIndex };
})();

g.ScoreAchievementModels={pal:PAL,worth:window.__stScoreWorthModel};
})(globalThis);
