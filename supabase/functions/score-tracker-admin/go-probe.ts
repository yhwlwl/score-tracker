// No real user image or record is sent. The expected image color is chosen locally.
const samples = [
 ["red","iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAiklEQVR42u3QMQEAAAgDILV/59nA0wsi0Ckuo0CQIEGCBAkSJAhBggQJEiRIkCAECRIkSJAgQYIQJEiQIEGCBAkShCBBggQJEiRIEIIECRIkSJAgQQgSJEiQIEGCBAlCkCBBggQJEiQIQYIECRIkSJAgBAkSJEiQIEGCBCFIkCBBggQJEoQgQYL+LAu8Ab9a20CGAAAAAElFTkSuQmCC"],
 ["blue","iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAi0lEQVR42u3QMQEAAAgDoGn/zprA1wsiUMmEWysQJEiQIEGCBAlCkCBBggQJEiQIQYIECRIkSJAgBAkSJEiQIEGCBCFIkCBBggQJEoQgQYIECRIkSBCCBAkSJEiQIEGCECRIkCBBggQJQpAgQYIECRIkCEGCBAkSJEiQIEEIEiRIkCBBggQhSJCgPwsJvgG/nO788QAAAABJRU5ErkJggg=="],
 ["green","iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAi0lEQVR42u3QMQEAAAgDoGlyo9vA0wsiUJlwaAWCBAkSJEiQIEEIEiRIkCBBggQhSJAgQYIECRKEIEGCBAkSJEiQIAQJEiRIkCBBghAkSJAgQYIECUKQIEGCBAkSJEgQggQJEiRIkCBBCBIkSJAgQYIEIUiQIEGCBAkSJAhBggQJEiRIkCAECRL0ZwFE8QFAmJCmJwAAAABJRU5ErkJggg=="],
 ["yellow","iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAi0lEQVR42u3QMQEAAAgDILV/59nA0wsi0ElxGAWCBAkSJEiQIEEIEiRIkCBBggQhSJAgQYIECRKEIEGCBAkSJEiQIAQJEiRIkCBBghAkSJAgQYIECUKQIEGCBAkSJEgQggQJEiRIkCBBCBIkSJAgQYIEIUiQIEGCBAkSJAhBggQJEiRIkCAECRL0ZwEDsgK+657AAgAAAABJRU5ErkJggg=="]
];
export async function runGoProbe(send:(kind:string,body:any)=>Promise<Response>) {
  const nonce="st-"+crypto.randomUUID().slice(0,8);
  const [color,png]=samples[crypto.getRandomValues(new Uint8Array(1))[0]%samples.length];
  const options={max_tokens:128,temperature:0,thinking:{type:"disabled"},response_format:{type:"json_object"}};
  async function check(kind:string,content:any,field:string,expected:string){
    const start=Date.now();
    const result=(ok:boolean,status:number,code:string)=>({ok,status,code,latency_ms:Date.now()-start});
    try{
      const res=await send(kind,{...options,messages:[{role:"user",content}]});
      if(!res.ok)return result(false,res.status,"upstream_error");
      const payload=await res.json();
      let answer:any;
      try{answer=JSON.parse(payload?.choices?.[0]?.message?.content||"");}catch{return result(false,res.status,"invalid_json");}
      const actual=String(answer?.[field]||"").trim().toLowerCase();
      return result(actual===expected,res.status,actual===expected?"ok":"incorrect_result");
    }catch(e){return result(false,0,e instanceof Error&&e.name==="AbortError"?"timeout":String((e as any)?.code||"network_error").slice(0,80));}
  }
  const [text,vision]=await Promise.all([
    check("text",'Return only a JSON object with the field "value" equal to the string "'+nonce+'".',"value",nonce),
    check("vision",[{type:"text",text:'Identify the dominant color of the attached image. Return JSON only, with an English lowercase "color" field.'},{type:"image_url",image_url:{url:"data:image/png;base64,"+png,detail:"high"}}],"color",color)
  ]);
  return {text,vision};
}
