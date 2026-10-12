export const SUPPORT_DEFAULTS = {
  enabled: false, qr_image: '',
  title: '支持作者',
  intro: '成绩轨迹由我独立开发和维护。如果它帮你更清楚地了解自己的成绩，欢迎随意赞赏，支持我继续完善它。',
  thanks: '谢谢每一份心意，也谢谢你愿意使用成绩轨迹。',
  entry_label: '支持作者', footer_label: '支持作者',
  home_kicker: '支持独立开发', home_title: '喜欢成绩轨迹？',
  home_description: '支持一下作者，帮我继续完善它。赞赏完全自愿，不影响功能使用。',
  home_link_label: '了解赞赏 →', qr_label: '微信扫码赞赏', save_label: '保存赞赏码',
  phone_help: '保存图片后，可在微信扫一扫中从相册识别。',
  desktop_help: '打开微信扫一扫，扫描上方赞赏码。',
  note: '赞赏完全自愿，不影响功能使用。',
  notice_text: '新增「支持作者」入口，可在个人页顶部和首页轮播卡片中找到。赞赏完全自愿，不影响功能使用。',
  notice_link_label: '了解赞赏 →'
};
export const SUPPORT_LIMITS = {
  title: 40, intro: 400, thanks: 160, entry_label: 20, footer_label: 20,
  home_kicker: 30, home_title: 60, home_description: 160, home_link_label: 30,
  qr_label: 40, save_label: 30, phone_help: 160, desktop_help: 160,
  note: 160, notice_text: 400, notice_link_label: 30
};
export function validateSupport(input) {
  if (!input || typeof input.enabled !== 'boolean' || typeof input.qr_image !== 'string') throw new Error('请检查赞赏开关和二维码');
  const result = {...SUPPORT_DEFAULTS, enabled:input.enabled, qr_image:input.qr_image.trim()};
  for (const [key, limit] of Object.entries(SUPPORT_LIMITS)) {
    const value = input[key] === undefined ? SUPPORT_DEFAULTS[key] : input[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new Error('请检查赞赏文案长度，文字不能为空');
    result[key] = value.trim();
  }
  const qr = result.qr_image;
  if (qr.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(qr);
    if (!match || match[2].length > Math.ceil(350 * 1024 / 3) * 4) throw new Error('赞赏码请上传不超过 350 KB 的 PNG / JPEG / WebP 原图');
    let bytes; try {bytes = atob(match[2]);} catch (_) {throw new Error('赞赏码图片无效');}
    const valid = match[1] === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n') : match[1] === 'jpeg' ? bytes.startsWith('\xff\xd8\xff') : bytes.startsWith('RIFF') && bytes.slice(8,12) === 'WEBP';
    if (!valid || bytes.length > 350 * 1024) throw new Error('赞赏码图片格式无效');
  } else if (qr && (!/^\.?\/?[a-zA-Z0-9_\-./]+\.(png|jpe?g|webp)$/i.test(qr) || qr.startsWith('//') || qr.includes('..') || qr.startsWith('./../'))) {
    throw new Error('请上传赞赏码原图，或填写本站图片路径');
  }
  if (result.enabled && !qr) throw new Error('请先上传赞赏码，再开启入口');
  return result;
}
export async function readSupport(db, publicRead = false) {
  const result = await db.from('score_tracker_support_config').select('config,revision,updated_at').eq('id',1).maybeSingle();
  if (result.error) {
    if (publicRead && ['42P01','PGRST205'].includes(result.error.code)) return {...SUPPORT_DEFAULTS, revision:1};
    if (['42P01','PGRST205'].includes(result.error.code)) throw Object.assign(new Error('赞赏配置尚未部署，请先应用数据库迁移'), {status:503});
    throw result.error;
  }
  const stored = result.data?.config || {};
  let config;
  try {config = validateSupport({...SUPPORT_DEFAULTS,...stored});} catch (_) {config = {...SUPPORT_DEFAULTS};}
  if (publicRead && !config.enabled) config.qr_image = '';
  return {...config, revision:result.data?.revision || 1, updated_at:result.data?.updated_at || null};
}
export async function saveSupport(db, input, userId) {
  let config;
  try {config = validateSupport(input);} catch(error) {throw Object.assign(error,{status:400});}
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw Object.assign(new Error('请刷新赞赏设置后再保存'), {status:400});
  const saved = await db.from('score_tracker_support_config').update({config, revision:input.revision + 1, updated_at:new Date().toISOString(), updated_by:userId}).eq('id',1).eq('revision',input.revision).select('revision').maybeSingle();
  if (saved.error) throw Object.assign(new Error(['42P01','PGRST205'].includes(saved.error.code) ? '赞赏配置尚未部署，请先应用数据库迁移' : '暂时无法保存赞赏设置'), {status:['42P01','PGRST205'].includes(saved.error.code)?503:500});
  if (!saved.data) throw Object.assign(new Error('赞赏设置刚刚有变化，请重新读取后再保存'), {status:409});
  return readSupport(db);
}
