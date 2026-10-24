import { SUPPORT_DEFAULTS, validateSupport } from './support.ts';

export const COMMUNITY_DEFAULTS = {
  enabled: false, title: '成绩轨迹微信交流群',
  intro: '交流使用心得、提出建议，也欢迎一起聊聊学习。加入完全自愿，原有反馈入口照常保留。',
  qr_image: '', expires_at: '', join_url: '',
};
export function validateCommunity(input) {
  if (!input || typeof input.enabled !== 'boolean') throw new Error('请选择是否开启交流群');
  const config = {...COMMUNITY_DEFAULTS, enabled:input.enabled};
  for (const [key, limit] of Object.entries({title:60,intro:400,qr_image:500000,expires_at:40,join_url:500})) {
    const value = input[key] === undefined ? COMMUNITY_DEFAULTS[key] : input[key];
    if (typeof value !== 'string' || value.trim().length > limit) throw new Error('请检查交流群设置的长度');
    config[key] = value.trim();
  }
  if (!config.title || !config.intro) throw new Error('请填写群名称和介绍');
  try {validateSupport({...SUPPORT_DEFAULTS,enabled:config.enabled,qr_image:config.qr_image});}
  catch (e) {throw new Error(e.message.replace(/赞赏码/g,'群二维码').replace(/赞赏/g,'交流群'));}
  if (config.expires_at) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(config.expires_at) || !Number.isFinite(Date.parse(config.expires_at))) throw new Error('请填写有效的二维码到期时间');
    config.expires_at = new Date(config.expires_at).toISOString();
  }
  if (config.join_url) {
    let url; try {url = new URL(config.join_url);} catch (_) {throw new Error('请填写微信官方 HTTPS 加群链接');}
    if (url.protocol !== 'https:' || !['weixin.qq.com','work.weixin.qq.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('仅支持微信官方 HTTPS 加群链接');
    config.join_url = url.href;
  }
  return config;
}
export async function readCommunity(db, publicRead = false) {
  const r = await db.from('score_tracker_community_config').select('config,revision,updated_at').eq('id',1).maybeSingle();
  if (r.error) {
    if (publicRead && ['42P01','PGRST205'].includes(r.error.code)) return {...COMMUNITY_DEFAULTS,revision:1};
    throw Object.assign(new Error('暂时无法读取交流群设置，请确认数据库迁移已部署'),{status:503});
  }
  let config; try {config=validateCommunity({...COMMUNITY_DEFAULTS,...(r.data?.config||{})});} catch (_) {config={...COMMUNITY_DEFAULTS};}
  const expired=!!config.expires_at && Date.parse(config.expires_at)<=Date.now();
  if (publicRead && (!config.enabled || expired)) config={...COMMUNITY_DEFAULTS};
  return {...config,expired:publicRead?false:expired,revision:r.data?.revision||1,updated_at:r.data?.updated_at||null};
}
export async function saveCommunity(db,input,userId) {
  let config; try {config=validateCommunity(input);} catch (e) {throw Object.assign(e,{status:400});}
  if (!Number.isSafeInteger(input.revision)||input.revision<1) throw Object.assign(new Error('请重新读取交流群设置后保存'),{status:400});
  if (config.enabled && config.expires_at && Date.parse(config.expires_at)<=Date.now()) throw Object.assign(new Error('二维码已到期，请更换或调整到期时间后再启用'),{status:400});
  const r=await db.from('score_tracker_community_config').update({config,revision:input.revision+1,updated_at:new Date().toISOString(),updated_by:userId}).eq('id',1).eq('revision',input.revision).select('revision').maybeSingle();
  if (r.error) throw Object.assign(new Error('交流群设置保存失败'),{status:503});
  if (!r.data) throw Object.assign(new Error('设置刚刚有变化，请重新读取后保存；你的修改尚未覆盖线上内容'),{status:409});
  return readCommunity(db);
}
