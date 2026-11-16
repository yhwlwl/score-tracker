/* Geometry references for screenshot localization. Originals stay unchanged. */
(function(root){
  'use strict';
  function plan(width,height){
    var boxes=[[0,0,1,1]],overlap=.055;
    if(width>height*1.15||height>width*1.15){
      var horizontal=width>height;
      for(var i=0;i<3;i++){var start=Math.max(0,i/3-overlap),end=Math.min(1,(i+1)/3+overlap);boxes.push(horizontal?[start,0,end-start,1]:[0,start,1,end-start]);}
    }else for(var y=0;y<2;y++)for(var x=0;x<2;x++){var left=Math.max(0,x/2-overlap),top=Math.max(0,y/2-overlap),right=Math.min(1,(x+1)/2+overlap),bottom=Math.min(1,(y+1)/2+overlap);boxes.push([left,top,right-left,bottom-top]);}
    return boxes;
  }
  // Detect ink bands, without OCR or assumptions about question numbers/layout.
  // Long ruling lines and isolated speckles are excluded from the row projection.
  function rows(pixels,width,height){
    var active=[],bands=[],start=-1,last=-1,columns=new Uint32Array(width);
    for(var cy=0;cy<height;cy++)for(var cx=3;cx<width-3;cx++){var ci=(cy*width+cx)*4;if(pixels[ci]<140&&pixels[ci+1]<140&&pixels[ci+2]<140)columns[cx]++;}
    for(var y=0;y<height;y++){
      var count=0;
      for(var x=3;x<width-3;x++){var i=(y*width+x)*4;if(columns[x]<height*.6&&pixels[i]<140&&pixels[i+1]<140&&pixels[i+2]<140)count++;}
      active[y]=count>=Math.max(4,width*.003)&&count<width*.65;
      if(active[y]){if(start<0)start=y;last=y;}
      if(start>=0&&(!active[y]&&y-last>4||y===height-1)){
        if(last-start>=2)bands.push([Math.floor(start/height*1000),Math.ceil((last+1)/height*1000)]);
        start=-1;
      }
    }
    return bands.length>1&&bands.length<=120&&!(bands.length<12&&bands.some(function(b){return b[1]-b[0]>100;}))?bands:[];
  }
  function frames(pixels,width,height){
    var groups=[],last=-1000,radius=Math.max(2,Math.round(width*.005)),counts=new Uint32Array(width);
    for(var y=0;y<height;y++){
      var prefix=new Uint32Array(width+1);
      for(var x=0;x<width;x++){var i=(y*width+x)*4;prefix[x+1]=prefix[x]+(pixels[i]<200&&pixels[i+1]<200&&pixels[i+2]<200?1:0);}
      for(var x=3;x<width-3;x++)if(prefix[Math.min(width,x+radius+1)]>prefix[Math.max(0,x-radius)])counts[x]++;
    }
    for(var x=3;x<width-3;x++)if(counts[x]>height*.5){if(x-last>width*.02)groups.push([x,x]);else groups[groups.length-1][1]=x;last=x;}
    groups=groups.filter(function(g){return g[1]-g[0]<width*.05;});
    if(groups.length>12)return [];
    var result=[];
    for(var g=0;g<groups.length-1;g++)for(var next=g+1;next<groups.length;next++){
      var a=groups[g],b=groups[next];if(b[0]-a[1]<width*.15)continue;
      var start=-1,end=-1,best=[0,0];
      for(var yy=0;yy<height;yy++){
        var sides=[a,b].every(function(group){for(var xx=group[0];xx<=group[1];xx++){var j=(yy*width+xx)*4;if(pixels[j]<200&&pixels[j+1]<200&&pixels[j+2]<200)return true;}return false;});
        if(sides){if(start<0)start=yy;end=yy;}
        if(start>=0&&(!sides&&yy-end>10||yy===height-1)){if(end-start>height*.06)result.push([Math.floor(a[0]/width*1000),Math.floor(start/height*1000),Math.ceil((b[1]+1)/width*1000),Math.ceil((end+1)/height*1000)]);start=-1;}
      }

    }
    result=result.filter(function(f){
      if(f[3]-f[1]>=500)return true;
      var left=Math.round(f[0]/1000*width),right=Math.min(width,Math.round(f[2]/1000*width));
      return [f[1],f[3]].every(function(edge){var count=0,center=Math.round(edge/1000*height);for(var x=left;x<right;x++){for(var y=Math.max(0,center-8);y<Math.min(height,center+9);y++){var i=(y*width+x)*4;if(pixels[i]<200&&pixels[i+1]<200&&pixels[i+2]<200){count++;break;}}}return count>(right-left)*.8;});
    });
    result=result.filter(function(f){return !result.some(function(inner){return inner!==f&&inner[0]>=f[0]&&inner[2]<=f[2]&&inner[2]-inner[0]<f[2]-f[0]-10&&Math.min(inner[3],f[3])-Math.max(inner[1],f[1])>(f[3]-f[1])*.8;});});
    var children=[],columns=result.filter(function(f){return f[3]-f[1]>=200&&f[3]-f[1]<=500&&!result.some(function(other){return other!==f&&other[0]<=f[0]+5&&other[2]>=f[2]-5&&other[2]-other[0]>f[2]-f[0]+10;});});
    columns.forEach(function(frame){
      var left=Math.round(frame[0]/1000*width),right=Math.min(width,Math.round(frame[2]/1000*width)),lines=[];
      for(var y=3;y<height-3;y++){
        if(result.some(function(f){return y>=f[1]/1000*height&&y<=f[3]/1000*height&&Math.min(f[2],frame[2])-Math.max(f[0],frame[0])>(frame[2]-frame[0])*.5;}))continue;
        var n=0;for(var x=left;x<right;x++)for(var yy=y-3;yy<=y+3;yy++){var i=(yy*width+x)*4;if(pixels[i]<200&&pixels[i+1]<200&&pixels[i+2]<200){n++;break;}}
        if(n>(right-left)*.55&&(lines.length===0||y-lines[lines.length-1]>5))lines.push(y);
      }
      for(var i=1;i<lines.length;i++)if(lines[i]-lines[i-1]>height*.035&&lines[i]-lines[i-1]<height*.2)children.push([frame[0],Math.max(0,Math.floor((lines[i-1]-6)/height*1000)),frame[2],Math.min(1000,Math.ceil((lines[i]+7)/height*1000))]);
    });
    return result.concat(children).filter(function(f,i,all){return all.findIndex(function(other){return other.join(',')===f.join(',');})===i;}).slice(0,12);
  }
  function focusFrames(pageFrames,width,height){
    var compact=pageFrames.filter(function(f){return f[3]-f[1]<200&&(f[2]-f[0])*width/((f[3]-f[1])*height)>2;}).sort(function(a,b){return (b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]);}).slice(0,2);
    var columns=pageFrames.filter(function(f){return f[3]-f[1]>=200&&!pageFrames.some(function(other){return other!==f&&other[3]-other[1]>=200&&other[0]<=f[0]+5&&other[2]>=f[2]-5&&other[2]-other[0]>f[2]-f[0]+20;});});
    return compact.concat(columns).slice(0,5);
  }
  function printedInk(pixels){
    var result=new Uint8ClampedArray(pixels),changed=0;
    for(var i=0;i<result.length;i+=4){var high=Math.max(result[i],result[i+1],result[i+2]),low=Math.min(result[i],result[i+1],result[i+2]);if(high-low>50&&high>100){result[i]=result[i+1]=result[i+2]=255;changed++;}}
    return {pixels:result,changed:changed};
  }
  function build(source){
    var boxes=plan(source.width,source.height),baseCount=boxes.length,canvas=document.createElement('canvas'),rowBands=[],pageFrames=[];
    var overviewScale=Math.min(1,1600/Math.max(source.width,source.height));canvas.width=Math.round(source.width*overviewScale);canvas.height=Math.round(source.height*overviewScale);
    var overview=canvas.getContext('2d');overview.fillStyle='#fff';overview.fillRect(0,0,canvas.width,canvas.height);overview.drawImage(source,0,0,canvas.width,canvas.height);
    pageFrames=frames(overview.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
    var focus=focusFrames(pageFrames,source.width,source.height);
    if(focus.length){boxes=[[0,0,1,1]];baseCount=1;focus.forEach(function(f){boxes.push([f[0]/1000,f[1]/1000,(f[2]-f[0])/1000,(f[3]-f[1])/1000]);});}
    boxes=boxes.slice(0,6);
    var urls=boxes.map(function(box,viewIndex){
      var sx=Math.round(box[0]*source.width),sy=Math.round(box[1]*source.height),sw=Math.min(source.width-sx,Math.round(box[2]*source.width)),sh=Math.min(source.height-sy,Math.round(box[3]*source.height));
      // Keep geometry tied to the actual rounded pixel crop.
      box.splice(0,4,sx/source.width,sy/source.height,sw/source.width,sh/source.height);
      var scale=Math.min(viewIndex>=baseCount?3:1,(viewIndex===0?3200:2000)/Math.max(sw,sh),Math.sqrt(8000000/(sw*sh))),cw=Math.round(sw*scale),ch=Math.round(sh*scale),leftMargin=44,topMargin=22;
      canvas.width=cw+88;canvas.height=ch+44;
      var c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(source,sx,sy,sw,sh,leftMargin,topMargin,cw,ch);
      var pixels=(viewIndex===0||viewIndex>=baseCount&&box[3]>.2)?c.getImageData(leftMargin,topMargin,cw,ch).data:null;
      var bands=pixels?rows(pixels,cw,ch):[];rowBands.push(bands);
      c.strokeStyle='rgba(30,100,200,.20)';c.lineWidth=1;c.font='bold 13px sans-serif';
      for(var i=0;i<=10;i++){
        var px=leftMargin+cw*i/10,py=topMargin+ch*i/10,label=String(i*100);
        c.beginPath();c.moveTo(px,topMargin);c.lineTo(px,topMargin+ch);c.moveTo(leftMargin,py);c.lineTo(leftMargin+cw,py);c.stroke();
        c.fillStyle='#1e64c8';c.fillText(label,Math.min(px,canvas.width-c.measureText(label).width),14);c.fillText(label,leftMargin+cw+3,Math.min(py+5,canvas.height-3));
      }
      c.font='bold 11px sans-serif';c.fillStyle='#174ca8';
      bands.forEach(function(band,index){c.fillText('L'+(index+1),2,topMargin+band[0]/1000*ch+10);});
      if(viewIndex===0)pageFrames.forEach(function(frame,index){c.fillText('F'+(index+1),leftMargin+(frame[0]+frame[2])/2000*cw,Math.max(14,topMargin+frame[1]/1000*ch-4));});
      // Separate colored corrections from black printed labels for small answer grids.
      // Both model panels refer to the same original crop; only the upper panel grades.
      if(viewIndex>=baseCount&&box[3]<.2){
        canvas.width=cw;canvas.height=ch;c=canvas.getContext('2d');c.drawImage(source,sx,sy,sw,sh,0,0,cw,ch);
        var original=c.getImageData(0,0,cw,ch),cleaned=printedInk(original.data),caption=26;
        if(cleaned.changed>cw*ch*.0005){
          canvas.height=2*(ch+caption);c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cw,canvas.height);c.putImageData(original,0,caption);
          original.data.set(cleaned.pixels);c.putImageData(original,0,ch+2*caption);c.fillStyle='#174ca8';c.font='bold 15px sans-serif';c.fillText('A 原图：读取批改分',8,18);c.fillText('B 隐藏彩色批改：只核对印刷题号，不读得分',8,ch+caption+18);
        }
      }
      var encoded=canvas.toDataURL('image/jpeg',.92);
      if(encoded.length>2800000)encoded=canvas.toDataURL('image/jpeg',.82);
      if(encoded.length>2800000)throw new Error('图片内容过多，请裁剪成单页后再选');
      return encoded;
    });
    canvas.width=canvas.height=1;return {regions:urls,region_boxes:boxes,region_rows:rowBands,page_frames:pageFrames,region_focus:boxes.map(function(_,i){return i;}).filter(function(i){return i>=baseCount;})};
  }
  root.ScorePaperScanViews={plan:plan,build:build,rows:rows,frames:frames,focusFrames:focusFrames,printedInk:printedInk};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ScorePaperScanViews;
})(globalThis);
