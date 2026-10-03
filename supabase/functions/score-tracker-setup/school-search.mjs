export function schoolText(value) {
  return String(value).normalize('NFKC').toLowerCase().replace(/[\s·•()_-]/g, '');
}
export function schoolSearchKey(value) {
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const units = { 十: 10, 百: 100, 千: 1000 };
  return schoolText(value).replace(/[零〇一二两三四五六七八九十百千]+/g, number => {
    if (!/[十百千]/.test(number)) return [...number].map(n => digits[n]).join('');
    let total = 0, digit = 0;
    for (const n of number) { if (units[n]) { total += (digit || 1) * units[n]; digit = 0; } else digit = digits[n]; }
    return String(total + digit);
  }).replace(/第(?=\d)/g, '').replace(/附属中(?:学校|学)/g, '附中').replace(/中(?:学校|學校|学|學)/g, '中').replace(/[省市]/g, '');
}

