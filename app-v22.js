// v22 / product v1.1: keep raw-only fallback scientifically safe across different score scales.
(function(){
  var base=typeof examScoreBeforeV20==='function'?examScoreBeforeV20:examScore;
  examScore=function examScoreV22(exam,subject,key){
    if(key!=='actual')return base(exam,subject,key);
    var row=exam?.scores?.[subject];
    if(row){
      var actual=num(row.actual);if(actual!==null)return actual;
      var raw=num(row.raw),max=num(row.max)??defaultMax(subject),rawMax=num(row.rawMax)??max;
      return raw!==null&&rawMax===max?raw:null;
    }
    return base(exam,subject,key);
  };
  if(typeof recordHtmlBeforeV20==='function')recordHtml=function recordHtmlV22(exam){return recordHtmlBeforeV20(exam);};
})();
