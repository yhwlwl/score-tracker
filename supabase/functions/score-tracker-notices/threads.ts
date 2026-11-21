// Separate discussion API; existing admin_reply fields are preserved.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function maskThreadName(v) {
  const a=Array.from(String(v||'').trim());
  return a.length<3?'***':a[0]+'***'+a.at(-1);
}
const fail=(error,status)=>({error,status});
export async function announcementThread(db,user,action,body,notice,isCurrent) {
  if(!notice||notice.comments_public===false)return fail('该公告未开放公开讨论',403);
  if(!UUID.test(body.root_id||''))return fail('请选择评论',400);
  const root=await db.from('score_tracker_announcement_comments').select('id,notice_id').eq('id',body.root_id).eq('notice_id',notice.id).maybeSingle();
  if(root.error)throw root.error;if(!root.data)return fail('评论已不存在',404);
  const writable=isCurrent&&notice.comments_enabled===true;
  if(action==='announcement_thread_read'){
    const after=Number(body.offset||0);if(!Number.isSafeInteger(after)||after<0||after>10000)return fail('分页无效',400);
    const q=await db.from('score_tracker_announcement_thread_replies').select('id,parent_id,user_id,content,created_at,author:score_tracker_users(username,is_admin)').eq('root_id',body.root_id).order('created_at',{ascending:true}).order('id',{ascending:true}).range(after,after+29);
    if(q.error)throw q.error;
    const ids=(q.data||[]).map(r=>r.id);
    async function likes(table,column,id){
      const [total,mine]=await Promise.all([db.from(table).select(column,{count:'exact',head:true}).eq(column,id),db.from(table).select(column,{count:'exact',head:true}).eq(column,id).eq('user_id',user.id)]);
      if(total.error)throw total.error;if(mine.error)throw mine.error;return {count:total.count||0,liked:!!mine.count};
    }
    const rootLikes=await likes('score_tracker_announcement_root_likes','root_id',body.root_id);
    const rows=await Promise.all((q.data||[]).map(async r=>({id:r.id,parent_id:r.parent_id,content:r.content,created_at:r.created_at,author:r.author?.is_admin?'开发者':maskThreadName(r.author?.username),is_developer:r.author?.is_admin===true,is_mine:r.user_id===user.id,can_delete:writable&&(user.is_admin||r.user_id===user.id),...(await likes('score_tracker_announcement_reply_likes','reply_id',r.id))})));
    return {rows,root_likes:rootLikes,writable,next:ids.length===30?after+30:null};
  }
  if(!writable)return fail('该公告已关闭讨论',403);
  if(action==='announcement_thread_add'){
    if(typeof body.content!=='string'||!body.content.trim()||body.content.trim().length>300||body.parent_id!=null&&!UUID.test(body.parent_id))return fail('请填写1～300字的回复',400);
    const r=await db.rpc('score_tracker_thread_reply_add',{p_user:user.id,p_root:body.root_id,p_parent:body.parent_id||null,p_content:body.content.trim()});
    if(r.error){if(r.error.message.includes('rate_limit'))return fail('回复太快了，请稍后再发',429);if(r.error.message.includes('discussion_closed'))return fail('公告已关闭讨论',409);if(r.error.code==='23503')return fail('回复对象已不存在',404);throw r.error;}return {ok:true,id:r.data};
  }
  const replyId=body.reply_id||null;
  if(replyId!==null){
    if(!UUID.test(replyId))return fail('回复无效',400);
    const target=await db.from('score_tracker_announcement_thread_replies').select('id,user_id').eq('root_id',body.root_id).eq('id',replyId).maybeSingle();
    if(target.error)throw target.error;if(!target.data)return fail('回复已不存在',404);
    if(action==='announcement_thread_delete'){
      if(!user.is_admin&&target.data.user_id!==user.id)return fail('只能删除自己的回复',403);
      const r=await db.from('score_tracker_announcement_thread_replies').delete().eq('id',replyId).eq('root_id',body.root_id);
      if(r.error)throw r.error;return {ok:true};
    }
  }
  if(action!=='announcement_thread_like'||typeof body.liked!=='boolean')return fail('操作无效',400);
  const table=replyId?'score_tracker_announcement_reply_likes':'score_tracker_announcement_root_likes',column=replyId?'reply_id':'root_id',id=replyId||body.root_id;
  const r=body.liked?await db.from(table).upsert({[column]:id,user_id:user.id},{onConflict:column+',user_id',ignoreDuplicates:true}):await db.from(table).delete().eq(column,id).eq('user_id',user.id);
  if(r.error)throw r.error;return {ok:true};
}
