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
  function build(source){
    var boxes=plan(source.width,source.height),canvas=document.createElement('canvas');
    var urls=boxes.map(function(box){
      var sx=Math.round(box[0]*source.width),sy=Math.round(box[1]*source.height),sw=Math.min(source.width-sx,Math.round(box[2]*source.width)),sh=Math.min(source.height-sy,Math.round(box[3]*source.height));
      // Keep geometry tied to the actual rounded pixel crop.
      box.splice(0,4,sx/source.width,sy/source.height,sw/source.width,sh/source.height);
      var scale=Math.min(1,1600/Math.max(sw,sh));canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);
      var c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(source,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
      c.strokeStyle='rgba(30,100,200,.20)';c.lineWidth=1;c.font='bold 13px sans-serif';
      for(var i=0;i<=10;i++){
        var px=Math.min(canvas.width-1,canvas.width*i/10),py=Math.min(canvas.height-1,canvas.height*i/10);
        c.beginPath();c.moveTo(px,0);c.lineTo(px,canvas.height);c.moveTo(0,py);c.lineTo(canvas.width,py);c.stroke();
        var label=String(i*100),tw=c.measureText(label).width+4;
        c.fillStyle='rgba(255,255,255,.93)';c.fillRect(Math.min(px,canvas.width-tw),0,tw,17);c.fillRect(0,Math.min(py,canvas.height-17),tw,17);
        c.fillStyle='#1e64c8';c.fillText(label,Math.min(px+2,canvas.width-tw+2),13);c.fillText(label,2,Math.min(py+13,canvas.height-4));
      }
      return canvas.toDataURL('image/jpeg',.86);
    });canvas.width=canvas.height=1;return {regions:urls,region_boxes:boxes};
  }
  root.ScorePaperScanViews={plan:plan,build:build};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ScorePaperScanViews;
})(globalThis);
