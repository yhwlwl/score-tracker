const COMMENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMENT_FIELDS = 'id,notice_id,content,created_at,is_developer,pinned_at,comment_revision';

export async function developerCommentAdmin(db, user, action, body, notices) {
  if (!user?.is_admin) return {error:'只有管理员可以发布和管理开发者评论',status:403};
  if (!COMMENT_UUID.test(body.id || '') || !/^[a-f0-9]{24}$/.test(body.notice_id || '')) return {error:'请选择公告和评论',status:400};
  const creating = action === 'notification_developer_comment_create', deleting = action === 'notification_developer_comment_delete';
  if (creating && !(await notices()).some(n => n.id === body.notice_id)) return {error:'公告已更新或不存在，请刷新后重试；草稿已保留',status:409};
  if (!creating && (!Number.isSafeInteger(body.revision) || body.revision < 0)) return {error:'请刷新评论后重试；草稿已保留',status:400};
  if (!deleting && (typeof body.content !== 'string' || !body.content.trim() || body.content.trim().length > 1000 || typeof body.pinned !== 'boolean')) return {error:'评论请填写 1～1000 字，并选择是否置顶',status:400};
  if (creating) {
    const row = {id:body.id,notice_id:body.notice_id,user_id:user.id,content:body.content.trim(),is_developer:true,pinned_at:body.pinned?new Date().toISOString():null};
    const r = await db.from('score_tracker_announcement_comments').insert(row).select(COMMENT_FIELDS).single();
    if (r.error?.code === '23505') {
      const old = await db.from('score_tracker_announcement_comments').select(COMMENT_FIELDS+',user_id').eq('id',body.id).maybeSingle();
      if (old.error) throw old.error;
      if (old.data?.is_developer && old.data.user_id === user.id && old.data.notice_id === row.notice_id && old.data.content === row.content && !!old.data.pinned_at === body.pinned) return {ok:true,comment:old.data,replayed:true};
      return {error:'这条评论已发布或有更新，请刷新后检查',status:409};
    }
    if (r.error) throw r.error;
    return {ok:true,comment:r.data,event:'announcement_developer_comment_created'};
  }
  let q = db.from('score_tracker_announcement_comments');
  if (deleting) q=q.delete();
  else {
    const before=await db.from('score_tracker_announcement_comments').select('pinned_at').eq('id',body.id).eq('notice_id',body.notice_id).eq('is_developer',true).eq('comment_revision',body.revision).maybeSingle();
    if(before.error)throw before.error;
    if(!before.data)return {error:'评论已删除或刚刚有更新，请刷新后重试；草稿已保留',status:409};
    q=q.update({content:body.content.trim(),pinned_at:body.pinned?(before.data.pinned_at||new Date().toISOString()):null,comment_revision:body.revision+1});
  }
  const r=await q.eq('id',body.id).eq('notice_id',body.notice_id).eq('is_developer',true).eq('comment_revision',body.revision).select(COMMENT_FIELDS).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data)return {error:'评论已删除或刚刚有更新，请刷新后重试；草稿已保留',status:409};
  return {ok:true,comment:r.data,event:deleting?'announcement_developer_comment_deleted':'announcement_developer_comment_updated'};
}

export function publicComment(row, user, isCurrent) {
  return {id:String(row.id),sequence:String(row.sequence),content:row.content,created_at:row.created_at,
    author:row.is_developer?'开发者':row.author?.username||'用户',is_developer:row.is_developer===true,pinned_at:row.pinned_at||null,
    reply:row.admin_reply?{content:row.admin_reply,created_at:row.admin_replied_at}:null,
    is_mine:row.user_id===user.id,reply_unread:row.user_id===user.id&&!!row.admin_reply&&!row.admin_reply_read_at,
    reply_revision:row.user_id===user.id?row.reply_revision:undefined,
    can_delete:isCurrent&&(user.is_admin||(!row.is_developer&&row.user_id===user.id))};
}

export async function announcementCommentPage(db, user, notice, isCurrent, before) {
  const cursor=String(before||'');
  if(cursor&&!/^\d{1,18}$/.test(cursor))return {error:'无效的分页',status:400};
  const fields='id,sequence,user_id,content,created_at,is_developer,pinned_at,admin_reply,admin_replied_at,reply_revision,admin_reply_read_at,author:score_tracker_users(username)';
  let q=db.from('score_tracker_announcement_comments').select(fields).eq('notice_id',notice.id).is('pinned_at',null).order('sequence',{ascending:false}).limit(31);
  if(!user.is_admin&&notice.comments_public===false)q=q.or('user_id.eq.'+user.id+',is_developer.eq.true');
  if(cursor)q=q.lt('sequence',cursor);
  const [normal,pins]=await Promise.all([q,cursor?Promise.resolve({data:[],error:null}):db.from('score_tracker_announcement_comments').select(fields).eq('notice_id',notice.id).eq('is_developer',true).not('pinned_at','is',null).order('pinned_at',{ascending:false}).order('sequence',{ascending:false})]);
  if(normal.error)throw normal.error;if(pins.error)throw pins.error;
  const rows=(normal.data||[]).slice(0,30).map(row=>publicComment(row,user,isCurrent));
  return {rows,pinned:(pins.data||[]).map(row=>publicComment(row,user,isCurrent)),next:normal.data?.length>30?rows.at(-1).sequence:null,read_only:!isCurrent,comments_enabled:notice.comments_enabled===true};
}
