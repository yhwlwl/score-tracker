// No real user image or record is sent. The expected image color is chosen locally.
const colors = {red:[255,0,0],blue:[0,0,255],green:[0,255,0],yellow:[255,255,0]} as const;
export type ProbeColor = keyof typeof colors;
function concat(...parts:Uint8Array[]){
  const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let pos=0;
  for(const p of parts){out.set(p,pos);pos+=p.length;}return out;
}
function u32(n:number){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n);return b;}
function chunk(name:string,data:Uint8Array){
  const body=concat(new TextEncoder().encode(name),data);
  let crc=0xffffffff;
  for(const b of body){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return concat(u32(data.length),body,u32((crc^0xffffffff)>>>0));
}
export async function makeProbePng(color:ProbeColor){
  const w=96,h=96,rgb=colors[color],stride=1+w*3;
  const raw=new Uint8Array(h*stride);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(rgb,y*stride+1+x*3);
  const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressed=new Uint8Array(await new Response(stream).arrayBuffer());
  const png=concat(new Uint8Array([137,80,78,71,13,10,26,10]),chunk("IHDR",concat(u32(w),u32(h),new Uint8Array([8,2,0,0,0]))),chunk("IDAT",compressed),chunk("IEND",new Uint8Array()));
  return btoa(String.fromCharCode(...png));
}
export async function runGoProbe(send:(kind:string,body:any)=>Promise<Response>) {
  const nonce="st-"+crypto.randomUUID().slice(0,8);
  const keys=Object.keys(colors) as ProbeColor[];
  const color=keys[crypto.getRandomValues(new Uint8Array(1))[0]%keys.length];
  const png=await makeProbePng(color);
  const options={max_tokens:128,temperature:0,thinking:{type:"disabled"},response_format:{type:"json_object"}};
  async function check(kind:string,content:any,field:string,expected:string){
    const start=Date.now();
    const result=(ok:boolean,status:number,code:string)=>({ok,status,code,latency_ms:Date.now()-start});
    try{
      const res=await send(kind,{...options,messages:[{role:"user",content}]});
      if(!res.ok){
        const p=await res.json().catch(()=>null);
        const message=String(p?.error?.message||p?.message||"").toLowerCase();
        const code=/image input is not available|does not support image|image input.*not supported/.test(message)?"image_not_supported":/invalid.*image|image.*decode|invalid.*base64|invalid.*png/.test(message)?"invalid_image":"upstream_error";
        return result(false,res.status,code);
      }
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
