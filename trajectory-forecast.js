/* A descriptive estimate from anonymous references, not a calibrated probability. */
(function () {
  'use strict';
  var defaults={similarity:1,history:0.5,width:1};
  function settings(input) {
    input=input||{};var out={};
    [['similarity',0,3],['history',0,2],['width',0.5,2]].forEach(function(spec){
      var v=input[spec[0]];out[spec[0]]=typeof v==='number'&&Number.isFinite(v)&&v>=spec[1]&&v<=spec[2]?v:defaults[spec[0]];
    });return out;
  }
  function clamp(v) {return Math.max(0,Math.min(100,v));}
  function align(own,peer,mode) {
    var offset=mode==='shape'?own[own.length-1]-peer.history[peer.history.length-1]:0;
    return {offset:offset,history:peer.history.map(function(v){return clamp(v+offset);}),future:peer.future.map(function(v){return clamp(v+offset);})};
  }
  function estimate(own,peers,mode,input) {
    if(!own.length||!Number.isFinite(own[own.length-1]))return null;
    var cfg=settings(input),samples=[];
    peers.forEach(function(peer){
      if(!peer.history.length||!Number.isFinite(peer.history[peer.history.length-1])||!Number.isFinite(peer.future[0]))return;
      var aligned=align(own,peer,mode),score=typeof peer.match_score==='number'&&Number.isFinite(peer.match_score)&&peer.match_score>=0&&peer.match_score<=100?Math.max(0.01,peer.match_score/100):1;
      samples.push({value:aligned.future[0],weight:Math.pow(score,cfg.similarity)*Math.pow(peer.history.length,cfg.history)});
    });
    if(!samples.length)return null;
    var total=samples.reduce(function(sum,s){return sum+s.weight;},0),mean=0,variance=0;
    samples.forEach(function(s){s.weight/=total;mean+=s.value*s.weight;});
    samples.forEach(function(s){variance+=s.weight*Math.pow(s.value-mean,2);});
    var changes=[];for(var j=Math.max(1,own.length-5);j<own.length;j++)if(Number.isFinite(own[j])&&Number.isFinite(own[j-1]))changes.push(Math.abs(own[j]-own[j-1]));
    changes.sort(function(a,b){return a-b;});
    var volatility=changes.length?changes[Math.floor(changes.length/2)]:0;
    // Shared Gaussian bandwidth includes recent own volatility, so agreement does not imply certainty.
    var bandwidth=Math.max(0.5,0.35*Math.sqrt(variance),0.35*volatility),density=[],area=[0],peak=-1,center=0;
    // Integrate only the valid 0–100 domain, at 0.1 percentage-point resolution.
    for(var i=0;i<=1000;i++){
      var x=i/10,p=0;samples.forEach(function(s){p+=s.weight*Math.exp(-0.5*Math.pow((x-s.value)/bandwidth,2));});density.push(p);
      if(p>peak+1e-12||(Math.abs(p-peak)<=1e-12&&Math.abs(x-mean)<Math.abs(center-mean))){peak=p;center=x;}
      if(i)area.push(area[i-1]+(density[i-1]+p)*0.05);
    }
    function quantile(q){
      var target=area[1000]*q;for(var k=1;k<=1000;k++)if(area[k]>=target){var span=area[k]-area[k-1];return (k-1+(span?(target-area[k-1])/span:0))/10;}return 100;
    }
    var low=Math.min(center,quantile(0.1)),high=Math.max(center,quantile(0.9));
    return {center:center,low:clamp(center-(center-low)*cfg.width),high:clamp(center+(high-center)*cfg.width),count:samples.length,bandwidth:bandwidth,samples:samples};
  }
  window.__stTrajectoryForecast={settings:settings,align:align,estimate:estimate};
})();
