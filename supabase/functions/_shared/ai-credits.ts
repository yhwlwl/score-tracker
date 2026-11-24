import { prepareModelRequest } from './recognition-config.ts';
// Server-only metering. Nothing here trusts client points, balance, price or owner.
export class AiBudgetError extends Error {
  aiBudget=true;status=429;code:string;
  constructor(code:string){super(({opening_budget_required:'AI额度正在完成上线配置，请稍后再试，未扣积分',credits_exhausted:'AI积分不足，可积攒月额度或升级后再试',site_budget:'本月共享AI预算暂时不足，请稍后再试，未扣积分',task_credit_cap:'本次识别已达到批准的积分上限，已保留进度',analysis_disabled:'试卷分析暂未开放',unpriced_model:'当前模型尚未配置计费，请联系管理员',cooldown:'请求过于频繁，请稍后再试',concurrency:'已有识别任务进行中，请等待完成',task_inactive:'这次识别已结束，请重新打开',duplicate_call:'此阶段已提交，请等待现有请求完成',ai_disabled:'AI服务暂未开放'} as any)[code]||'AI额度服务暂不可用，请稍后重试');this.code=code;this.status=['billing_unavailable','unpriced_model','opening_budget_required'].includes(code)?503:code==='analysis_disabled'||code==='forbidden'?403:429;}
}
export async function creditRpc(db:any,name:string,args:any){
  for(let i=0;i<2;i++){
    try{const r=await db.rpc(name,args);if(!r.error)return r.data;if(i===1)throw new AiBudgetError('billing_unavailable');}
    catch(e){if(i===1)throw new AiBudgetError('billing_unavailable');}
  }
}
export async function startAiTask(db:any,user:string,task:string,feature:string,floor=0,cap=1000){
 const r=await creditRpc(db,'score_tracker_ai_task_start',{p_user:user,p_task:task,p_feature:feature,p_floor:floor,p_cap:cap});
 if(!r?.allowed)throw new AiBudgetError(r?.reason||'billing_unavailable');return r;
}
export async function finishAiTask(db:any,user:string,task:string,success:boolean){return creditRpc(db,'score_tracker_ai_task_finish',{p_user:user,p_task:task,p_success:success});}
export async function meteredModelFetch(db:any,user:string,task:string,call:string,url:string,init:any,send:any=fetch,onSettled?:(credits:number)=>void,providerSession=task){
 const prepared=await prepareModelRequest(url,init,user,providerSession);
 const body=JSON.parse(String(init.body||'{}'));
 const reserved=await creditRpc(db,'score_tracker_ai_call_reserve',{p_user:user,p_task:task,p_call:call,p_model:body.model,p_max_output:body.max_tokens});
 if(!reserved?.allowed)throw new AiBudgetError(reserved?.reason||'billing_unavailable');
 let response:any;
 try{response=await send(url,prepared);}catch(e){
  // A timeout may have reached the provider: retain the full global reservation.
  await creditRpc(db,'score_tracker_ai_call_settle',{p_user:user,p_call:call,p_usage:null,p_provider:null,p_status:null}).catch(()=>{});throw e;
 }
 let payload:any;try{payload=await response.clone().json();}catch(_){payload=null;}
 const requestId=response.headers.get('x-request-id')||response.headers.get('request-id')||payload?.id||null;
 const settled=await creditRpc(db,'score_tracker_ai_call_settle',{p_user:user,p_call:call,p_usage:payload?.usage||null,p_provider:requestId,p_status:response.status});
 if(settled?.known&&settled.credits!=null&&Number.isFinite(Number(settled.credits)))onSettled?.(Number(settled.credits));
 return response;
}
