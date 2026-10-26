// Called only after administrator authentication. Each section is fetched independently.
export async function userRecords(db, params) {
  const id=params.get('id')||'', section=params.get('section')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Object.assign(new Error('无效的用户'),{status:400});
  const page=Math.max(1,Math.min(100000,Math.trunc(Number(params.get('page'))||1))),size=30,offset=(page-1)*size;
  const tables={
    exams:['score_tracker_exams','*','exam_date','id'],
    scores:['score_tracker_scores','*,exam:score_tracker_exams(name)','created_at','id'],
    events:['score_tracker_visit_logs','id,event_type,occurred_at,app_page,metadata,city,app_version,session_id,visitor_id','occurred_at','id'],
    feedback:['score_tracker_feedback_submissions','id,feedback_type,content,user_id,created_at,status,app_version,page_path,user_agent,visitor_id,account_mode,utm_source,utm_campaign,first_referrer,browser_language,client_timezone,is_pwa,first_seen_at,last_seen_at,tenure_days,total_sessions,total_events,total_active_days,sessions_30d,events_30d,active_days_30d,unique_pages_30d,exam_count,exams_with_actual,exams_with_target,score_row_count,actual_score_count,target_score_count,subject_coverage_count,exam_edit_events,chart_interactions,radar_interactions,depth_score,depth_level,depth_calculated_at','created_at','id'],
    votes:['score_tracker_feature_votes','id,created_at,option:score_tracker_feature_vote_options(label,description,is_active,completed_at)','created_at','id'],
    suggestions:['score_tracker_feature_vote_suggestions','id,content,status,feedback_id,created_at,updated_at','created_at','id'],
    vision:['score_tracker_vision_requests','request_id,created_at,status,source_image_count,duration_ms,model,error_code,error_message,quota_refunded','created_at','request_id'],
    papers:['score_tracker_paper_reviews','request_id,title,subject,exam_id,status,created_at,completed_at,duration_ms,image_count,model,error_message','created_at','request_id'],
    comments:['score_tracker_announcement_comments','id,notice_id,content,created_at,admin_reply,admin_replied_at,reply_revision','created_at','id'],
    notices:['score_tracker_notification_receipts','kind,notice_id,shown_at','shown_at','notice_id'],
    community:['score_tracker_visit_logs','id,event_type,occurred_at,metadata','occurred_at','id'],
  };
  if(section==='profile'){
    const results=await Promise.all([
      db.from('score_tracker_setup_profiles').select('school,selected_subjects,completed_at').eq('user_id',id).maybeSingle(),
      db.from('score_tracker_user_goals').select('subject_goals,total_goal,dream_school,exam_date,date_name,updated_at').eq('user_id',id).maybeSingle(),
      db.from('score_tracker_trajectory_sharing').select('enabled,updated_at').eq('user_id',id).maybeSingle(),
      db.from('score_tracker_trajectory_match_exposures').select('matcher_user_id',{count:'exact',head:true}).eq('owner_user_id',id),
      db.from('score_tracker_trajectory_match_exposures').select('owner_user_id',{count:'exact',head:true}).eq('matcher_user_id',id),
    ]);
    for(const r of results)if(r.error)throw r.error;
    return {profile:results[0].data,goals:results[1].data,sharing:results[2].data,matched_by:results[3].count||0,matched_others:results[4].count||0};
  }
  const spec=tables[section];if(!spec)throw Object.assign(new Error('无效的详情分类'),{status:400});
  let query=db.from(spec[0]).select(spec[1],{count:'exact'}).eq('user_id',id);
  if(section==='community')query=query.like('event_type','community_%');
  const result=await query.order(spec[2],{ascending:false}).order(spec[3],{ascending:false}).range(offset,offset+size-1);
  // An optional feature may not have been deployed in every environment.
  if(result.error&&section==='papers'&&['42P01','PGRST205'].includes(result.error.code))return {rows:[],total:0,page,page_size:size,unavailable:'此环境尚未部署 AI 试卷分析'};
  if(result.error)throw result.error;
  const rows=result.data||[];
  if(section==='comments'||section==='notices'){
    const config=await db.from('score_tracker_notification_config').select('announcement_title,announcement_content,announcement_history').eq('id',1).single();
    if(config.error)throw config.error;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(config.data.announcement_title+'\n'+config.data.announcement_content));
    const current=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
    const titles=new Map((config.data.announcement_history||[]).map(x=>[x.id,x.title]));titles.set(current,config.data.announcement_title);
    for(const row of rows)row.notice_title=titles.get(row.notice_id)||(row.kind==='release'?'版本 '+row.notice_id:row.kind==='tip'?'使用提示':'历史公告');
  }
  return {rows,total:result.count||0,page,page_size:size};
}
