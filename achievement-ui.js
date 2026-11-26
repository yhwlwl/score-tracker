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
// Art direction v2: tiny enamel illustrations, distinct silhouettes, not line icons.
const F=(d,fill='@gold',extra='')=>L(d,'fill="'+fill+'" stroke="none" '+extra);
const S=(d,c='@light',w=4,extra='')=>L(d,'fill="none" stroke="'+c+'" stroke-width="'+w+'" '+extra);
const D=(x,y,r,c='@gold',extra='')=>circle(x,y,r,'fill="'+c+'" stroke="none" '+extra);
const rect=(x,y,w,h,fill='@gold',r=4)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'" stroke="none"/>';
const spark=(x,y,r=8)=>star(x,y,r);
const mountain=(x=0,y=0,k=1)=>'<g transform="translate('+x+' '+y+') scale('+k+')">'+F('M32 145L75 75L96 106L128 47L169 145Z','@shade')+F('M75 75L32 145H102Z','@color')+F('M128 47L94 145H169Z','@gold')+F('M128 47L111 94L128 83L145 94Z','@light')+F('M128 47L169 145H145L128 83Z','@shade')+F('M75 75L58 101L75 94L89 100Z','@light')+'</g>';
const book=(label='')=>F('M47 65Q75 57 100 73Q125 57 153 65V141Q125 134 100 151Q75 134 47 141Z','@gold')+F('M100 73Q75 59 50 69V137Q77 130 100 145Z','@light')+F('M100 73Q126 60 150 69V137Q124 130 100 145Z','@color')+S('M100 75V145','@dark',2)+(label?'<text x="100" y="118" font-size="'+(label.length>2?23:35)+'" text-anchor="middle" fill="@dark" stroke="none" font-weight="900">'+esc(label)+'</text>':S('M59 85Q78 82 91 89M59 98Q78 95 91 102M109 89Q124 82 140 85M109 102Q124 95 140 98','@dark',3));
const chart=(d,reference='',dots=[])=>F('M48 56H152V145H48Z','@panel')+S('M48 56V145H152','@muted',2)+S('M48 100H152M82 56V145M117 56V145','@muted',1,'opacity=".3"')+(reference?S(reference,'@muted',4,'stroke-dasharray="5 7"'): '')+S(d,'@dark',8)+S(d,'@gold',5)+dots.map(([x,y])=>D(x,y,5,'@light')).join('');
const wing=(flip=false)=>'<g '+(flip?'transform="translate(200 0) scale(-1 1)"':'')+'>'+F('M96 103Q80 43 39 51Q32 87 60 105Q42 120 54 144Q82 148 98 121Z','@gold')+F('M96 104Q74 62 45 58Q45 89 70 104Z','@color')+F('M93 116Q70 104 58 128Q76 146 93 116Z','@light')+S('M92 108L59 69M91 114L63 131','@dark',2.5)+'</g>';
const ribbon=(d,ref='')=>(ref?S(ref,'@muted',5,'stroke-dasharray="5 7"'): '')+S(d,'@dark',13)+S(d,'@gold',9)+S(d,'@light',2,'opacity=".8"');
const leaf=(d)=>F(d,'@color')+S('M100 131L100 78','@light',3);
const medallion=(n)=>D(100,100,42,'@shade')+D(100,100,36,'@gold')+D(100,100,30,'@dark')+text(100,116,n,n.length>2?29:43);
const trophy=()=>F('M70 53H130V83Q130 109 110 118V135H133V148H67V135H90V118Q70 109 70 83Z')+S('M70 66H51V82Q51 102 76 104M130 66H149V82Q149 102 124 104','@color',6)+F('M78 59H98V104Q79 96 78 79Z','@light')+spark(100,83,12);
const motif={
 seed:()=>F('M45 138Q100 118 155 138L148 151H52Z','@shade')+S('M100 137Q98 99 104 66','@light',5)+F('M103 105Q49 108 46 64Q87 61 103 105Z','@color')+F('M104 91Q110 46 153 54Q154 88 104 91Z')+S('M101 105L57 75M107 88L140 62','@light',2),
 grid:()=>F('M55 64L128 52L145 132L72 146Z','@shade')+F('M59 55H137V143H59Z','@light')+rect(69,66,58,15,'@color',3)+[0,1,2].map(i=>[0,1].map(j=>rect(70+j*31,92+i*14,24,9,i===2?'@shade':'@color',2)).join('')).join(''),
 lens:()=>F('M48 128H67V145H48ZM76 105H95V145H76ZM104 83H123V145H104Z','@shade')+D(109,82,34,'@gold')+D(109,82,28,'@dark')+S('M95 92L106 80L116 84L125 68','@light',4)+S('M132 107L154 132','@gold',9),
 spark:()=>trophy()+spark(146,55,10),
 trail:()=>F('M45 146Q56 114 82 122T109 87T151 48L160 59Q129 81 133 100T96 138T68 154Z','@shade')+S('M56 146Q69 118 85 129T119 91T150 52','@light',3,'stroke-dasharray="4 7"')+D(56,146,5,'@gold')+spark(150,52,12),
 quill:()=>book()+F('M100 120Q91 80 147 46Q158 75 130 99L103 120Z','@color')+S('M88 139L143 55','@dark',3)+S('M89 138L143 55','@light',1.5),
 compass:()=>D(100,100,47,'@gold')+D(100,100,40,'@dark')+S('M100 62V70M100 130V138M62 100H70M130 100H138','@muted',3)+F('M127 65L111 111L73 135L89 89Z','@light')+F('M127 65L100 100L111 111Z','@color')+F('M73 135L100 100L89 89Z','@shade')+D(100,100,4,'@dark'),
 arrow:()=>F('M48 141H77V118H103V94H131V70H151V146H48Z','@shade')+F('M43 123L77 89L96 102L136 60L125 49H155V79L145 70L96 119L77 106L54 134Z','@gold'),
 steps:()=>'<g transform="rotate(-24 100 100)">'+D(78,82,22,'@shade')+F('M66 78Q60 64 73 58Q87 54 90 77L85 95Q72 102 66 78Z','@gold')+D(67,53,4,'@light')+D(79,48,5,'@light')+D(90,55,4,'@light')+F('M106 120Q100 106 113 100Q127 96 130 119L125 137Q112 144 106 120Z','@gold')+D(107,95,4,'@light')+D(119,90,5,'@light')+D(130,97,4,'@light')+'</g>',
 calendar:()=>rect(54,64,92,84,'@gold',10)+rect(60,86,80,56,'@light',5)+rect(54,64,92,22,'@color',7)+S('M76 54V76M124 54V76','@light',7)+[0,1,2].map(i=>[0,1,2,3].map(j=>rect(67+j*18,94+i*14,12,8,i===2&&j===3?'@color':'@shade',2)).join('')).join(''),
 half:()=>D(100,100,45,'@shade')+F('M100 55A45 45 0 0 1 100 145Z','@gold')+F('M100 55A45 45 0 0 0 100 145Z','@color')+S('M100 60V140','@light',2)+F('M72 119Q53 101 76 81Q98 99 72 119Z','@light')+spark(125,97,18),
 stairs:()=>F('M49 145V119H80V93H111V67H150V145Z','@shade')+F('M49 119L59 110H80V119ZM80 93L90 84H111V93ZM111 67L121 58H150V67Z','@light')+F('M49 119H80V145H49ZM80 93H111V145H80ZM111 67H150V145H111Z','@gold')+spark(141,48,8),
 dual:()=>F('M47 67H88V137H47Z','@light')+S('M56 83H79M56 94H79M56 105H73','@dark',3)+F('M65 111L78 123L91 111H84V102H72V111Z','@shade')+F('M105 139V112H118V91H131V69H147V139Z','@color')+F('M102 86L129 58L153 58V82L143 72L112 102Z','@gold'),
 wave:()=>F('M45 141Q68 127 78 130T110 106T155 60V151H45Z','@shade')+ribbon('M45 132Q66 110 80 120T112 95T153 55')+spark(153,55,7),
 merge:()=>F('M48 61H82V101H48Z','@color')+F('M48 108H82V148H48Z','@gold')+S('M57 83L64 90L76 74M57 130L64 137L76 121','@dark',4)+ribbon('M83 82L111 102L148 60','M83 129L111 102')+S('M135 60H148V73','@light',4),
 peak:()=>mountain()+F('M126 81V43L153 49L146 63L126 59Z','@color')+S('M126 45V83','@light',3)+spark(149,44,7),
 ten:()=>book('10')+spark(145,56,8),
 'forecast-one':()=>chart('M49 137L83 111L116 98L150 61','M49 137L83 111L116 116L150 103',[[150,61]])+spark(150,61,11),
 road:()=>F('M44 139L65 89L84 119L110 71L154 139Z','@shade')+D(138,60,17,'@gold')+F('M46 151Q95 120 86 107Q77 95 122 77Q87 99 102 107Q118 122 86 151Z','@light')+S('M65 149Q104 123 95 108T119 78','@color',2,'stroke-dasharray="5 5"'),
 comeback:()=>F('M51 64L76 96L90 79L77 126L60 104Z','@shade')+F('M71 129L100 91L117 102L145 56L130 51L156 45L161 71L150 66L119 120L103 108L84 145Z','@gold')+F('M80 134Q48 115 41 88Q74 104 88 112Z','@color')+spark(153,46,8),
 'stars-three':()=>S('M52 128L100 58L148 128Z','@muted',2)+D(100,100,21,'@shade')+spark(52,128,21)+spark(100,58,25)+spark(148,128,21)+spark(100,100,8),
 shield:()=>F('M100 44L146 62V100Q144 134 100 155Q56 134 54 100V62Z')+F('M100 54L135 69V101Q133 128 100 143Q67 128 65 101V69Z','@color')+F('M70 120L93 85L106 99L125 75L134 115L100 143Z','@shade')+S('M79 106L94 119L123 87','@light',5),
 crystal:()=>F('M49 136L82 121L149 121L151 143H50Z','@shade')+F('M58 113L85 100L143 100L149 121L82 121L49 136Z','@color')+F('M71 91L100 77L136 77L143 100H85L58 113Z','@gold')+F('M100 77L100 47L132 67L136 77Z','@light')+spark(114,49,12),
 hourglass:()=>rect(65,51,70,11,'@gold',3)+rect(65,138,70,11,'@gold',3)+F('M73 62H127Q127 86 104 100Q127 114 127 138H73Q73 114 96 100Q73 86 73 62Z','@light','opacity=".75"')+F('M80 76H120Q117 91 100 98Q83 91 80 76ZM80 135Q84 117 100 109Q116 117 120 135Z','@color')+S('M100 100V113','@color',3),
 seasons:()=>D(100,100,48,'@shade')+F('M100 100V52A48 48 0 0 1 148 100Z','#eabf6a')+F('M100 100H148A48 48 0 0 1 100 148Z','#bf7e61')+F('M100 100V148A48 48 0 0 1 52 100Z','#90c6e0')+F('M100 100H52A48 48 0 0 1 100 52Z','#8bc6a5')+S('M69 88Q64 64 88 66Q90 86 69 88Z','@dark',2)+spark(124,77,13)+F('M111 114Q143 109 132 136Q118 135 111 114Z','@dark')+S('M76 113V136M66 119L86 130M66 130L86 119','@dark',2),
 'break-ring':()=>F('M44 68H81V92H44ZM44 98H67V122H44ZM44 128H82V146H44ZM89 68H153V92H106L97 83ZM76 98H99L89 112L107 122H76ZM91 128H153V146H91Z','@shade')+F('M58 135L90 103L105 109L140 65L126 61L158 52L157 82L147 76L109 125L94 119L71 147Z','@gold')+spark(152,53,10),
 butterfly:()=>wing()+wing(true)+F('M97 82H103L106 133L100 145L94 133Z','@light')+S('M98 83L89 71M102 83L111 71','@light',3)+F('M44 135L57 146L49 153ZM146 136L153 148L140 153Z','@shade'),
 puzzle:()=>F('M51 53H96V65Q76 64 76 79Q76 93 96 92V99H82Q83 118 68 118Q53 118 54 99H51Z','@color')+F('M102 53H147V99H132Q133 80 117 80Q102 80 102 99H101V91Q82 92 82 79Q82 66 102 67Z','@light')+F('M51 105H60Q59 124 74 124Q89 124 88 105H96V119Q77 118 77 134Q77 148 96 147V151H51Z','@shade')+F('M102 106H107Q108 86 121 86Q134 86 133 106H147V151H102V141Q83 142 83 134Q83 125 102 125Z','@gold')+spark(139,49,8),
 sail:()=>F('M100 49L145 112H100Z','@light')+F('M93 66L93 112H58Z','@color')+S('M97 47V126','@gold',4)+F('M47 121H153L132 145H68Z','@gold')+F('M38 145Q61 132 83 145T127 145T165 145V154H38Z','@color'),
 'stars-five':()=>D(100,100,47,'@panel')+S('M58 105Q86 43 142 79Q171 104 132 134Q84 158 58 105Z','@muted',2)+[[100,53],[146,87],[128,142],[72,142],[54,87]].map(([x,y])=>spark(x,y,15)).join('')+spark(100,100,24),
 prism:()=>F('M47 63H103V138H47Z','@light')+S('M57 76H93M57 89H91M57 102H79','@shade',4)+F('M108 130L122 105L134 114L151 77L143 75L157 63L164 84L155 82L137 133L124 125L117 142Z','@gold')+F('M67 119L86 119V127H67Z','@color'),
 sun:()=>D(100,100,46,'@shade')+Array.from({length:12},(_,i)=>F('M97 45L103 45L106 58H94Z','@gold','transform="rotate('+(i*30)+' 100 100)"')).join('')+D(100,100,33,'@gold')+D(100,100,27,'@dark')+S('M100 76V101L119 111','@light',4)+D(100,100,4,'@light'),
 'forecast-three':()=>chart('M48 140L79 108L113 79L150 48','M48 140L79 128L113 118L150 103',[[79,108],[113,79],[150,48]])+spark(79,108,10)+spark(113,79,10)+spark(150,48,13),
 range:()=>F('M47 89H153V133H47Z','@shade')+S('M47 89H153M47 133H153','@muted',3,'stroke-dasharray="5 5"')+F('M91 129H109V74H123L100 46L77 74H91Z','@gold')+spark(100,46,10),
 'book-twenty':()=>book('20')+spark(143,57,9),
 branch:()=>ribbon('M50 145L85 117L104 122L146 53','M50 145L85 117L104 122L151 110M104 122L146 145')+F('M129 49L153 48L151 73Z','@gold')+D(104,122,6,'@light'),
 rings:()=>F('M100 48Q142 44 151 86Q163 117 136 143Q100 162 68 141Q43 122 49 88Q56 51 100 48Z','@gold')+[14,25,36,44].map((r,i)=>'<ellipse cx="'+(96+i)+'" cy="'+(101-i)+'" rx="'+r+'" ry="'+(r*.91)+'" fill="none" stroke="@dark" stroke-width="2.5" opacity=".72"/>').join('')+F('M100 100L153 75L150 92Z','@shade'),
 summit:()=>F('M40 130Q62 112 83 128Q106 104 126 124Q145 108 160 130V147H40Z','@shade')+F('M65 130L107 55L144 130Z','@gold')+F('M107 55L88 89L107 82L125 89Z','@light')+F('M107 55L144 130H123L107 82Z','@color')+spark(107,44,12),
 mountain:()=>mountain()+F('M117 48L129 30L141 48L129 44Z','@light')+spark(129,36,9),
 shatter:()=>F('M49 60H136V142H49Z','@shade')+S('M49 60H136V82M136 121V142H49Z','@muted',3)+F('M51 132L84 100L104 110L145 53L131 49L161 41L159 72L150 66L109 128L85 116L63 145Z','@gold')+F('M139 91L157 86L154 103ZM123 54L113 39L132 41ZM139 117L158 121L146 132Z','@light'),
 diamond:()=>F('M45 79L70 55H130L155 79L100 149Z','@gold')+F('M45 79H155L100 149Z','@color')+F('M70 55L82 79L100 55L118 79L130 55Z','@light')+F('M82 79L100 149L118 79Z','@light')+S('M45 79H155M82 79L100 149L118 79','@dark',2)+spark(100,43,11),
 phase:()=>F('M44 111H84V147H44Z','@shade')+F('M112 57H154V94H112Z','@color')+S('M44 127H84M112 75H154','@muted',2,'stroke-dasharray="4 5"')+ribbon('M48 132L65 124L82 131L110 77L127 70L151 63')+D(110,77,6,'@light')+spark(151,63,9),
 horizon:()=>D(119,78,31,'@gold')+F('M43 120Q100 69 157 120V149H43Z','@color')+F('M43 134Q100 96 157 134V150H43Z','@shade')+F('M74 151Q123 112 110 101Q101 90 124 79Q105 98 125 104Q143 118 110 151Z','@light')+spark(141,52,8),
 infinity:()=>S('M47 100C47 64 77 63 100 100C123 137 153 136 153 100C153 64 123 63 100 100C77 137 47 136 47 100Z','@shade',20)+S('M47 100C47 64 77 63 100 100C123 137 153 136 153 100C153 64 123 63 100 100C77 137 47 136 47 100Z','@gold',13)+S('M47 100C47 64 77 63 100 100C123 137 153 136 153 100C153 64 123 63 100 100C77 137 47 136 47 100Z','@light',2.5)+spark(151,51,10),
 scroll:()=>book()+F('M50 68Q75 62 100 76Q126 62 150 68V137Q126 132 100 146Q74 132 50 137Z','@dark')+S('M60 123Q104 51 143 107','@color',5)+spark(73,105,10)+spark(101,86,13)+spark(132,98,8)+S('M100 77V145','@gold',2),
 flag:()=>F('M54 144L82 97L103 117L125 79L148 144Z','@shade')+S('M93 125V49','@light',5)+F('M95 52Q121 43 148 62L134 87Q116 70 95 79Z','@gold')+spark(148,54,6),
 triple:()=>F('M48 145H77V120H106V95H135V68H153V151H48Z','@shade')+F('M48 145H77V120H106V95H135V68H153V82H149V109H120V134H91V159H48Z','@gold')+S('M51 139H76V114H105V89H134V62H151M139 50L152 62L139 74','@light',4)+text(65,154,'1M',15)+text(93,129,'10K',13)+text(123,103,'100',12),
 idea:()=>F('M100 46Q137 46 140 80Q140 100 120 116L117 132H83L80 116Q60 100 60 80Q63 46 100 46Z','@gold')+F('M75 73Q84 54 105 55Q79 68 79 92Z','@light')+rect(83,136,34,9,'@color',3)+rect(90,148,20,6,'@shade',3)+spark(103,84,16),
 tools:()=>F('M48 60L72 73L86 62L95 88L86 103L142 146L132 157L75 114Q46 113 43 86Z','@gold')+F('M130 48L151 69L91 129L80 118Z','@color')+F('M119 48L130 37L162 69L151 80Z','@light')+spark(145,130,8),
 rocket:()=>F('M100 43Q134 69 130 116L114 135H86L70 116Q66 69 100 43Z','@gold')+F('M100 43Q134 69 130 116L114 135H100Z','@color')+D(100,89,15,'@dark')+D(100,89,10,'@light')+F('M70 101L48 139L85 127ZM130 101L152 139L115 127Z','@shade')+F('M86 141L100 166L114 141Z','#efb677')+F('M94 141L100 156L106 141Z','@light'),
 flame:()=>F('M103 45Q142 78 147 113Q151 150 100 158Q53 154 53 120Q53 95 77 75Q72 100 94 111Q117 80 103 45Z','#eb9e55')+F('M102 91Q128 119 125 137Q123 154 100 155Q79 151 80 134Q81 121 102 91Z','#ffe9ad')+spark(100,136,8),
 year:()=>book('2026')+spark(144,57,11)
};
const frames={
 round:'M100 12a88 88 0 1 1 0 176a88 88 0 1 1 0-176',
 shield:'M100 8Q151 8 178 36V98Q178 158 100 193Q22 158 22 98V36Q49 8 100 8Z',
 oct:'M67 9H133L179 55V145L133 191H67L21 145V55Z',
 hex:'M100 8L179 53V147L100 192L21 147V53Z',
 crest:'M100 6L123 25L158 22L174 57L187 75V128L158 166L124 174L100 194L76 174L42 166L13 128V75L26 57L42 22L77 25Z',
 petal:'M100 8Q124 29 153 25Q153 48 180 69Q165 94 180 127Q153 145 153 171Q125 171 100 192Q75 171 47 171Q47 145 20 127Q35 94 20 69Q47 48 47 25Q76 29 100 8Z',
 diamond:'M100 5L184 63V137L100 195L16 137V63Z',
 winged:'M100 8L127 29L158 24L190 49L175 83L189 109L158 130L150 163L100 192L50 163L42 130L11 109L25 83L10 49L42 24L73 29Z',
 star:'M100 3L125 29L160 20L163 57L194 80L174 108L190 141L155 154L145 187L112 177L100 197L88 177L55 187L45 154L10 141L26 108L6 80L37 57L40 20L75 29Z'
};
const artFrames={common:['round'],rare:['hex','shield','oct'],epic:['shield','oct','hex'],legendary:['crest','petal','winged','diamond'],mythic:['star','diamond','winged','crest'],limited:['round','shield','oct','petal','crest']};
const artFrame={seed:'round',grid:'round',lens:'round',spark:'round',trail:'round',quill:'round',compass:'hex',arrow:'shield',steps:'hex',calendar:'oct',half:'oct',stairs:'shield',dual:'oct',wave:'hex',merge:'oct',peak:'shield',ten:'oct','forecast-one':'hex',road:'shield',comeback:'hex','stars-three':'oct',shield:'shield',crystal:'hex',hourglass:'oct',seasons:'oct','break-ring':'crest',butterfly:'petal',puzzle:'diamond',sail:'winged','stars-five':'petal',prism:'diamond',sun:'crest','forecast-three':'crest',range:'diamond','book-twenty':'crest',branch:'winged',rings:'petal',summit:'crest',mountain:'crest',shatter:'winged',diamond:'diamond',phase:'star',horizon:'crest',infinity:'winged',scroll:'star',flag:'round',triple:'crest',idea:'petal',tools:'shield',rocket:'diamond',flame:'petal',year:'oct'};
const accents={seed:'#9bbda9',grid:'#9ab4c9',quill:'#b8c4e0',half:'#90c8bc',steps:'#95bbd9',seasons:'#e4c18c',road:'#87b4b9',hourglass:'#e2b5a1',butterfly:'#e5a6a5',puzzle:'#b9b4e8',sail:'#80c4d7','stars-five':'#efc777',sun:'#f3b65c',rings:'#d5a778',scroll:'#bcb3f5',horizon:'#b0c9ec',phase:'#89d9df',infinity:'#d7b2ef',shatter:'#a9bce9',diamond:'#b0e0f4',flag:'#98c8bd',triple:'#e5c178',idea:'#d2d49a',tools:'#96bdd8',rocket:'#92d3cb',flame:'#eda76e',year:'#b3c7ef'};
let svgId=0;
function emblem(b,locked=false){
 const id='stbadge'+(++svgId),[light,accent,dark]=colors[b.tier],special=b.tier==='mythic',limited=b.tier==='limited',shape=frames[artFrame[b.motif]]||frames[artFrames[b.tier][0]];
 if(locked)return '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="'+shape+'" fill="none" stroke="currentColor" opacity=".26" stroke-width="2"/><path d="M77 98V86a23 23 0 0 1 46 0v12M69 98h62v44H69z" fill="none" stroke="currentColor" stroke-width="6" opacity=".35"/></svg>';
 const color=accents[b.motif]||accent, rim=special?'<stop stop-color="#bbf0ff"/><stop offset=".24" stop-color="#c3adf7"/><stop offset=".49" stop-color="#ffe0ee"/><stop offset=".72" stop-color="#f8d8a0"/><stop offset="1" stop-color="#8878bf"/>':'<stop stop-color="'+light+'"/><stop offset=".25" stop-color="'+accent+'"/><stop offset=".52" stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/>';
 const defs='<defs><linearGradient id="'+id+'r" x1="0" y1="0" x2="1" y2="1">'+rim+'</linearGradient><radialGradient id="'+id+'c" cx=".37" cy=".28"><stop stop-color="'+dark+'"/><stop offset="1" stop-color="#172035"/></radialGradient><linearGradient id="'+id+'g" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="'+light+'"/><stop offset=".55" stop-color="'+light+'"/><stop offset="1" stop-color="'+accent+'"/></linearGradient><clipPath id="'+id+'p"><path d="'+shape+'" transform="translate(100 100) scale(.86) translate(-100 -100)"/></clipPath></defs>';
 const art=(motif[b.motif]||motif.spark)().replace(/@(gold|light|color|shade|dark|muted|panel)/g,(_,k)=>({gold:'url(#'+id+'g)',light,color,shade:accent,dark:'#172035',muted:light,panel:'#17203566'})[k]);
 const ticks=Array.from({length:special?12:8},(_,i)=>'<path d="M100 23V28" transform="rotate('+(i*(special?30:45))+' 100 100)" stroke="'+light+'" stroke-width="1.5" opacity=".36"/>').join('');
 const backdrop=special?'<g opacity=".27" fill="'+light+'">'+[[38,63],[155,46],[161,114],[44,142],[84,38],[122,166],[64,165]].map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(i%2?1.5:2.4)+'"/>').join('')+'</g>':'';
 const engraving=(special||limited||b.tier==='legendary')?'<path d="M41 109Q50 156 93 169M159 109Q150 156 107 169" stroke="'+light+'" stroke-width="1.3" stroke-opacity=".32" fill="none"/>'+ticks:'';
 return '<svg viewBox="0 0 200 200" aria-hidden="true" class="st-ach-emblem" style="color:'+light+'">'+defs+'<path d="'+shape+'" fill="'+dark+'" transform="translate(0 2)"/><path d="'+shape+'" fill="url(#'+id+'r)"/><path d="'+shape+'" fill="url(#'+id+'c)" transform="translate(100 100) scale(.91) translate(-100 -100)" stroke="'+light+'" stroke-width=".8"/><path d="'+shape+'" transform="translate(100 100) scale(.83) translate(-100 -100)" fill="none" stroke="'+light+'" stroke-opacity=".24" stroke-width="1"/><g clip-path="url(#'+id+'p)">'+backdrop+engraving+'<g stroke-linecap="round" stroke-linejoin="round" fill="none">'+art+'</g></g>'+(special||b.tier==='legendary'?'<path d="M100 14L104 21L100 28L96 21Z" fill="'+light+'"/>':'')+'</svg>';
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
 const gallery=controls.querySelector('[data-gallery]');if(gallery)gallery.onclick=()=>{stopTour();if(!ackSent&&ack){ackSent=true;ack()}ack=null;opt.onGallery()};
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
 grid.onclick=e=>{const tile=e.target.closest('[data-id]');if(!tile)return;const b=B.get(tile.dataset.id);if(demo)show(b,{evidence:demoEvidence(b)},{demo:true,reveal:true,play:true});else show(b,earned.get(b.id),{onGallery:()=>openGallery(awards)})};
 draw();
}
function close(){if(dialog?.open)dialog.close();stopTour()}
function openGallery(awards){ensureDialog();stopTour();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal()}ack=null;ackSent=false;dialog.dataset.tier='common';dialog.querySelector('.st-ach-batch').textContent='';deck.className='st-ach-deck st-ach-deck-gallery';deck.innerHTML='';const r=document.createElement('section');deck.append(r);gallery(r,awards);controls.innerHTML='<button type="button" data-dismiss>关闭收藏馆</button>';controls.querySelector('[data-dismiss]').onclick=()=>dialog.close()}
g.ScoreAchievementUI={emblem,gallery,show,autoplay,openGallery,close,rate,demoEvidence};
})(window);
