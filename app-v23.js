// v23 / product v1.9: stop subject add/remove mutation storms and keep subject settings lightweight.
(function(){
  var PRODUCT_VERSION_V23='v1.9';

  function syncVersionV23(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V23);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V23;
  }
  syncVersionV23();

  // v17 and v21 both decorate the exam subject list with MutationObserver({subtree:true}).
  // Adding/removing a subject rebuilds the list, then each decorator mutates the same subtree,
  // causing the observers to wake each other repeatedly on slower/mobile browsers.
  // They only need to know when cards are added/removed, so observe direct children only.
  var openExamBeforeV23=openExam;
  openExam=function openExamV23(exam=null){
    var NativeMutationObserver=window.MutationObserver;
    if(typeof NativeMutationObserver!=='function')return openExamBeforeV23(exam);

    function DirectChildMutationObserver(callback){
      var observer=new NativeMutationObserver(callback);
      var nativeObserve=observer.observe.bind(observer);
      observer.observe=function(target,options){
        if(target&&target.id==='examSubjectsV16'&&options&&options.childList){
          return nativeObserve(target,Object.assign({},options,{subtree:false}));
        }
        return nativeObserve(target,options);
      };
      return observer;
    }
    DirectChildMutationObserver.prototype=NativeMutationObserver.prototype;

    try{
      window.MutationObserver=DirectChildMutationObserver;
      return openExamBeforeV23(exam);
    }finally{
      window.MutationObserver=NativeMutationObserver;
      syncVersionV23();
    }
  };

  // The global subject settings screen does not need to rebuild every row when one row changes.
  // Keep existing save validation/API logic, but make add/remove a local DOM operation.
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV23=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV23(){
      openSubjectManagerBeforeV23();
      var modal=state.modal;
      var list=modal&&modal.querySelector('#subjectConfigList');
      var add=modal&&modal.querySelector('#addSubjectRowV7');
      if(!modal||!list||!add)return;

      function rowHtml(){
        return '<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="100" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>';
      }
      function bindRemove(){
        list.querySelectorAll('.remove-subject-v7').forEach(function(button){
          button.onclick=function(){
            var rows=list.querySelectorAll('.subject-config-row-v7');
            if(rows.length<=1)return toast('至少保留 1 个科目');
            var row=button.closest('.subject-config-row-v7');
            if(row)row.remove();
          };
        });
      }
      bindRemove();
      add.onclick=function(){
        var count=list.querySelectorAll('.subject-config-row-v7').length;
        if(count>=20)return toast('最多设置 20 个科目');
        list.insertAdjacentHTML('beforeend',rowHtml());
        bindRemove();
        var inputs=list.querySelectorAll('.subject-name-input-v7');
        if(inputs.length)inputs[inputs.length-1].focus();
      };
    };
  }
})();
