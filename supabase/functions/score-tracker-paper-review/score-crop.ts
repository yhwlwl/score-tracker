import * as jpeg from 'npm:jpeg-js@0.4.4';

// Decode only bounded, owner-checked JPEGs. Larger or unusually expensive
// images use pre-generated coverage views instead.
const SCORE_CROP_MAX_PIXELS = 8000000;
const SCORE_CROP_MAX_BYTES = 2100000;
const SCORE_CROP_MAX_REGIONS = 2;
const intersection = (a: number[], b: number[]) => Math.max(0, Math.min(a[0]+a[2], b[0]+b[2])-Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1]+a[3], b[1]+b[3])-Math.max(a[1], b[1]));

export function missingScoreCropBoxes(page: any, targets: any[]) {
  const existing = (page.region_boxes || []).filter((b: any, i:number) => i > 0 && page.regions?.[i] && Array.isArray(b) && b.length === 4);
  const groups = new Map<string, {box:number[], labels:Set<string>}>();
  for (const q of targets) for (const r of q.source_regions || []) {
    const b = r?.box;
    if (r?.kind !== 'work' || r.page !== page.page || !Array.isArray(b) || b.length !== 4 || b.some((v:any) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) || b[2] <= .005 || b[3] <= .005 || b[0]+b[2] > 1.001 || b[1]+b[3] > 1.001) continue;
    const area = b[2] * b[3];
    if (area > .5) continue; // A guessed full-page region is not a useful crop.
    // A tight existing view already covers this target: do not create a duplicate.
    if (existing.some((v:number[]) => intersection(v,b) >= area*.9 && v[2]*v[3] <= area*1.6)) continue;
    const key = b.map((v:number) => Math.round(v*1000)).join(':');
    const group = groups.get(key) || {box:b,labels:new Set<string>()};
    group.labels.add(String(q.label));groups.set(key,group);
  }
  return [...groups.values()].sort((a,b) => b.labels.size-a.labels.size).slice(0,SCORE_CROP_MAX_REGIONS).map(({box:b,labels}) => {
    // Include adjacent red marks just outside the original detected box.
    const px=Math.max(.02,b[2]*.1),py=Math.max(.02,b[3]*.3);
    const l=Math.max(0,b[0]-px),t=Math.max(0,b[1]-py),r=Math.min(1,b[0]+b[2]+px),bottom=Math.min(1,b[1]+b[3]+py);
    return {box:[l,t,r-l,bottom-t],labels:[...labels]};
  });
}

export function cropMissingScoreViews(page: any, targets: any[]) {
  const boxes = missingScoreCropBoxes(page,targets);
  if (!boxes.length || typeof page.url !== 'string' || !page.url.startsWith('data:image/jpeg;base64,')) return [];
  const encoded=page.url.slice(page.url.indexOf(',')+1);
  if (!encoded || encoded.length > Math.ceil(SCORE_CROP_MAX_BYTES*4/3)+4) return [];
  try {
    const raw=atob(encoded),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    const image=jpeg.decode(bytes,{useTArray:true,formatAsRGBA:false,maxResolutionInMP:SCORE_CROP_MAX_PIXELS/1000000,maxMemoryUsageInMB:120});
    return boxes.map(({box,labels}) => {
      const x=Math.max(0,Math.floor(box[0]*image.width)),y=Math.max(0,Math.floor(box[1]*image.height));
      const right=Math.min(image.width,Math.ceil((box[0]+box[2])*image.width)),bottom=Math.min(image.height,Math.ceil((box[1]+box[3])*image.height));
      const width=right-x,height=bottom-y,pixels=new Uint8Array(width*height*4);
      for(let row=0;row<height;row++)for(let col=0;col<width;col++){
        const src=((y+row)*image.width+x+col)*3,dst=(row*width+col)*4;
        pixels[dst]=image.data[src];pixels[dst+1]=image.data[src+1];pixels[dst+2]=image.data[src+2];pixels[dst+3]=255;
      }
      const data=jpeg.encode({data:pixels,width,height},90).data;
      let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));
      return {box,labels,url:'data:image/jpeg;base64,'+btoa(binary)};
    });
  } catch (_) { return []; } // Unsupported/large images keep the previous reads.
}
