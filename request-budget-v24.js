// v24: small client request budget. Loaded before telemetry so background polling can be coalesced.
(function(){
  var API='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
  var PRODUCT_VERSION='v2.0';
  var nativeFetch=window.fetch.bind(window);
  var lastHeartbeatAt=0;
  var unreadCache=null;
  var unreadCacheAt=0;
  var HEARTBEAT_MIN_MS=10*60*1000;
  var UNREAD_CACHE_MS=5*60*1000;

  function syntheticJson(data,status){
    return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  window.fetch=async function requestBudgetFetch(input,init){
    var target=typeof input==='string'?input:(input&&input.url)||'';
    if(!target.startsWith(API)||!init||!init.body)return nativeFetch(input,init);
    var body=null;
    try{body=JSON.parse(String(init.body));}catch(e){return nativeFetch(input,init);}

    // Keep version metadata current without making the feedback/telemetry bundle itself a deployment dependency.
    if(body&&body.context&&typeof body.context==='object')body.context.appVersion=PRODUCT_VERSION;

    if(body?.action==='track_event'&&body?.eventType==='heartbeat'){
      var now=Date.now();
      if(now-lastHeartbeatAt<HEARTBEAT_MIN_MS)return syntheticJson({ok:true,coalesced:true});
      lastHeartbeatAt=now;
    }

    // The unread badge polls every minute in the legacy bundle. Reuse the last successful response for
    // five minutes while the feedback drawer is closed; opening the drawer always forces a fresh read.
    if(body?.action==='feedback_list'&&!document.querySelector('.st-fb-back')){
      var now=Date.now();
      if(unreadCache&&now-unreadCacheAt<UNREAD_CACHE_MS)return syntheticJson(unreadCache);
      var response=await nativeFetch(input,Object.assign({},init,{body:JSON.stringify(body)}));
      if(response.ok){
        try{unreadCache=await response.clone().json();unreadCacheAt=now;}catch(e){}
      }
      return response;
    }

    return nativeFetch(input,Object.assign({},init,{body:JSON.stringify(body)}));
  };
})();
