// All access is scoped to the authenticated comment author, including admins.
const REPLY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function announcementReplies(db, user, action, body, noticeHistory) {
  async function threadData(id=null) {
    const flag=await db.from('score_tracker_announcement_thread_settings').select('enabled').eq('id',1).maybeSingle();
    if(flag.error||flag.data?.enabled!==true)return {rows:[],notices:[]};
    const history=await noticeHistory(),notices=history.notices.filter(n=>n.comments_public!==false);
    const r=await db.rpc('score_tracker_thread_notification_rows',{p_user:user.id,p_notices:notices.map(n=>n.id),p_reply:id});
    if(r.error)throw r.error;
    return {rows:r.data||[],notices};
  }
  if (body.kind==='thread'&&action!=='announcement_reply_inbox') {
    if(!REPLY_UUID.test(body.id||''))return {error:'请选择一条公告回复',status:400};
    const data=await threadData(body.id),row=data.rows[0];
    if(!row)return {error:'这条回复已删除、归档或不属于当前账号',status:404};
    if(action==='announcement_reply_read'){
      const r=await db.from('score_tracker_announcement_thread_notifications').update({read_at:new Date().toISOString()}).eq('reply_id',row.id).eq('recipient_id',user.id).is('read_at',null).select('reply_id');
      if(r.error)throw r.error;return {ok:true,read:!!r.data?.length};
    }
    return {notice:data.notices.find(n=>n.id===row.notice_id),read_only:true,thread_notification:{id:row.id,root_id:row.root_id,author:row.author,is_developer:row.is_developer,content:row.reply_preview,created_at:row.replied_at,target_author:row.target_author,target_content:row.comment_preview,target_created_at:row.target_created_at}};
  }
  if (action === 'announcement_reply_inbox') {
    const r = await db.from('score_tracker_announcement_comments')
      .select('id,notice_id,content,admin_reply,admin_replied_at,reply_revision', {count:'exact'})
      .eq('user_id', user.id).is('admin_reply_read_at', null).not('admin_reply', 'is', null)
      .order('admin_replied_at', {ascending:false}).order('sequence', {ascending:false}).limit(20);
    if (r.error) throw r.error;
    const legacy=(r.data || []).map(row => ({
      id:row.id, notice_id:row.notice_id, comment_preview:row.content.slice(0,100),
      reply_preview:row.admin_reply.slice(0,140), replied_at:row.admin_replied_at,
      revision:row.reply_revision
    }));
    if(body.include_threads!==true)return {count:r.count||0,rows:legacy};
    let data;try{data=await threadData();}catch(e){console.error('announcement_thread_inbox_failed');return {count:r.count||0,rows:legacy};}
    const newer=data.rows.map(row=>({id:row.id,kind:'thread',notice_id:row.notice_id,comment_preview:row.comment_preview.slice(0,100),reply_preview:row.reply_preview.slice(0,140),replied_at:row.replied_at,author:row.author}));
    return {count:(r.count||0)+(Number(data.rows[0]?.total)||0),rows:[...legacy,...newer].sort((a,b)=>Date.parse(b.replied_at)-Date.parse(a.replied_at)).slice(0,20)};
  }
  if (!REPLY_UUID.test(body.id || '')) return {error:'请选择一条公告回复', status:400};
  if (action === 'announcement_reply_read') {
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 ||
      typeof body.replied_at !== 'string' || body.replied_at.length > 40 || !Number.isFinite(Date.parse(body.replied_at))) {
      return {error:'请重新打开这条回复', status:400};
    }
    const r = await db.from('score_tracker_announcement_comments')
      .update({admin_reply_read_at:new Date().toISOString()})
      .eq('id', body.id).eq('user_id', user.id).eq('reply_revision', body.revision)
      .eq('admin_replied_at', body.replied_at).not('admin_reply', 'is', null)
      .select('id');
    if (r.error) throw r.error;
    return {ok:true, read:!!r.data?.length};
  }
  const r = await db.from('score_tracker_announcement_comments')
    .select('id,notice_id,sequence,content,created_at,admin_reply,admin_replied_at,reply_revision,admin_reply_read_at')
    .eq('id', body.id).eq('user_id', user.id).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data?.admin_reply) return {error:'这条回复已被删除或不属于当前账号', status:404};
  const row = r.data, history = await noticeHistory();
  const notice = history.notices.find(item => item.id === row.notice_id) || {
    id:row.notice_id, title:'历史公告', content:'这条公告正文已归档，仍可查看你的评论和作者回复。', comments_public:false
  };
  return {notice, read_only:row.notice_id !== history.current || !history.commentsEnabled,
    comment:{id:row.id, sequence:String(row.sequence), content:row.content, created_at:row.created_at,
      author:user.username, can_delete:false, is_mine:true, reply_unread:!row.admin_reply_read_at,
      reply_revision:row.reply_revision, reply:{content:row.admin_reply, created_at:row.admin_replied_at}}};
}
