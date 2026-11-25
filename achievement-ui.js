/* Score Tracker achievement cards and collection. No remote assets or client-side award writes. */
(function(g){'use strict';
const C=g.ScoreAchievements;if(!C)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=new Map(C.badges.map(b=>[b.id,b])),levels=['common','rare','epic','legendary','mythic','limited'];
const colors={common:['#f2f5f7','#a6b2c3','#56677b'],rare:['#b9e6ff','#548dcc','#284b7b'],epic:['#e7d5ff','#a284d9','#54367e'],legendary:['#fff1bd','#cf9f49','#795624'],mythic:['#e9e2ff','#b294e9','#4e3f81'],limited:['#d2fff2','#57b5a8','#25675e']};
const path={
 common:'M100 12a88 88 0 1 1 0 176a88 88 0 1 1 0-176',
 rare:'M100 6L175 49V151L100 194L25 151V49Z',
 epic:'M100 5L151 18L190 64L181 135L100 195L19 135L10 64L49 18Z',
 legendary:'M100 4L121 25L150 18L158 45L187 65L176 100L187 135L158 155L150 182L121 175L100 196L79 175L50 182L42 155L13 135L24 100L13 65L42 45L50 18L79 25Z',
 mythic:'M100 2L121 25L154 12L156 48L195 65L177 100L195 135L156 152L154 188L121 175L100 198L79 175L46 188L44 152L5 135L23 100L5 65L44 48L46 12L79 25Z',
 limited:'M100 8a92 92 0 1 1 0 184a92 92 0 1 1 0-184'
};
const star=(x,y,r=7)=>'<path d="M'+x+' '+(y-r)+'l'+(r*.25)+' '+(r*.75)+' '+(r*.75)+' '+(r*.25)+'-'+(r*.75)+' '+(r*.25)+'-'+(r*.25)+' '+(r*.75)+'-'+(r*.25)+'-'+(r*.75)+'-'+(r*.75)+'-'+(r*.25)+' '+(r*.75)+'-'+(r*.25)+'z" fill="currentColor" stroke="none"/>';
const L=(d,extra='')=>'<path d="'+d+'" '+extra+'/>';
const circle=(x,y,r,extra='')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" '+extra+'/>';
const text=(x,y,s,size=20)=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">'+esc(s)+'</text>';
const motif={
 seed:()=>L('M100 145V79M100 102Q64 100 60 67Q94 62 100 102M100 119Q137 115 143 83Q112 80 100 119')+L('M69 145H131','opacity=".5"'),
 grid:()=>[0,1,2].map(i=>[0,1,2].map(j=>'<rect x="'+(59+i*29)+'" y="'+(59+j*29)+'" width="23" height="23" rx="4" fill="currentColor" opacity="'+(0.4+(i+j)*.14)+'" stroke="none"/>').join('')).join(''),
 lens:()=>circle(88,88,32)+L('M110 110L142 142M67 100L80 85L91 91L105 73'),
 spark:()=>star(100,93,36)+star(142,55,10)+L('M70 144H130','opacity=".5"'),
 trail:()=>L('M52 136Q64 113 84 118T114 92T148 54','stroke-dasharray="7 10"')+circle(52,136,5,'fill="currentColor"')+circle(114,92,5,'fill="currentColor"')+star(148,54,9),
 quill:()=>L('M60 143L123 76M74 128Q55 90 87 63Q113 48 146 51Q144 102 104 121L74 128M96 108L91 78M110 94L134 92'),
 compass:()=>circle(100,100,43)+L('M112 60L103 104L61 128L97 91Z','fill="currentColor" fill-opacity=".55"')+star(100,48,5),
 arrow:()=>L('M54 140L83 111L105 117L147 68M124 68H147V91'),
 steps:()=>[0,1,2,3,4].map(i=>circle(53+i*22,135-i*15,8,'fill="currentColor" opacity="'+(.4+i*.14)+'" stroke="none"')).join('')+L('M52 135L141 75','stroke-width="2" opacity=".4"'),
 calendar:()=>L('M58 65H142V143H58ZM58 86H142M77 53V75M123 53V75')+star(100,113,14),
 half:()=>circle(100,100,45)+L('M100 55A45 45 0 0 1 100 145Z','fill="currentColor" opacity=".5"')+L('M100 73V127'),
 stairs:()=>L('M54 139H80V112H108V84H140V58M125 58H140V73'),
 dual:()=>L('M54 73L100 119L146 93','opacity=".5" stroke-dasharray="5 6"')+L('M54 135L100 97L146 60M131 60H146V75'),
 wave:()=>L('M53 136Q68 100 82 118T110 90T146 61')+L('M56 146L144 146','opacity=".4"'),
 merge:()=>L('M52 69L86 102L107 94L145 55M52 132L86 102M129 55H145V72')+circle(86,102,6,'fill="currentColor"'),
 peak:()=>L('M49 145L81 99L101 121L132 64L151 145Z')+L('M116 92L132 64L140 94','fill="currentColor" opacity=".5"')+star(132,50,7),
 ten:()=>text(100,118,'10',61)+L('M61 135H139','opacity=".5"'),
 'forecast-one':()=>L('M51 132L83 106L117 112L148 90','stroke-dasharray="5 7" opacity=".45"')+L('M51 132L83 106L117 89L148 58')+star(148,58,10),
 road:()=>L('M49 139C59 111 80 138 99 104S130 97 148 54')+L('M48 151C67 122 84 150 108 112S140 105 158 67','opacity=".35"')+star(148,54,7),
 comeback:()=>L('M52 68L82 132L111 112L149 52M128 53H149V75')+circle(82,132,6,'fill="currentColor"'),
 'stars-three':()=>L('M58 122L100 62L142 122Z','stroke-width="3" opacity=".5"')+star(58,122,14)+star(100,62,18)+star(142,122,14),
 shield:()=>L('M100 50L145 68V101Q144 134 100 151Q56 134 55 101V68Z')+L('M73 104L91 122L127 84'),
 crystal:()=>L('M100 47L137 82L122 148H78L63 82Z M63 82L100 100L137 82M100 47V148','stroke-width="4"')+star(100,58,9),
 hourglass:()=>L('M65 54H135M65 146H135M73 58Q73 83 100 100Q127 117 127 142M127 58Q127 83 100 100Q73 117 73 142')+L('M81 135L100 119L119 135Z','fill="currentColor" opacity=".5"'),
 seasons:()=>[0,1,2,3].map(i=>'<path d="M100 100L100 57A43 43 0 0 1 143 100Z" transform="rotate('+(i*90)+' 100 100)" fill="currentColor" opacity="'+(.25+i*.18)+'"/>').join('')+circle(100,100,43),
 'break-ring':()=>circle(100,100,42,'stroke-dasharray="180 84" transform="rotate(-40 100 100)"')+L('M72 130L146 54M125 54H146V76'),
 butterfly:()=>L('M100 110Q56 40 48 76Q40 117 89 122Q57 153 85 149L100 131L115 149Q143 153 111 122Q160 117 152 76Q144 40 100 110Z','fill="currentColor" fill-opacity=".22"')+L('M100 86V140M100 86L89 70M100 86L111 70'),
 puzzle:()=>L('M58 58H91Q79 78 100 78Q121 78 109 58H142V92Q122 80 122 100Q122 120 142 108V142H108Q120 122 100 122Q80 122 92 142H58V108Q78 120 78 100Q78 80 58 92Z'),
 sail:()=>L('M100 47L148 116H100ZM91 68V116H56Z','fill="currentColor" fill-opacity=".2"')+L('M49 130Q71 116 91 130T132 130T151 130M61 142Q81 130 101 142T141 142','stroke-width="4"'),
 'stars-five':()=>Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5-Math.PI/2;return star(100+44*Math.cos(a),100+44*Math.sin(a),11)}).join('')+circle(100,100,42,'stroke-width="3" opacity=".45"')+star(100,100,18),
 prism:()=>L('M100 47L151 137H49Z M100 47L100 137M49 137L126 92','stroke-width="4"')+L('M45 103H84M120 86L151 65','stroke-width="3" stroke-dasharray="5 5"'),
 sun:()=>circle(100,100,28,'fill="currentColor" fill-opacity=".2"')+Array.from({length:12},(_,i)=>L('M100 48V61','transform="rotate('+(i*30)+' 100 100)"')).join(''),
 'forecast-three':()=>L('M51 138L79 114L112 105L149 84','stroke-dasharray="5 6" opacity=".45"')+L('M51 138L79 102L112 74L149 50')+[ [79,102],[112,74],[149,50] ].map(([x,y])=>circle(x,y,6,'fill="currentColor"')).join(''),
 range:()=>'<rect x="51" y="91" width="98" height="42" rx="5" fill="currentColor" opacity=".18" stroke-dasharray="5 5"/>'+L('M51 91H149M100 112V56','stroke-dasharray="5 6" opacity=".7"')+circle(100,56,9,'fill="currentColor"')+circle(100,56,17,'stroke-width="2"'),
 'book-twenty':()=>L('M49 64Q78 56 100 73Q122 56 151 64V139Q122 130 100 145Q78 130 49 139Z M100 73V145','stroke-width="4"')+text(100,114,'20',32),
 branch:()=>L('M51 140L83 113L101 120L147 108M101 120L147 139','stroke-dasharray="5 6" opacity=".55"')+L('M51 140L83 113L101 120L147 54M128 54H147V73'),
 rings:()=>[16,28,40,49].map((r,i)=>circle(100,100,r,'stroke-width="'+(i===3?3:4)+'" opacity="'+(.4+i*.18)+'"')).join('')+L('M100 100L143 67','stroke-width="4"'),
 summit:()=>L('M48 144L81 110L94 126L133 60L153 144Z M108 105L133 60L140 96','stroke-width="4"')+star(133,49,12),
 mountain:()=>L('M44 144L78 93L95 115L131 52L157 144Z M120 72L131 52L141 83','fill="currentColor" fill-opacity=".18"')+L('M50 144H153')+star(132,44,7),
 shatter:()=>L('M55 60H137V145H55Z','stroke-dasharray="9 8" opacity=".55"')+L('M54 142L86 107L105 119L151 49M132 49H151V68')+L('M138 78L158 82M132 45L125 32','stroke-width="3"'),
 diamond:()=>L('M52 95L74 63H126L148 95L100 151Z M52 95H148M74 63L100 151L126 63','stroke-width="4"')+star(100,42,11),
 phase:()=>L('M50 130H83L115 67H150','stroke-dasharray="5 6" opacity=".5"')+L('M50 130L67 122L83 133L103 77L119 65L133 73L150 58')+L('M98 48V150','stroke-width="2" stroke-dasharray="3 5"')+circle(103,77,7,'fill="currentColor"'),
 horizon:()=>L('M48 132H152M52 132A48 48 0 0 1 148 132','stroke-width="4"')+L('M64 120L100 93L146 54M127 54H146V73')+star(100,72,8),
 infinity:()=>L('M53 100C53 67 80 64 100 100C120 136 147 133 147 100C147 67 120 64 100 100C80 136 53 133 53 100Z','stroke-width="6"')+star(145,55,9),
 scroll:()=>L('M49 69Q75 57 100 73Q125 57 151 69V141Q125 129 100 144Q75 129 49 141Z M100 73V144','stroke-width="4"')+star(74,96,11)+star(128,104,14)+star(82,126,6),
 flag:()=>L('M71 145V52M71 58Q101 43 141 67L126 94Q99 76 71 91','fill="currentColor" fill-opacity=".2"'),
 triple:()=>L('M55 130H87V104H117V77H145V49M127 49H145V67','stroke-width="5"')+text(67,147,'1M',15)+text(103,121,'10K',14)+text(133,92,'100',13),
 idea:()=>L('M81 124Q81 111 66 96Q54 65 82 54Q100 46 118 54Q146 65 134 96Q119 111 119 124ZM84 138H116M91 149H109')+star(100,82,13),
 tools:()=>L('M57 60L82 85L73 95L48 72Q40 103 67 112L111 151L130 132L86 90M129 51L148 69L95 122','stroke-width="5"')+star(144,51,7),
 rocket:()=>L('M100 54Q130 75 130 112L114 127H86L70 112Q70 75 100 54Z M70 104L49 136L86 127M130 104L151 136L114 127')+circle(100,94,12)+L('M92 138L100 157L108 138'),
 flame:()=>L('M103 49Q142 86 141 112Q142 149 100 151Q62 151 59 117Q59 92 80 75Q80 100 99 109Q115 82 103 49Z','fill="currentColor" fill-opacity=".22"')+L('M100 113Q122 138 100 148Q79 138 100 113Z','fill="currentColor"'),
 year:()=>L('M54 61H146V145H54ZM54 86H146M77 49V73M123 49V73','stroke-width="4"')+text(100,120,'2026',29)
};
let svgId=0;
function emblem(b,locked=false){
 const id='stbadge'+(++svgId),[light,accent,dark]=colors[b.tier],shape=path[b.tier],special=b.tier==='mythic',limited=b.tier==='limited';
 if(locked)return '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="'+shape+'" fill="none" stroke="currentColor" opacity=".26" stroke-width="2"/><circle cx="100" cy="100" r="62" fill="currentColor" opacity=".06"/><path d="M77 98V86a23 23 0 0 1 46 0v12M69 98h62v44H69z" fill="none" stroke="currentColor" stroke-width="6" opacity=".35"/></svg>';
 return '<svg viewBox="0 0 200 200" aria-hidden="true" class="st-ach-emblem" style="color:'+light+'"><defs><linearGradient id="'+id+'r" x1="0" y1="0" x2="1" y2="1">'+(special?'<stop stop-color="#b7f1ff"/><stop offset=".28" stop-color="#c5b4ff"/><stop offset=".53" stop-color="#fbd8e7"/><stop offset=".76" stop-color="#f9e5b2"/><stop offset="1" stop-color="#9584cb"/>':'<stop stop-color="'+light+'"/><stop offset=".33" stop-color="'+accent+'"/><stop offset=".54" stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/>')+'</linearGradient><radialGradient id="'+id+'c"><stop stop-color="'+dark+'"/><stop offset="1" stop-color="#172035"/></radialGradient></defs><path d="'+shape+'" fill="url(#'+id+'r)"/><path d="'+shape+'" fill="url(#'+id+'c)" transform="translate(100 100) scale(.9) translate(-100 -100)" stroke="'+light+'" stroke-width="1"/><circle cx="100" cy="100" r="62" fill="none" stroke="url(#'+id+'r)" stroke-width="'+(b.tier==='common'?2:4)+'"/><circle cx="100" cy="100" r="56" fill="none" stroke="'+accent+'" stroke-opacity=".55" stroke-width="1"/>'+(special||limited?'<circle cx="100" cy="100" r="75" stroke="'+light+'" stroke-opacity=".55" stroke-dasharray="2 6" fill="none"/>':'')+'<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'+(motif[b.motif]||motif.spark)()+'</g>'+(special||b.tier==='legendary'?star(100,21,6)+star(100,179,6):'')+'</svg>';
}
const rate=b=>b.count==null?'待核验':(b.count/C.denominator*100).toFixed(b.count<100?3:2)+'%';
const number=v=>Number.isFinite(Number(v))&&v!==null&&v!==''?String(Math.round(Number(v)*100)/100):'—';
const percent=v=>number(v)==='—'?'—':number(v)+'%';
const pp=v=>number(v)==='—'?'—':number(v)+' 个百分点';
const cap=(s)=>'<p class="st-ach-caption">'+esc(s)+'</p>';
const metrics=a=>'<div class="st-ach-metrics">'+a.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div>';
const svg=(s)=>'<svg class="st-ach-chart" viewBox="0 0 320 165" role="img" aria-label="解锁证据图">'+s+'</svg>';
function plot(series,position=true){
 const n=Math.max(2,...series.map(s=>s.values.length)),all=series.flatMap(s=>s.values).filter(v=>v!==null&&Number.isFinite(Number(v))).map(Number);if(!all.length)return '';
 const min=Math.max(0,Math.floor(Math.min(...all)/10)*10-5),max=Math.min(100,Math.ceil(Math.max(...all)/10)*10+5),lo=min,hi=Math.max(lo+1,max);
 const X=i=>38+i*264/(n-1),Y=v=>position?14+(v-lo)*115/(hi-lo):129-(v-lo)*115/(hi-lo);
 let s='';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,y=Y(v);s+='<path d="M38 '+y+'H302" stroke="currentColor" opacity=".1"/><text x="32" y="'+(y+3)+'" font-size="9" text-anchor="end" fill="currentColor" opacity=".65">'+number(v)+'%</text>'}
 for(const line of series){
 const pts=line.values.map((v,i)=>v===null||!Number.isFinite(Number(v))?null:[X(i),Y(Number(v))]);let d='',prev=false;for(const p of pts){if(!p){prev=false;continue}d+=(prev?'L':'M')+p.join(' ');prev=true}
 s+='<path d="'+d+'" stroke="'+line.color+'" stroke-width="2.7" '+(line.dash?'stroke-dasharray="5 4"':'')+' fill="none" stroke-linecap="round"/>'+pts.filter(Boolean).map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.7" fill="'+line.color+'"/>').join('');
 }
 s+='<text x="170" y="156" font-size="10" fill="currentColor" text-anchor="middle">'+(position?'位比（越靠前越好）':'得分率（越高越好）')+'</text>';
 return svg(s)+'<div class="st-ach-legend">'+series.map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.label)+'</span>').join('')+'</div>';
}
function evidence(b,e){
 if(!e)return cap('尚未获得 · 解锁后显示证据');
 if(e.kind==='forecast'||e.kind==='match'){
 const p=e.points||[];return plot([{label:'系统预测',values:p.map(x=>x.prediction),color:'#8197c4',dash:true},{label:'实际位比',values:p.map(x=>x.actual),color:'#29977f'}])+metrics([['累计超越',String(p.length)+' 次'],['平均超越',pp(p.reduce((s,x)=>s+Number(x.delta),0)/Math.max(1,p.length))]])+'<details><summary>查看关联考试日</summary>'+p.map(x=>'<div class="st-ach-evidence-line">'+esc(x.date)+' · 预测前 '+percent(x.prediction)+' / 实际前 '+percent(x.actual)+'</div>').join('')+'</details>';
 }
 if(e.kind==='interval'){
 const lo=Number(e.low),hi=Number(e.high),a=Number(e.actual),base=Math.max(0,Math.min(lo,a)-5),end=Math.min(100,Math.max(hi,a)+5),y=v=>15+105*(v-base)/Math.max(1,end-base);
 return svg('<rect x="46" y="'+y(lo)+'" width="228" height="'+Math.max(2,y(hi)-y(lo))+'" rx="5" fill="#879dd0" opacity=".23"/><path d="M46 '+y(lo)+'H274M46 '+y(hi)+'H274" stroke="#8197c4" stroke-dasharray="5 4"/><circle cx="160" cy="'+y(a)+'" r="6" fill="#b78a32"/><text x="172" y="'+Math.max(10,y(a)-7)+'" font-size="11" fill="currentColor">实际前 '+percent(a)+'</text><text x="160" y="149" text-anchor="middle" font-size="10" fill="currentColor">95% 预测区间：前 '+percent(lo)+' 至 '+percent(hi)+'</text>')+metrics([['超越最佳端点',pp(e.delta)],['实际位比','前 '+percent(e.actual)]]);
 }
 if(e.kind==='difficulty')return metrics([['历史参考难度',number(e.referenceDifficulty)],['本次估计难度',number(e.difficulty)],['近期平均位比','前 '+percent(e.baseline)],['本次实际位比','前 '+percent(e.actual)]])+cap('难度为个人历史模型估计，不是独立试卷难度认证。');
 if(e.kind==='radar'&&e.subjects?.length){
 const arr=e.subjects,n=arr.length,X=(i,r)=>160+Math.cos(i*2*Math.PI/n-Math.PI/2)*r,Y=(i,r)=>80+Math.sin(i*2*Math.PI/n-Math.PI/2)*r,polygon=(r)=>arr.map((_,i)=>X(i,r)+','+Y(i,r)).join(' ');
 return svg([.33,.66,1].map(f=>'<polygon points="'+polygon(58*f)+'" fill="none" stroke="currentColor" opacity=".13"/>').join('')+['before','after'].map((k,j)=>'<polygon points="'+arr.map((x,i)=>X(i,58*(1-x[k]/100))+','+Y(i,58*(1-x[k]/100))).join(' ')+'" fill="'+(j?'#29977f':'#8197c4')+'" fill-opacity=".14" stroke="'+(j?'#29977f':'#8197c4')+'" stroke-width="2"/>').join('')+arr.map((x,i)=>'<text x="'+X(i,71)+'" y="'+(Y(i,71)+3)+'" font-size="9" text-anchor="middle" fill="currentColor">'+esc(x.subject)+'</text>').join(''))+cap('蓝色：此前 · 绿色：此后 · 越外侧表示位比越靠前')+arr.map(x=>'<div class="st-ach-evidence-line">'+esc(x.subject)+' · 前 '+percent(x.before)+' → 前 '+percent(x.after)+'</div>').join('');
 }
 if(e.kind==='dual'){
 const ev=e.events||[e];return ev.map((x,i)=>'<div class="st-ach-evidence-line">'+esc(x.points?.at(-1)?.date||('事件 '+(i+1)))+' · '+esc(x.points?.at(-1)?.subject||'单科')+'<div>'+metrics([['得分率变化',pp(x.scoreChange)],['位比改善',pp(x.positionChange)]])+'</div></div>').join('');
 }
 if(e.kind==='rank'||e.kind==='score'||e.kind==='state'){
 const p=e.points||[],isScore=e.kind==='score';
 return plot([{label:isScore?'实际得分率':'实际位比',values:p.map(x=>isScore?x.rate:x.position),color:'#29977f'}],!isScore)+metrics([['关联考试',String(p.length)+' 场'],[e.kind==='state'?'变点概率':isScore?'此前纪录':'改善幅度',e.kind==='state'?percent(e.probability):isScore?percent(e.previousBest):pp(e.improvement??(p[0]?.position-p.at(-1)?.position))]])+cap(p.map(x=>x.date).join(' · '));
 }
 if(e.kind==='time')return '<div class="st-ach-time"><span>'+esc(e.dates?.[0])+'</span><i></i><span>'+esc(e.dates?.[1])+'</span></div>'+metrics([['有效日期',String(e.count)+' 天'],['跨度',String(e.span)+' 天'],['覆盖月份',String(e.months)+' 月']]);
 return '<div class="st-ach-simple"><span>✓</span><div>'+esc(e.label||e.subject||'条件已满足')+(e.date?'<small>'+esc(e.date)+'</small>':'')+(e.subjects?'<small>'+esc(e.subjects.join('、'))+'</small>':'')+'</div></div>';
}
function demoEvidence(b){
 const day=i=>'2026-10-'+String(i+1).padStart(2,'0'),points=(v,score=false)=>v.map((x,i)=>({date:day(i*4),subject:'数学',position:score?null:x,rate:score?x:null}));
 if(b.evidence==='forecast'||b.evidence==='match'){
 const n=({unexpected:1,'beyond-expectation':3,rewrite:5,undefined:10,'unique-path':3})[b.id]||3;
 return {kind:b.evidence,source:'demo',points:Array.from({length:n},(_,i)=>({date:day(i*2),prediction:36-i,actual:29-i,delta:7}))};
 }
 if(b.evidence==='interval')return {kind:'interval',source:'demo',low:20,high:46,actual:12,delta:8,date:day(4)};
 if(b.evidence==='difficulty')return {kind:'difficulty',source:'demo',difficulty:64,referenceDifficulty:49,actual:22,baseline:30};
 if(b.evidence==='radar'){let subjects=['语文','数学','英语','物理','化学','地理'];return {kind:'radar',source:'demo',subjects:subjects.map((s,i)=>({subject:s,before:b.id==='cocoon'||b.id==='puzzle'?(i===1?60:34+i):44+i,after:b.id==='cocoon'||b.id==='puzzle'?(i===1?23:33+i):31+i}))}}
 if(b.evidence==='dual'){const ev={points:[{date:day(3),subject:'数学'}],scoreChange:b.id==='double-proof'?6:-4,positionChange:8};return {kind:'dual',source:'demo',...(b.id==='beyond-score'?ev:{events:[0,1,2].map(i=>({...ev,points:[{date:day(i*5),subject:'数学'}]}))})}}
 if(b.evidence==='time'){const n=({'three-days':3,'five-days':5,'ten-days':10,'twenty-days':20,chronicle:40,'half-year':6,'year-trace':12,'four-seasons':12,rings:20,'time-witness':3,'long-road':4,'time-kept':6})[b.id]||6,yr=['year-trace','four-seasons','rings','chronicle'].includes(b.id),mo=yr?12:b.id==='half-year'?6:3;return {kind:'time',source:'demo',dates:[yr?'2025-10-01':b.id==='half-year'?'2026-05-01':'2026-08-01','2026-10-31'],count:n,span:yr?395:b.id==='half-year'?183:91,months:mo}}
 if(b.evidence==='score')return {kind:'score',source:'demo',points:points(b.id==='new-best'?[72,83]:[72,75,79,87,82],true),previousBest:79};
 if(b.evidence==='state')return {kind:'state',source:'demo',points:points([48,49,47,48,27,24]),probability:67,improvement:21};
 if(b.evidence==='rank'){
 const p=({'step-up':[49,40],'getting-better':[49,44,38],steady:[49,45,42,36],comeback:[35,34,55,30,31],plateau:[53,51,29,27],'another-height':[67,64,32,31],ascent:[72,69,71,27,25],accumulation:[60,57,59,35,34],'new-horizon':[65,64,30,29]})[b.id]||[50,40,30,22];return {kind:'rank',source:'demo',points:points(p)};
 }
 return {kind:b.evidence,source:'demo',date:'2026-10-21',label:b.condition};
}
let dialog,deck,controls,shown,returnFocus,mode='front',tour=null,timer=null,ack=null,ackSent=false;
const reduced=()=>g.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function stopTour(){clearTimeout(timer);timer=null;tour=null}
function ensureDialog(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.className='st-ach-dialog';dialog.setAttribute('aria-label','成就详情');
 dialog.innerHTML='<div class="st-ach-dialog-inner"><button type="button" class="st-ach-close" aria-label="关闭">×</button><div class="st-ach-batch"></div><div class="st-ach-perspective"><div class="st-ach-deck"></div></div><div class="st-ach-controls"></div></div>';
 document.body.append(dialog);deck=dialog.querySelector('.st-ach-deck');controls=dialog.querySelector('.st-ach-controls');
 dialog.querySelector('.st-ach-close').onclick=()=>dialog.close();
 dialog.addEventListener('cancel',()=>stopTour());dialog.addEventListener('close',()=>{stopTour();if(!ackSent&&ack){ackSent=true;ack()}ack=null;shown=null;returnFocus?.focus?.();returnFocus=null});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
}
function setFace(f){mode=f;deck.classList.toggle('st-ach-flipped',f==='back');const front=deck.querySelector('.st-ach-front'),back=deck.querySelector('.st-ach-back');front.inert=f!=='front';back.inert=f!=='back';front.setAttribute('aria-hidden',String(f!=='front'));back.setAttribute('aria-hidden',String(f!=='back'));const btn=controls.querySelector('[data-flip]');if(btn)btn.textContent=f==='front'?'翻面 · 查看成就见证':'翻回徽章正面'}
function renderCard(b,a,opt={}){
 shown=b;const earned=!!a,preview=!!opt.demo,locked=!earned&&b.hidden&&!opt.reveal,source=a?.evidence?.source;
 const label=preview?'模拟解锁':earned?'成就已解锁':'成就详情';
 dialog.dataset.tier=b.tier;dialog.querySelector('.st-ach-batch').textContent=opt.batch>1?'已解锁 '+opt.batch+' 项成就 · 优先展示代表徽章':opt.tour?'巡展 '+opt.tour:'';
 deck.className='st-ach-deck';
 deck.innerHTML='<section class="st-ach-face st-ach-front '+(opt.play?'st-ach-reveal':'')+'"><div class="st-ach-halo"></div><div class="st-ach-kicker">SCORE TRACKER · '+label+'</div><div class="st-ach-rarity">'+esc(C.tiers[b.tier])+(b.hidden&&(!locked)?' · 隐藏':'')+'</div><div class="st-ach-hero">'+emblem(b,locked)+'</div><h2>'+esc(locked?'尚未发现':b.name)+'</h2><p class="st-ach-quote">'+esc(locked?'等待属于你的发现。':b.quote)+'</p><div class="st-ach-rate">'+(locked?'—':esc(rate(b)))+'</div><small>'+ (locked?'解锁后揭晓':b.tier==='limited'?'历史参考 / 限定':'历史模拟获得率')+'</small><div class="st-ach-brand">SCORE TRACKER  /  ACHIEVEMENTS</div></section><section class="st-ach-face st-ach-back"><div class="st-ach-kicker">ACHIEVEMENT RECORD</div><h2>'+esc(locked?'尚未发现':b.name)+'</h2><h3>解锁条件</h3><p>'+esc(locked?'隐藏成就，解锁后揭晓。':b.condition)+'</p><h3>成就见证</h3>'+(locked?cap('尚未解锁'):evidence(b,a?.evidence))+(a?cap(preview?'示例数据 · 仅供交互预览':source==='historical_replay'?'历史滚动回放 · 非真实考前冻结预测':source==='demo'?'示例数据':source==='manual'?'经核验的纪念记录':'成就证据快照'):'')+(!earned&&!locked&&b.mode!=='auto'?cap('待快照接入或活动核验，不会自动发放。'):'')+'</section>';
 controls.innerHTML='<button type="button" data-flip>翻面 · 查看成就见证</button>'+(opt.demo?'<button type="button" data-replay>重播</button>':'')+(tour?'<button type="button" data-tour-stop>停止巡展</button>':'')+(opt.onGallery?'<button type="button" data-gallery>查看收藏馆</button>':'')+'<button type="button" data-dismiss>关闭</button>';
 controls.querySelector('[data-flip]').onclick=()=>{if(tour){stopTour();controls.querySelector('[data-tour-stop]')?.remove()}setFace(mode==='front'?'back':'front')};
 controls.querySelector('[data-dismiss]').onclick=()=>dialog.close();
 const replay=controls.querySelector('[data-replay]');if(replay)replay.onclick=()=>{stopTour();renderCard(b,a,{...opt,tour:null,play:true})};
 const stop=controls.querySelector('[data-tour-stop]');if(stop)stop.onclick=()=>{stopTour();stop.remove()};
 const gallery=controls.querySelector('[data-gallery]');if(gallery)gallery.onclick=()=>{dialog.close();opt.onGallery()};
 setFace('front');
}
function show(b,a,opt={}){
 ensureDialog();stopTour();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal()}ack=opt.ack||null;ackSent=false;renderCard(b,a,opt);
}
function autoplay(list){
 if(!list.length)return;ensureDialog();stopTour();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal()}ack=null;ackSent=false;tour={list,i:0};
 function next(){if(!tour||!dialog.open)return;const b=tour.list[tour.i];renderCard(b,{evidence:demoEvidence(b)},{demo:true,reveal:true,play:true,tour:(tour.i+1)+' / '+tour.list.length});
 timer=setTimeout(()=>{if(!tour||!dialog.open)return;setFace('back');timer=setTimeout(()=>{if(!tour||!dialog.open)return;tour.i++;if(tour.i>=tour.list.length){stopTour();controls.querySelector('[data-tour-stop]')?.remove();return}next()},reduced()?1800:2200)},reduced()?1200:1700)}
 next();
}
function gallery(root,awards=[],demo=false){
 const earned=new Map(awards.map(a=>[a.badge_id,a])),filter={tier:'all',query:'',only:false,reveal:demo};root.classList.add('st-ach-gallery');
 root.innerHTML='<div class="st-ach-gallery-head"><div><small>ACHIEVEMENTS / COLLECTION</small><h2>我的成就</h2><p>每一枚徽章，都有自己的故事。</p></div><span>'+ (demo?'52 枚设计预览':'已收藏 '+earned.size+' 枚')+'</span></div><div class="st-ach-filters"><select aria-label="稀有等级"><option value="all">全部等级</option>'+levels.map(t=>'<option value="'+t+'">'+C.tiers[t]+'</option>').join('')+'</select><input type="search" placeholder="查找成就" aria-label="查找成就">'+(demo?'<label><input type="checkbox" data-reveal checked> 展示隐藏设计</label><button type="button" data-random>随机模拟</button><button type="button" data-tour>全部巡展</button>':'<label><input type="checkbox" data-owned> 仅已获得</label>')+'</div><div class="st-ach-grid"></div><p class="st-ach-caption">历史比例为规则设计回测参考；徽章不代表学生能力高低。</p>';
 const grid=root.querySelector('.st-ach-grid');
 function filtered(){return C.badges.filter(b=>(filter.tier==='all'||b.tier===filter.tier)&&(!filter.only||earned.has(b.id))&&(!filter.query||((b.hidden&&!earned.has(b.id)&&!filter.reveal)?'尚未发现':b.name).includes(filter.query)))}
 function draw(){grid.innerHTML=filtered().map(b=>{const a=earned.get(b.id),locked=!a&&!filter.reveal,secret=locked&&b.hidden;return '<button type="button" class="st-ach-tile '+(locked?'st-ach-locked':'')+'" data-id="'+b.id+'" data-tier="'+b.tier+'"><span class="st-ach-tile-image">'+emblem(b,locked)+'</span><strong>'+esc(secret?'尚未发现':b.name)+'</strong><small>'+esc(secret?'隐藏成就':C.tiers[b.tier])+(demo?' · '+esc(rate(b)):a?' · 已获得':' · 未获得')+'</small></button>'}).join('')||'<p class="st-ach-caption">没有符合筛选条件的成就。</p>'}
 root.querySelector('select').onchange=e=>{filter.tier=e.target.value;draw()};root.querySelector('input[type=search]').oninput=e=>{filter.query=e.target.value.trim();draw()};
 if(demo){root.querySelector('[data-reveal]').onchange=e=>{filter.reveal=e.target.checked;draw()};root.querySelector('[data-random]').onclick=()=>{const list=filtered();if(list.length){const b=list[Math.floor(Math.random()*list.length)];show(b,{evidence:demoEvidence(b)},{demo:true,reveal:true,play:true})}};root.querySelector('[data-tour]').onclick=()=>autoplay(filtered())}
 else root.querySelector('[data-owned]').onchange=e=>{filter.only=e.target.checked;draw()};
 grid.onclick=e=>{const tile=e.target.closest('[data-id]');if(!tile)return;const b=B.get(tile.dataset.id);if(demo)show(b,{evidence:demoEvidence(b)},{demo:true,reveal:true,play:true});else show(b,earned.get(b.id))};
 draw();
}
function close(){if(dialog?.open)dialog.close();stopTour()}
function openGallery(awards){ensureDialog();stopTour();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal()}ack=null;ackSent=false;dialog.dataset.tier='common';dialog.querySelector('.st-ach-batch').textContent='';deck.className='st-ach-deck st-ach-deck-gallery';deck.innerHTML='';const r=document.createElement('section');deck.append(r);gallery(r,awards);controls.innerHTML='<button type="button" data-dismiss>关闭收藏馆</button>';controls.querySelector('[data-dismiss]').onclick=()=>dialog.close()}
g.ScoreAchievementUI={emblem,gallery,show,autoplay,openGallery,close,rate,demoEvidence};
})(window);
