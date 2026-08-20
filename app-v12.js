// v12: mobile radar controls should wrap cleanly instead of overflowing the card
(() => {
  if (document.getElementById('app-v12-radar-layout')) return;
  const style = document.createElement('style');
  style.id = 'app-v12-radar-layout';
  style.textContent = `
    .radar-toolbar .toggle-row{flex-wrap:wrap}
    .radar-toolbar .multi-select{flex-wrap:wrap;overflow:visible}

    @media(max-width:620px){
      .radar-toolbar{gap:14px}
      .radar-toolbar .toggle-row{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
      }
      .radar-toolbar .toggle-row .label{
        grid-column:1 / -1;
        margin:0 0 2px;
      }
      .radar-toolbar .toggle-row .chip{
        width:100%!important;
        min-width:0!important;
        padding:10px 8px!important;
        justify-content:center;
        text-align:center;
        white-space:nowrap;
      }
      .radar-toolbar .multi-select{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
        max-width:100%;
        overflow:visible!important;
        padding:0!important;
      }
      .radar-toolbar .select-pill{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        white-space:normal!important;
        line-height:1.35;
        padding:10px 8px!important;
        text-align:center;
        overflow-wrap:anywhere;
      }
    }

    @media(max-width:360px){
      .radar-toolbar .toggle-row,
      .radar-toolbar .multi-select{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);
})();
