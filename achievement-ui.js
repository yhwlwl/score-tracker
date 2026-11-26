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
 half:()=>F('M45 143Q70 132 100 137Q130 132 155 143L146 153H54Z','#7797ac')+F('M94 140L96 100L77 75L83 69L99 90L102 61L109 62L108 94L130 76L136 83L110 109L114 140Z','#bd987d')+F('M57 93Q39 75 51 60Q54 43 74 47Q88 34 100 50V94Q82 104 57 93Z','#8abfa3')+F('M100 50Q117 37 131 48Q152 44 157 65Q171 82 149 96Q124 105 100 94Z','#dba16e')+F('M56 67Q68 50 83 57L92 72Q71 61 56 67Z','#d3e7b7')+F('M112 58Q126 47 141 59L150 74Q128 64 112 58Z','#f6cc87')+S('M100 51V94','#e7d5aa',2,'opacity=".55"')+F('M136 109Q151 100 151 117Q141 125 136 109Z','#ecc281')+F('M65 117Q52 105 49 119Q60 128 65 117Z','#b8d9b6'),
 stairs:()=>F('M49 145V119H80V93H111V67H150V145Z','@shade')+F('M49 119L59 110H80V119ZM80 93L90 84H111V93ZM111 67L121 58H150V67Z','@light')+F('M49 119H80V145H49ZM80 93H111V145H80ZM111 67H150V145H111Z','@gold')+spark(141,48,8),
 dual:()=>F('M47 67H88V137H47Z','@light')+S('M56 83H79M56 94H79M56 105H73','@dark',3)+F('M65 111L78 123L91 111H84V102H72V111Z','@shade')+F('M105 139V112H118V91H131V69H147V139Z','@color')+F('M102 86L129 58L153 58V82L143 72L112 102Z','@gold'),
 wave:()=>F('M45 141Q68 127 78 130T110 106T155 60V151H45Z','@shade')+ribbon('M45 132Q66 110 80 120T112 95T153 55')+spark(153,55,7),
 merge:()=>F('M48 61H82V101H48Z','@color')+F('M48 108H82V148H48Z','@gold')+S('M57 83L64 90L76 74M57 130L64 137L76 121','@dark',4)+ribbon('M83 82L111 102L148 60','M83 129L111 102')+S('M135 60H148V73','@light',4),
 peak:()=>F('M43 142L55 131H82L94 142V151H43Z','#a998bc')+F('M43 142H82V151H43Z','#d4c4e0')+F('M70 124L82 113H110L122 124V142H70Z','#b8a5d5')+F('M70 124H110V142H70Z','#e0cdea')+F('M98 106L110 95H141L153 106V124H98Z','#ae99ce')+F('M98 106H141V124H98Z','#eddfba')+F('M123 88L135 77H156L164 88V106H123Z','#b09bc9')+F('M123 88H156V106H123Z','#f3d6a4')+S('M140 78V42','#fae7bb',4.5)+F('M142 43Q153 37 165 45L159 55Q151 49 142 54Z','#ebbd75')+S('M46 140H80M73 122H108M101 104H139M126 86H154','#f2e5ef',2)+spark(112,56,9),
 ten:()=>book('10')+spark(145,56,8),
 'forecast-one':()=>chart('M49 137L83 111L116 98L150 61','M49 137L83 111L116 116L150 103',[[150,61]])+spark(150,61,11),
 road:()=>F('M44 139L65 89L84 119L110 71L154 139Z','@shade')+D(138,60,17,'@gold')+F('M46 151Q95 120 86 107Q77 95 122 77Q87 99 102 107Q118 122 86 151Z','@light')+S('M65 149Q104 123 95 108T119 78','@color',2,'stroke-dasharray="5 5"'),
 comeback:()=>F('M40 60Q55 85 80 93L99 112Q57 111 45 88Z','#d99479')+F('M160 60Q145 85 120 93L101 112Q143 111 155 88Z','#d99479')+F('M40 60Q61 78 83 84L100 105Q78 97 64 100Q47 87 40 60Z','#f1be91')+F('M160 60Q139 78 117 84L100 105Q122 97 136 100Q153 87 160 60Z','#f1be91')+F('M100 75Q104 58 119 55L128 62L115 65Q112 77 106 91L112 116L100 131L88 116L94 92Z','#f6dfb1')+F('M103 60L109 46L118 55Z','#e9b488')+D(116,60,2.6,'#4a3a59')+F('M89 114Q77 137 63 144Q83 147 100 132Q117 147 137 144Q123 137 111 114L105 132L100 153L95 132Z','#e8a57e')+S('M48 145Q71 159 100 154Q129 159 152 145','#bda2dc',4)+spark(100,45,7),
 'stars-three':()=>S('M52 128L100 58L148 128Z','@muted',2)+D(100,100,21,'@shade')+spark(52,128,21)+spark(100,58,25)+spark(148,128,21)+spark(100,100,8),
 shield:()=>F('M35 146L70 93L88 113L126 49L166 146Z','#696b9c')+F('M126 49L107 85L126 77L145 86Z','#e5e9fa')+F('M126 77L166 146H144L126 103L112 117Z','#9995c6')+F('M35 146L70 93L88 113L104 146Z','#b6b4da')+F('M44 146Q94 129 88 115Q79 103 109 90Q121 83 126 68Q129 83 117 95Q92 108 104 120Q114 134 74 148Z','#f5dbac')+S('M50 74L73 64M44 86L58 80M89 55L104 49','#dce8f8',3)+D(56,58,2.8,'#e5e9fa')+D(151,61,2.8,'#e5e9fa')+spark(125,43,8),
 crystal:()=>F('M42 140L62 127L136 127L159 140L151 153H49Z','#777397')+F('M50 123L75 109L138 109L151 122L133 134H63Z','#b29bcd')+F('M62 108L80 95L132 95L141 108L125 120H73Z','#d6bcad')+S('M50 140L81 145L115 142L151 145M60 122L87 125L132 123','#453858',2.6)+F('M101 44L128 72L116 112L83 108L72 76Z','#e8d9ff')+F('M101 44L99 80L116 112L128 72Z','#ad8edc')+F('M101 44L72 76L99 80Z','#fbebff')+F('M99 80L83 108L116 112Z','#c8b3ef')+F('M74 83L60 99L77 114L87 104Z','#a997c8')+F('M129 89L141 75L151 100L138 116L117 111Z','#c1b1e3')+spark(145,54,12)+spark(62,63,8),
 hourglass:()=>rect(65,51,70,11,'@gold',3)+rect(65,138,70,11,'@gold',3)+F('M73 62H127Q127 86 104 100Q127 114 127 138H73Q73 114 96 100Q73 86 73 62Z','@light','opacity=".75"')+F('M80 76H120Q117 91 100 98Q83 91 80 76ZM80 135Q84 117 100 109Q116 117 120 135Z','@color')+S('M100 100V113','@color',3),
 seasons:()=>D(100,100,55,'#c5afd9')+F('M100 100L100 47A53 53 0 0 0 47 100Z','#7da99b')+F('M100 100L100 47A53 53 0 0 1 153 100Z','#dfbd76')+F('M100 100L153 100A53 53 0 0 1 100 153Z','#bd795f')+F('M100 100L100 153A53 53 0 0 1 47 100Z','#89b3d2')+S('M100 48V152M48 100H152','#e9dbc9',2.5)+[0,1,2,3,4].map(i=>D(77+Math.cos(i*Math.PI*2/5-Math.PI/2)*11,77+Math.sin(i*Math.PI*2/5-Math.PI/2)*11,7,'#f1c4ce')).join('')+D(77,77,5,'#f8e6a9')+F('M76 84Q64 94 63 89Q65 83 76 84Z','#e0eabb')+F('M113 83Q108 64 137 63Q140 86 113 83Z','#719b72')+S('M112 88L132 68','#e3edbb',2.5)+F('M121 110L129 119L140 117L135 126L140 134L128 131L122 141L116 131L105 130L111 122L108 114Z','#f5cb8e')+S('M121 119V139','#916547',2)+S('M77 109V141M63 117L91 133M63 133L91 117M77 109L73 115M77 109L81 115M77 141L73 135M77 141L81 135','#eff8ff',3)+D(100,100,6,'#f7e7bd'),
 'break-ring':()=>D(100,76,25,'#f2d28e')+F('M75 118Q100 95 125 118L147 144H53Z','#9bb29b')+F('M35 145L45 82L62 53L78 91L73 115L86 146Z','#8f8071')+F('M165 145L155 82L138 53L122 91L127 115L114 146Z','#a89171')+F('M45 82L62 53L58 95L72 114L53 145H35Z','#c6ae89')+F('M155 82L138 53L142 95L128 114L147 145H165Z','#d7bc91')+F('M84 146L96 104H104L116 146Z','#ffe6b5')+S('M47 105L61 113M52 129L66 135M139 112L152 104M134 135L148 128','#756751',2.5)+spark(100,63,10),
 butterfly:()=>wing()+wing(true)+F('M97 82H103L106 133L100 145L94 133Z','@light')+S('M98 83L89 71M102 83L111 71','@light',3)+F('M44 135L57 146L49 153ZM146 136L153 148L140 153Z','@shade'),
 puzzle:()=>F('M48 81H83V72Q83 59 96 59Q109 59 109 72V81H119V94H110Q98 94 98 107Q98 120 110 120H119V153H48V120H57Q70 120 70 107Q70 94 57 94H48Z','#9daac9')+F('M48 81H83V72Q83 59 96 59Q109 59 109 72V81H119V94H110Q98 94 98 107Q98 120 110 120H119V115H48Z','#c2c3de')+S('M48 115H70M97 115H119','#5c5472',2.6)+F('M120 120H128Q141 120 141 107Q141 94 128 94H120V81H154V153H120Z','#8f81bd')+S('M120 81H154V153H120V120H128Q141 120 141 107Q141 94 128 94H120Z','#d7c9eb',2,'stroke-dasharray="4 4" opacity=".85"')+'<g transform="translate(8 -33) rotate(12 137 94)">'+F('M120 81H154V115H120V111H112Q99 111 99 98Q99 85 112 85H120Z','#efc77d')+F('M120 81H154V88H120V91H112Q105 91 105 98Q105 105 112 105H120V115H120V111H112Q99 111 99 98Q99 85 112 85H120Z','#fff0bd')+'</g>'+spark(159,49,9),
 sail:()=>F('M100 49L145 112H100Z','@light')+F('M93 66L93 112H58Z','@color')+S('M97 47V126','@gold',4)+F('M47 121H153L132 145H68Z','@gold')+F('M38 145Q61 132 83 145T127 145T165 145V154H38Z','@color'),
 'stars-five':()=>D(100,100,47,'@panel')+S('M58 105Q86 43 142 79Q171 104 132 134Q84 158 58 105Z','@muted',2)+[[100,53],[146,87],[128,142],[72,142],[54,87]].map(([x,y])=>spark(x,y,15)).join('')+spark(100,100,24),
 prism:()=>'<g transform="rotate(-12 79 99)">'+rect(49,51,64,98,'#a89576',7)+rect(53,47,64,98,'#f4e9d0',7)+S('M65 61H103','#b39e79',6)+[79,95,111,127].map(y=>rect(64,y-5,8,8,'#c9b99b',1.5)+S('M80 '+y+'H103','#b3a388',3.5)).join('')+'</g>'+S('M136 119L158 145','#987239',16)+S('M136 117L158 143','#ecd19b',10)+D(115,91,40,'#c49b55')+D(115,91,36,'#f6dfac')+D(115,91,33,'#304b58')+S('M93 74V108H139','#bbd4db',1.5,'opacity=".4"')+S('M94 104L106 94L116 98L135 75','#bce4b5',5)+F('M124 76L138 71L138 86Z','#dcf0c5')+S('M91 77Q102 60 120 63','#ffffff',3.5,'opacity=".5"')+spark(150,47,11),
 sun:()=>D(100,100,46,'@shade')+Array.from({length:12},(_,i)=>F('M97 45L103 45L106 58H94Z','@gold','transform="rotate('+(i*30)+' 100 100)"')).join('')+D(100,100,33,'@gold')+D(100,100,27,'@dark')+S('M100 76V101L119 111','@light',4)+D(100,100,4,'@light'),
 'forecast-three':()=>S('M43 143V60M43 143H158','#a3a4af',2,'opacity=".5"')+S('M49 138Q90 116 151 97','#9fa8bc',4,'stroke-dasharray="6 6"')+S('M57 128Q62 118 72 103M87 110Q93 98 105 82M118 96Q126 76 143 51','#c58c4e',8)+S('M57 128Q62 118 72 103M87 110Q93 98 105 82M118 96Q126 76 143 51','#f5d69d',3.5)+spark(72,103,13)+spark(105,82,15)+spark(143,51,17)+D(67,119,2.5,'#f6e4bd')+D(114,79,2.8,'#f6e4bd'),
 range:()=>F('M43 102L150 79L150 125L43 146Z','#7e9fb9','opacity=".55"')+S('M43 102L150 79M43 146L150 125','#e3d5a9',3.4,'stroke-dasharray="6 6"')+S('M43 125L150 102','#b6c5d6',2,'stroke-dasharray="3 6"')+S('M67 124Q105 108 106 85Q109 63 132 48','#6c563a',13)+S('M67 124Q105 108 106 85Q109 63 132 48','#e9ba72',7)+S('M67 124Q105 108 106 85Q109 63 132 48','#fff0c5',2.5)+spark(132,48,18)+D(94,95,3,'#f4e0b9')+spark(151,63,6),
 'book-twenty':()=>book('20')+spark(143,57,9),
 branch:()=>S('M48 143Q74 125 97 105Q113 93 150 89M47 143Q76 126 97 105Q117 113 152 126M47 143Q72 126 97 105Q118 78 153 77','#8997b1',6,'opacity=".72"')+S('M48 143Q74 125 97 105Q117 69 151 43','#4b3b31',13)+S('M48 143Q74 125 97 105Q117 69 151 43','#e6ba6c',9)+S('M48 143Q74 125 97 105Q117 69 151 43','#fff0c5',2.6)+D(97,105,5,'#fff0c5')+D(152,77,4,'#a2b0c9')+D(150,89,4,'#a2b0c9')+D(152,126,4,'#a2b0c9')+spark(151,43,15),
 rings:()=>F('M100 48Q142 44 151 86Q163 117 136 143Q100 162 68 141Q43 122 49 88Q56 51 100 48Z','@gold')+[14,25,36,44].map((r,i)=>'<ellipse cx="'+(96+i)+'" cy="'+(101-i)+'" rx="'+r+'" ry="'+(r*.91)+'" fill="none" stroke="@dark" stroke-width="2.5" opacity=".72"/>').join('')+F('M100 100L153 75L150 92Z','@shade'),
 summit:()=>F('M39 137Q48 125 62 131Q70 111 91 122Q108 115 120 133Q135 117 151 131L159 146H39Z','#819ab8')+F('M39 137Q48 125 62 131Q70 111 91 122Q108 115 120 133Q135 117 151 131L159 142H39Z','#d7e1ee')+F('M100 40Q67 40 67 73Q67 100 91 122H109Q133 100 133 73Q133 40 100 40Z','#dfa764')+F('M100 40Q82 43 82 73Q82 97 96 122H104Q118 97 118 73Q118 43 100 40Z','#f7e4ae')+F('M100 40Q118 43 118 73Q118 97 104 122H109Q133 100 133 73Q133 40 100 40Z','#bd8b52')+S('M91 122L94 136M109 122L106 136','#e5d3ae',2.7)+F('M91 135H109L106 146H94Z','#b08455')+S('M94 138H106','#f4d3a0',2)+spark(145,58,12),
 mountain:()=>D(120,73,30,'#e9b981')+D(120,73,24,'#ffe4b5')+F('M36 147L65 102L83 119L113 48L167 147Z','#91a8d1')+F('M113 48L91 100L113 85L136 98Z','#f1f3ff')+F('M113 85L137 147H167L136 98Z','#5e709e')+F('M113 85L100 108L110 117L95 147H137Z','#bacce4')+F('M36 147L65 102L83 119L92 147Z','#7389b7')+F('M44 151Q60 143 78 151T114 151T154 148L146 158H55Z','#d1d9ee')+S('M49 138L66 125M122 118L136 139','#e0ebff',2.5)+spark(64,65,10),
 shatter:()=>F('M51 59Q70 51 94 64L105 77L94 96L103 108L83 135Q66 124 49 129Z','#e5d9ef')+F('M112 62Q131 49 151 54L148 123Q128 121 110 138L120 111L108 98L121 82Z','#a8a4cf')+S('M59 73L83 78M59 85L81 90M59 103L78 108M127 72L142 66M130 84L142 79','#61547d',3.4)+F('M84 134L98 146L108 133L102 120Z','#cbb8e7')+F('M111 48L120 35L127 49Z','#eee3fb')+F('M146 139L158 130L157 146Z','#c9d9ed')+S('M61 148Q94 136 109 113Q126 88 106 85Q91 83 119 63Q137 49 153 46','#3d345c',12)+S('M61 148Q94 136 109 113Q126 88 106 85Q91 83 119 63Q137 49 153 46','#f5d6a0',7)+S('M61 148Q94 136 109 113Q126 88 106 85Q91 83 119 63Q137 49 153 46','#fff4dc',2.5)+spark(152,44,11),
 diamond:()=>S('M131 62A52 52 0 1 0 143 127','#635783',16)+S('M131 62A52 52 0 1 0 143 127','#b9a9e4',11)+S('M131 62A52 52 0 1 0 143 127','#ece1ff',2.5)+F('M132 52L144 60L135 72L124 66Z','#e6d6f5')+F('M138 119L150 123L143 138L131 132Z','#dac8f0')+F('M140 80L159 69L155 89Z','#a5bfe8')+F('M154 101L169 105L155 116Z','#efc6e5')+F('M126 42L133 31L139 47Z','#dbc7f2')+F('M53 141L93 91L109 97L148 43L151 67L165 65L114 124L98 115L64 155Z','#f1c98e')+F('M53 141L93 91L109 97L148 43L114 107L100 102Z','#fff2d3')+spark(149,43,9),
 phase:()=>'<g transform="rotate(27 63 128)">'+S('M63 94A22 34 0 1 0 63 162A22 34 0 1 0 63 94Z','#5876a6',9)+S('M63 94A22 34 0 1 0 63 162A22 34 0 1 0 63 94Z','#adc9f1',3)+'</g>'+'<g transform="rotate(27 135 67)">'+S('M135 32A22 35 0 1 0 135 102A22 35 0 1 0 135 32Z','#b08cd8',10)+S('M135 32A22 35 0 1 0 135 102A22 35 0 1 0 135 32Z','#f4dcff',3)+'</g>'+S('M55 138C80 151 86 113 95 97S119 67 145 61','#5b5687',15)+S('M55 138C80 151 86 113 95 97S119 67 145 61','#d3c5ef',9)+S('M55 138C80 151 86 113 95 97S119 67 145 61','#fff2c5',4)+spark(98,95,13)+D(52,139,4,'#f4e2c3')+spark(148,55,9),
 horizon:()=>F('M44 146V92Q44 44 100 42Q156 44 156 92V146H134V93Q134 67 100 65Q66 67 66 93V146Z','#9187b9')+F('M44 146V92Q44 44 100 42Q156 44 156 92V100H149V91Q149 50 100 49Q51 51 51 92V146Z','#e2d2ed')+D(111,93,18,'#f0c88e')+F('M66 119L85 93L101 112L121 86L134 111V149H66Z','#7892b7')+F('M66 129Q98 111 134 129V148H66Z','#91b7b1')+F('M77 148Q116 133 104 122Q98 116 116 106Q106 118 117 124Q131 135 108 149Z','#f5dfb6')+F('M43 144H66V153H43ZM134 144H157V153H134Z','#d4c3e4')+S('M44 102H63M136 102H155M47 121H63M136 121H153','#5b527d',2.5)+spark(119,80,7),
 infinity:()=>S('M43 61V144H156M43 116H154M43 90H154M73 51V144M103 51V144M133 51V144','#7184a7',1.8,'opacity=".5"')+S('M43 100C43 63 73 58 100 100C127 142 157 137 157 100C157 63 127 58 100 100C73 142 43 137 43 100Z','#6b588e',22)+S('M43 100C43 63 73 58 100 100C127 142 157 137 157 100','#c3afea',15)+S('M157 100C157 63 127 58 100 100C73 142 43 137 43 100','#90bedb',15)+S('M73 79Q87 86 100 100T128 124','#e9c5df',15)+S('M45 91C51 63 77 73 100 100C126 133 153 130 157 106','#fff0e2',3.5)+S('M156 93Q151 74 136 76Q118 78 100 100Q77 135 51 119','#d9efff',2.4)+spark(147,49,13)+spark(57,151,6),
 scroll:()=>F('M52 65Q63 54 81 61L144 72Q133 98 140 128L130 147L58 136Q68 102 52 65Z','#b9a8df')+F('M58 66L136 76Q126 104 132 130L124 140L65 130Q74 103 58 66Z','#393b66')+F('M51 64Q41 50 55 47L132 61Q151 66 144 78L65 66Q56 76 51 64Z','#dec9a9')+F('M60 53L134 67Q142 69 140 73L63 59Z','#f4e4c6')+F('M58 130Q45 135 51 147Q56 154 68 153L125 163Q142 161 140 147L130 140L66 129Z','#d6bd9b')+F('M53 140L128 153Q137 154 135 159L65 148Z','#f0ddc4')+S('M72 124Q110 112 95 91Q86 77 111 57Q130 43 146 36','#8c79b8',15,'opacity=".55"')+S('M72 124Q110 112 95 91Q86 77 111 57Q130 43 146 36','#ebd1a2',4)+spark(78,117,8)+spark(101,83,11)+spark(119,53,10)+spark(146,36,13)+D(82,83,2.6,'#f0e7ff')+D(122,104,3,'#b7c9ef')+D(110,122,2.5,'#f0e7ff'),
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
// Each rule is shown separately; actuals come from the same qualifying evidence window.
const summaries={
 'first-step':'第一次记录，开启自己的成长轨迹。','full-picture':'把零散的成绩拼成完整的记录。','rank-aware':'不只记录分数，也记录自己的位置。','new-best':'刷新同一学科的个人最好成绩。','three-days':'让成长不再只有一个数据点。',reflection:'考后回顾，把经验留下。','goal-set':'为接下来的学习设定方向。','step-up':'在可比考试中，自己的位置向前移动。','five-days':'用五个考试日记录成长。','time-witness':'跨越一个月，仍然留下成绩记录。','half-year':'六个不同月份，都有成长的印记。','getting-better':'连续三场，位比逐步改善。','beyond-score':'分数下降，但排名位比反而向前。',steady:'跨过一段时间，整体表现稳步改善。','double-proof':'多次考试中，得分率与位比同时改善。','hold-peak':'刷新个人纪录后，仍保持此前的最好水平。','ten-days':'十个考试日，汇成一条成长轨迹。',unexpected:'实际表现第一次超过模型预测。','long-road':'在两个月以上的时间里持续留下记录。',comeback:'经历回落后，重新回到此前的水平。',chorus:'同一对考试中，多门学科同步改善。',harder:'难度升高，但排名表现依然稳定或向前。',accumulation:'前期积累之后，后两场表现显著改善。','year-trace':'用跨越一年的考试记录留下成长轨迹。','four-seasons':'十二个不同月份，都有考试记录。',plateau:'打破此前的稳定平台，并保持新的水平。',cocoon:'曾经相对薄弱的学科，成长为自己的优势学科。',puzzle:'补上相对薄弱的学科，同时保持整体稳定。',headwind:'面对更难的试卷，位比依然明显改善。',resonance:'同一对考试中，至少五门学科同步改善。','more-than-score':'多次出现分数下降、位比却改善的表现。','time-kept':'在不同月份留下实际录入的足迹。','beyond-expectation':'不止一次，而是三次超过模型预测。','outside-range':'实际表现超出模型的95%预测区间。','twenty-days':'二十个考试日，二十段成长记录。','unique-path':'实际表现多次超过相似轨迹的预测。',rings:'长时间跨度与丰富的考试记录共同留下年轮。','another-height':'突破稳定平台，并连续保持显著改善。',ascent:'积累之后，连续两场实现大幅改善。',rewrite:'五次超过模型预测，改写原来的预期。','break-limit':'实际表现显著超出预测区间的最佳边界。','phase-shift':'模型检测到新的状态，并由后续考试确认。','new-horizon':'连续两场总分位比显著超越此前水平。',undefined:'十次大幅超过模型预测。',chronicle:'四十个考试日，汇成一部成长长卷。',early:'在平台起步的第一周便已加入。',triple:'见证平台的三个共同里程碑。',creator:'自己的建议成为正式上线的功能。',contributor:'一次有效反馈，推动产品变得更完善。',pioneer:'参与新功能内测并提供有效反馈。','spark-support':'自愿支持产品，留下纪念。',annual:'参与年度回顾，收藏这一年的记录。'
};
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const mean=a=>a.length&&a.every(finite)?a.reduce((s,v)=>s+Number(v),0)/a.length:null;
const maxOf=a=>a.length&&a.every(finite)?Math.max(...a.map(Number)):null;
const minOf=a=>a.length&&a.every(finite)?Math.min(...a.map(Number)):null;
const diff=(a,b)=>finite(a)&&finite(b)?Number(a)-Number(b):null;
const spread=a=>diff(maxOf(a),minOf(a));
const median=a=>{if(!a.length||!a.every(finite))return null;const x=[...a].map(Number).sort((a,b)=>a-b);return x.length%2?x[x.length>>1]:(x[x.length/2-1]+x[x.length/2])/2};
const daySpan=(a,b)=>a&&b&&Number.isFinite(Date.parse(a))&&Number.isFinite(Date.parse(b))?(Date.parse(b)-Date.parse(a))/86400000:null;
function conditionRows(b,e){
 const rows=[],p=e?.points||[],pos=p.map(x=>x.position),rate=p.map(x=>x.rate),ev=e?.events||(e?[e]:[]),subjects=e?.subjects||[];
 const add=(name,condition,actual,ok)=>rows.push({name,condition,actual:actual??null,ok:actual==null?null:ok});
 const metric=(name,op,n,v,unit)=>{const valid=finite(v);add(name,op+' '+n+(unit?' '+unit:''),valid?number(v)+(unit?' '+unit:''):null,valid?(op==='≥'?v>=n:op==='≤'?v<=n:op==='>'?v>n:v===n):null)};
 const yes=(name,condition,v,label='已满足')=>add(name,condition,v===true?label:v===false?'未满足':null,v);
 const count=(name,n,v,unit='场')=>metric(name,'≥',n,v,unit);
 const ppge=(name,n,v)=>metric(name,'≥',n,v,'个百分点');
 const pple=(name,n,v)=>metric(name,'≤',n,v,'个百分点');
 const timeRules={'three-days':[3,0,0],'five-days':[5,0,0],'ten-days':[10,0,0],'twenty-days':[20,0,0],chronicle:[40,0,0],'half-year':[6,0,6],'year-trace':[12,365,6],'four-seasons':[12,0,12],rings:[20,365,9],'time-witness':[3,30,0],'long-road':[4,60,0],'time-kept':[6,0,3]};
 const tr=timeRules[b.id];if(tr){const upload=['time-witness','long-road','time-kept'].includes(b.id);count(upload?'不同实际录入日':'不同有效考试日',tr[0],e?.count,'天');if(tr[1])count('首末日期跨度',tr[1],e?.span,'天');if(tr[2])count('覆盖自然月',tr[2],e?.months,'个月');return rows}
 const forecastRules={unexpected:[1,2],'beyond-expectation':[3,2],rewrite:[5,2],undefined:[10,5],'unique-path':[3,5]};
 const fr=forecastRules[b.id];if(fr){count('累计符合条件的考试日',fr[0],e?(e.totalCount??e.count??new Set(p.map(x=>x.date)).size):null,'天');ppge('每次至少超越预测点',fr[1],e?.minDelta??minOf(p.map(x=>x.delta)));return rows}
 switch(b.id){
 case 'first-step':count('有效考试日',1,e?.count??(e?.date?1:null),'天');if(e?.date)add('首次记录日期','有效考试日',e.date,true);break;
 case 'full-picture':count('已记录有效学科',3,e?.subjects?.length,'门');break;
 case 'rank-aware':yes('有效单科排名','排名在参考人数范围内',e&&finite(e.position)&&finite(e.participants)?true:null,e&&finite(e.position)?'前 '+percent(e.position):'已满足');count('参考人数',30,e?.participants,'人');break;
 case 'goal-set':yes('长期学习目标','已经建立',e?.label?true:null);break;
 case 'reflection':yes('考后反思','已保存非空反思',e?.label?true:null);break;
 case 'new-best':yes('成绩可比性','同科、同分类、同满分',e?.comparable??(p.length>=2?true:null),'同一可比序列');metric('个人纪录改善','>',0,diff(rate.at(-1),rate[0]),'个百分点');break;
 case 'hold-peak':count('可比考试记录',5,e?.historyCount??(p.length? p.length:null));count('刷新前历史记录',3,e?.priorCount??(p.length? p.length-2:null));ppge('新纪录较此前最佳改善',5,diff(rate.at(-2),e?.previousBest));ppge('下一场较此前最佳改善',0,diff(rate.at(-1),e?.previousBest));break;
 case 'step-up':count('相邻可比考试',2,p.length||null);ppge('位比改善',5,diff(pos[0],pos.at(-1)));break;
 case 'getting-better':count('同一序列连续考试',3,p.length||null);yes('位比连续改善','每场均比上一场靠前',pos.length===3&&pos.every(finite)?pos[0]>pos[1]&&pos[1]>pos[2]:null,'连续改善');ppge('累计位比改善',5,diff(pos[0],pos.at(-1)));break;
 case 'beyond-score':case 'more-than-score':case 'double-proof':{
 const dual=b.id==='double-proof',n=b.id==='beyond-score'?1:3;count('符合条件的不同考试日',n,e?(e.totalCount??new Set(ev.map(x=>x.points?.at(-1)?.date).filter(Boolean)).size):null,'天');
 if(dual)ppge('每次得分率改善',3,e?.minScoreChange??minOf(ev.map(x=>x.scoreChange)));else pple('每次得分率变化',-3,e?.maxScoreChange??maxOf(ev.map(x=>x.scoreChange)));
 ppge('每次位比改善',5,e?.minPositionChange??minOf(ev.map(x=>x.positionChange)));break}
 case 'steady':case 'plateau':case 'another-height':case 'new-horizon':{
 const old=mean(pos.slice(0,2)),fresh=pos.slice(2),steady=b.id==='steady',horizon=b.id==='new-horizon';
 count(horizon?'可比总分考试':b.id==='another-height'?'可比单科考试':'可比考试',4,p.length||null);
 if(!horizon)count('考试跨度',30,daySpan(p[0]?.date,p.at(-1)?.date),'天');
 if(steady){ppge('后两场平均位比改善',5,diff(old,mean(fresh)));count('相邻变化未回落次数',2,pos.length===4&&pos.every(finite)?pos.slice(1).filter((x,i)=>x<=pos[i]).length:null,'次')}
 else{if(!horizon)pple('前两场位比波动',5,spread(pos.slice(0,2)));ppge('后两场各自较此前均值改善',b.id==='plateau'?15:30,diff(old,maxOf(fresh)))}break}
 case 'accumulation':case 'ascent':count(b.id==='ascent'?'可比单科考试':'可比考试',5,p.length||null);ppge('后两场各自较前三场均值改善',b.id==='ascent'?40:20,diff(mean(pos.slice(0,3)),maxOf(pos.slice(3))));break;
 case 'comeback':count('可比考试',5,p.length||null);ppge('第三场较前两场平均回落',10,diff(pos[2],mean(pos.slice(0,2))));ppge('后两场各自较第三场改善',10,diff(pos[2],maxOf(pos.slice(3))));pple('后两场最差位比相对此前均值的落后',2,diff(maxOf(pos.slice(3)),mean(pos.slice(0,2))));break;
 case 'harder':case 'headwind':count('可比单科考试',b.id==='harder'?4:5,e?.historyCount);metric('难度指数增加','≥',10,diff(e?.difficulty,e?.referenceDifficulty),'点');ppge('相对近期平均位比改善',b.id==='harder'?0:5,diff(e?.baseline,e?.actual));yes('难度估计质量','除历史场数外的质量检查通过',e?.qualityPassed,'已通过');break;
 case 'chorus':case 'resonance':yes('考试可比性','同一对相邻可比考试',subjects.length?true:null);count('位比改善至少5个百分点的学科',b.id==='chorus'?3:5,subjects.length?subjects.filter(x=>diff(x.before,x.after)>=5).length:null,'门');pple('其余科目最大回落',2,subjects.length?Math.max(0,maxOf(subjects.map(x=>diff(x.after,x.before)))):null);break;
 case 'puzzle':case 'cocoon':{
 const cocoon=b.id==='cocoon',before=median(subjects.map(x=>x.before)),after=median(subjects.map(x=>x.after));
 const x=e?.witnessSubject?subjects.find(s=>s.subject===e.witnessSubject):subjects.find(s=>finite(before)&&finite(after)&&s.before-before>=10&&s.after-after<=(cocoon?-5:5)&&s.before-s.after>=(cocoon?15:10));
 count('可比考试',4,e?.historyCount??(e?.dates?.length===2?4:null));count('可比学科',4,subjects.length||null,'门');count('考试跨度',cocoon?60:30,daySpan(e?.dates?.[0],e?.dates?.at(-1)),'天');
 if(x)add('符合条件的学科','同一门学科',x.subject,true);ppge('此前较学科中位水平落后',10,diff(x?.before,before));if(cocoon)ppge('此后较学科中位水平领先',5,diff(after,x?.after));else pple('此后较学科中位水平落后',5,diff(x?.after,after));ppge('该学科自身位比改善',cocoon?15:10,diff(x?.before,x?.after));if(!cocoon)metric('明显回落的学科','≤',1,subjects.length?subjects.filter(s=>s.after-s.before>2).length:null,'门');break}
 case 'outside-range':case 'break-limit':metric('超越95%区间最佳端点',b.id==='outside-range'?'>':'≥',b.id==='outside-range'?0:5,e?.delta,'个百分点');if(e&&finite(e.low)&&finite(e.actual))add('预测边界与实际位比','实际位比优于区间最佳端点','前 '+percent(e.low)+' → 前 '+percent(e.actual),e.actual<e.low);break;
 case 'phase-shift':count('可比考试',6,p.length||null);metric('模型变点概率','>',50,e?.probability,'%');count('变化前稳定状态长度',3,e?.stableRun,'场');ppge('变化场和下一场各自改善',5,e?.improvement);break;
 case 'early':add('注册日期','早于 2026-08-27（北京时间）',e?.date,e?.date?e.date<'2026-08-27':null);break;
 case 'triple':yes('活动参与记录','参加三百纪念活动',e?.verified??null);break;
 case 'creator':yes('建议采纳','建议获采纳',e?.verified??null);yes('正式上线','相关功能已经上线',e?.verified??null);break;
 case 'contributor':yes('反馈贡献','推动实际修复并经确认',e?.verified??null);break;
 case 'pioneer':yes('内测参与','参与内测',e?.verified??null);yes('有效反馈','已提供反馈并核验',e?.verified??null);break;
 case 'spark-support':yes('自愿支持','支持记录已核验（不按金额分级）',e?.verified??null);break;
 case 'annual':yes('年度回顾','参与2026年度回顾',e?.verified??null);break;
 default:add('解锁条件',b.condition,null,null);
 }
 return rows;
}
function renderConditions(b,e,locked,opt={}){
 if(locked)return '<h3>解锁条件</h3><p>隐藏成就，解锁后揭晓。</p>';
 const rows=conditionRows(b,e);
 return '<p class="st-ach-summary">'+esc(summaries[b.id]||b.condition)+'</p><h3>解锁条件</h3><div class="st-ach-rule-table"><div class="st-ach-rule-head"><span>条件</span><span>'+(opt.demo?'示例表现':'实际表现')+'</span></div>'+rows.map(r=>'<div class="st-ach-rule-row"><div><strong>'+esc(r.name)+'</strong><small>'+esc(r.condition)+'</small></div><div class="st-ach-rule-actual '+(r.ok===true?'is-met':r.ok===false?'is-unmet':'is-unknown')+'"><span>'+esc(r.actual??(e?'证据未记录':opt.pending?'待核验':'暂无命中证据'))+'</span>'+(r.ok===true?'<small>✓ 满足</small>':r.ok===false?'<small>未满足</small>':'<small>—</small>')+'</div></div>').join('')+'</div>';
}

function evidence(b,e){
 if(!e)return cap('尚未获得 · 解锁后显示证据');
 if(e.kind==='forecast'||e.kind==='match'){
 const p=e.points||[];return plot([{label:'系统预测',values:p.map(x=>x.prediction),color:'#8197c4',dash:true},{label:'实际位比',values:p.map(x=>x.actual),color:'#29977f'}])+metrics([['累计超越',String(e.totalCount??p.length)+' 次'],['所示考试平均超越',pp(p.reduce((s,x)=>s+Number(x.delta),0)/Math.max(1,p.length))]])+'<details><summary>查看解锁证据考试日</summary>'+p.map(x=>'<div class="st-ach-evidence-line">'+esc(x.date)+' · 预测前 '+percent(x.prediction)+' / 实际前 '+percent(x.actual)+'</div>').join('')+'</details>';
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
 const day=i=>new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),points=(v,score=false)=>v.map((x,i)=>({date:day(i*21),subject:'数学',position:score?null:x,rate:score?x:null}));
 if(b.evidence==='forecast'||b.evidence==='match'){
 const n=({unexpected:1,'beyond-expectation':3,rewrite:5,undefined:10,'unique-path':3})[b.id]||3;
 return {kind:b.evidence,source:'demo',points:Array.from({length:n},(_,i)=>({date:day(i*2),prediction:36-i,actual:29-i,delta:7}))};
 }
 if(b.evidence==='interval')return {kind:'interval',source:'demo',low:20,high:46,actual:12,delta:8,date:day(4)};
 if(b.evidence==='difficulty')return {kind:'difficulty',source:'demo',difficulty:64,referenceDifficulty:49,actual:22,baseline:30,historyCount:6,qualityPassed:true};
 if(b.evidence==='radar'){let subjects=['语文','数学','英语','物理','化学','地理'];return {kind:'radar',source:'demo',historyCount:4,dates:['2026-06-01','2026-09-01'],witnessSubject:(b.id==='cocoon'||b.id==='puzzle')?'数学':undefined,subjects:subjects.map((s,i)=>({subject:s,before:b.id==='cocoon'||b.id==='puzzle'?(i===1?60:34+i):44+i,after:b.id==='cocoon'||b.id==='puzzle'?(i===1?23:33+i):31+i}))}}
 if(b.evidence==='dual'){const ev={points:[{date:day(3),subject:'数学'}],scoreChange:b.id==='double-proof'?6:-4,positionChange:8};return {kind:'dual',source:'demo',...(b.id==='beyond-score'?ev:{events:[0,1,2].map(i=>({...ev,points:[{date:day(i*5),subject:'数学'}]}))})}}
 if(b.evidence==='time'){const n=({'three-days':3,'five-days':5,'ten-days':10,'twenty-days':20,chronicle:40,'half-year':6,'year-trace':12,'four-seasons':12,rings:20,'time-witness':3,'long-road':4,'time-kept':6})[b.id]||6,yr=['year-trace','four-seasons','rings','chronicle'].includes(b.id),mo=yr?12:b.id==='half-year'?6:3;return {kind:'time',source:'demo',dates:[yr?'2025-10-01':b.id==='half-year'?'2026-05-01':'2026-08-01','2026-10-31'],count:n,span:yr?395:b.id==='half-year'?183:91,months:mo}}
 if(b.evidence==='score')return {kind:'score',source:'demo',points:points(b.id==='new-best'?[72,83]:[72,75,79,87,82],true),previousBest:79,historyCount:5,priorCount:3};
 if(b.evidence==='state')return {kind:'state',source:'demo',points:points([48,49,47,48,27,24]),probability:67,improvement:21,stableRun:4};
 if(b.evidence==='rank'){
 const p=({'step-up':[49,40],'getting-better':[49,44,38],steady:[49,45,42,36],comeback:[35,34,55,30,31],plateau:[53,51,29,27],'another-height':[67,64,32,31],ascent:[72,69,71,27,25],accumulation:[60,57,59,35,34],'new-horizon':[65,64,30,29]})[b.id]||[50,40,30,22];return {kind:'rank',source:'demo',points:points(p)};
 }
 return {kind:b.evidence,source:'demo',date:b.id==='early'?'2026-08-21':'2026-10-21',label:b.condition,verified:true,...(b.id==='rank-aware'?{position:24,participants:650}:{}),...(b.id==='full-picture'?{subjects:['语文','数学','英语','物理','化学','地理']}: {})};
}
let collectionDialog,dialog,deck,controls,shown,returnFocus,mode='front',tour=null,timer=null,ack=null,ackSent=false;
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
 const label=preview?'模拟解锁':opt.realPreview?(earned?'真实数据 · 符合条件':'真实数据 · 条件详情'):earned?'成就已解锁':'成就详情';
 dialog.dataset.tier=b.tier;dialog.querySelector('.st-ach-batch').textContent=opt.batch>1?(opt.realPreview?'真实记录符合 '+opt.batch+' 项成就 · 预览而非发放':'已解锁 '+opt.batch+' 项成就 · 优先展示代表徽章'):opt.tour?'巡展 '+opt.tour:'';
 deck.className='st-ach-deck';
 deck.innerHTML='<section class="st-ach-face st-ach-front '+(opt.play?'st-ach-reveal':'')+'"><div class="st-ach-halo"></div><div class="st-ach-kicker">SCORE TRACKER · '+label+'</div><div class="st-ach-rarity">'+esc(C.tiers[b.tier])+(b.hidden&&(!locked)?' · 隐藏':'')+'</div><div class="st-ach-hero">'+emblem(b,locked)+'</div><h2>'+esc(locked?'尚未发现':b.name)+'</h2><p class="st-ach-quote">'+esc(locked?'等待属于你的发现。':b.quote)+'</p><div class="st-ach-rate">'+(locked?'—':esc(rateInfo(b,opt).value))+'</div><small>'+ (locked?'解锁后揭晓':esc(rateInfo(b,opt).label))+'</small>'+(!locked&&earned&&!preview?cap(dateLabel(a)):'')+'<div class="st-ach-brand">SCORE TRACKER  /  ACHIEVEMENTS</div></section><section class="st-ach-face st-ach-back"><div class="st-ach-kicker">ACHIEVEMENT RECORD</div><h2>'+esc(locked?'尚未发现':b.name)+'</h2>'+renderConditions(b,a?.evidence,locked,opt)+'<h3>成就见证</h3>'+(locked?cap('尚未解锁'):evidence(b,a?.evidence))+(a?cap(preview?'示例数据 · 仅供交互预览':opt.realPreview&&source==='historical_replay'?'真实账号历史记录计算 · 预览，不正式发放；预测类为历史滚动回放':source==='historical_replay'?'历史滚动回放 · 非真实考前冻结预测':source==='demo'?'示例数据':source==='manual'?'经核验的纪念记录':'成就证据快照'):'')+(!earned&&!locked&&(b.mode!=='auto'||opt.pending)?cap(opt.pending||'待快照接入或活动核验，不会自动发放。'):'')+'</section>';
 controls.innerHTML='<button type="button" data-flip>翻面 · 查看成就见证</button>'+(opt.demo||(opt.realPreview&&earned)?'<button type="button" data-replay>重播</button>':'')+(tour?'<button type="button" data-tour-stop>停止巡展</button>':'')+(opt.onGallery?'<button type="button" data-gallery>查看收藏馆</button>':'')+'<button type="button" data-dismiss>关闭</button>';
 controls.querySelector('[data-flip]').onclick=()=>{if(tour){stopTour();controls.querySelector('[data-tour-stop]')?.remove()}setFace(mode==='front'?'back':'front')};
 controls.querySelector('[data-dismiss]').onclick=()=>dialog.close();
 const replay=controls.querySelector('[data-replay]');if(replay)replay.onclick=()=>{stopTour();renderCard(b,a,{...opt,tour:null,play:true})};
 const stop=controls.querySelector('[data-tour-stop]');if(stop)stop.onclick=()=>{stopTour();stop.remove()};
 const gallery=controls.querySelector('[data-gallery]');if(gallery)gallery.onclick=()=>{stopTour();if(!ackSent&&ack){ackSent=true;ack()}ack=null;if(dialog.open)dialog.close();opt.onGallery()};
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

function dayKey(x){if(typeof x!=='string'||!x)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(x))return x;const t=Date.parse(x);return Number.isFinite(t)?new Date(t+28800000).toISOString().slice(0,10):''}
function evidenceDay(a){if(!a)return '';const e=a.evidence||{};if(e.achievedDate)return dayKey(e.achievedDate);if(e.kind==='time')return '';return [e.date,...(e.points||[]).map(x=>x.date),...(e.events||[]).flatMap(x=>(x.points||[]).map(p=>p.date)),...(e.dates||[])].map(dayKey).filter(Boolean).sort().at(-1)||''}
function awardDay(a){return evidenceDay(a)||dayKey(a?.awarded_at)}
function dateLabel(a){const d=evidenceDay(a);return d?d.replaceAll('-','.')+(a?.evidence?.source==='historical_replay'?' · 历史':''):a?.awarded_at?dayKey(a.awarded_at).replaceAll('-','.')+' · 获得':'日期待追溯'}
function rateInfo(b,opt={}){
 const s=opt.stats;if(s&&Number(s.total)>0&&s.counts&&typeof s.counts==='object'){const c=Number(s.counts[b.id]??0);return {value:(c/Number(s.total)*100).toFixed(c>0&&c/Number(s.total)<.001?3:2)+'%',label:'全站获得率',number:c/Number(s.total)}}
 if(opt.demo||opt.realPreview)return {value:rate(b),label:'历史达成率参考',number:b.count==null?Infinity:b.count/C.denominator};
 return {value:'待统计',label:'全站获得率',number:Infinity}
}
function favoriteIds(awards,preferred){const ids=new Set(awards.map(a=>a.badge_id));if(Array.isArray(preferred))return [...new Set(preferred)].filter(x=>ids.has(x)&&B.has(x)).slice(0,3);return [...awards].filter(a=>B.has(a.badge_id)).sort((a,b)=>awardDay(b).localeCompare(awardDay(a))).slice(0,3).map(a=>a.badge_id)}
function entryHTML(awards=[],opt={}){const fav=favoriteIds(awards,opt.favorites),extras=awards.filter(a=>!fav.includes(a.badge_id)&&B.has(a.badge_id)).sort((a,b)=>awardDay(b).localeCompare(awardDay(a))).map(a=>a.badge_id),ids=[...fav,...extras].slice(0,5);return '<span class="st-ach-entry-top"><strong>我的成就</strong><span>'+esc(opt.realPreview?'符合 ':'已收藏 ')+awards.length+' 枚　›</span></span>'+(ids.length?'<span class="st-ach-entry-medals">'+ids.map(id=>emblem(B.get(id))).join('')+'</span>':'')+'<span class="st-ach-entry-sub">打开我的成长收藏册</span>'}
function gallery(root,awards=[],demo=false,options={}){
 const earned=new Map(awards.filter(a=>B.has(a.badge_id)).map(a=>[a.badge_id,a])),own=[...earned.values()],opt={...options,demo},filter={tier:'all',query:'',tab:demo?'all':'owned',sort:demo?'catalog':'rarity',reveal:demo};
 let favorites=favoriteIds(own,options.favorites),editing=false,busy=false,editMessage='';
 root.classList.add('st-ach-gallery');
 const secret=b=>b.hidden&&!earned.has(b.id)&&!filter.reveal;
 const name=b=>secret(b)?'尚未发现':b.name;
 root.innerHTML='<div class="st-ach-collection-hero"><div class="st-ach-collection-top"><div><small>MY ACHIEVEMENTS</small><h2>成就馆</h2><div class="st-ach-collection-count">'+(demo?'52':own.length)+' <span>'+esc(demo?'枚设计预览':options.realPreview?'枚符合条件':'枚收藏')+'</span></div><p>每一枚，都是一段值得记住的经历。</p></div><div class="st-ach-collection-emblem"></div></div><div class="st-ach-tier-counts">'+levels.map(t=>'<div><strong>'+(demo?C.badges.filter(b=>b.tier===t).length:own.filter(a=>B.get(a.badge_id).tier===t).length)+'</strong><small>'+C.tiers[t]+'</small></div>').join('')+'</div></div>'+
 (!demo?'<div class="st-ach-section-title"><strong>我的珍藏</strong><button type="button" data-edit>编辑代表徽章</button></div><div class="st-ach-featured"></div><p class="st-ach-edit-note" aria-live="polite"></p><div class="st-ach-tabs" role="group" aria-label="收藏馆分类"><button type="button" data-tab="owned">我的收藏</button><button type="button" data-tab="all">全部成就</button><button type="button" data-tab="timeline">成就历程</button></div>':'')+
 '<div class="st-ach-filters"><select data-tier-select aria-label="稀有等级"><option value="all">全部等级</option>'+levels.map(t=>'<option value="'+t+'">'+C.tiers[t]+'</option>').join('')+'</select><input type="search" placeholder="查找成就" aria-label="查找成就"><select data-sort aria-label="排序"><option value="catalog">图鉴顺序</option><option value="rarity">稀有等级</option><option value="new">从近到远</option><option value="old">从远到近</option><option value="rate">达成率从低到高</option></select>'+(demo?'<label><input type="checkbox" data-reveal checked> 展示隐藏设计</label><button type="button" data-random>随机模拟</button><button type="button" data-tour>全部巡展</button>':'')+'</div><div class="st-ach-grid"></div><p class="st-ach-caption">'+esc(demo||options.realPreview?'预览比例为历史回测参考，并非正式获得率。历史日期依据现存记录推算；预览不正式发放。':'全站获得率按有效注册账号统计；历史日期由现存记录推算，无法追溯时显示获得日期。')+'</p>';
 const grid=root.querySelector('.st-ach-grid'),sortEl=root.querySelector('[data-sort]');
 function filtered(){
  const order=filter.tab==='timeline'?(filter.sort==='old'?'old':'new'):filter.sort;
  return C.badges.filter(b=>(filter.tier==='all'||b.tier===filter.tier)&&(filter.tab==='all'||earned.has(b.id))&&(!filter.query||name(b).includes(filter.query))).sort((a,b)=>{
   if(order==='rate'){const x=secret(a)?Infinity:rateInfo(a,opt).number,y=secret(b)?Infinity:rateInfo(b,opt).number;return x===y?0:x<y?-1:1}
   if(order==='rarity')return levels.indexOf(b.tier)-levels.indexOf(a.tier);
   if(order==='new'||order==='old'){const x=awardDay(earned.get(a.id)),y=awardDay(earned.get(b.id));return !x&&y?1:x&&!y?-1:order==='new'?y.localeCompare(x):x.localeCompare(y)}
   return 0});
 }
 function tile(b,timeline=false){
  const a=earned.get(b.id),hidden=secret(b),r=rateInfo(b,opt),locked=!a&&!filter.reveal,date=a?dateLabel(a):options.pending?.[b.id]?'待核验':'尚未获得';
  return '<button type="button" class="st-ach-tile '+(locked?'st-ach-locked ':'')+(editing&&favorites.includes(b.id)?'st-ach-favorite-selected ':'')+(timeline?'st-ach-timeline-tile':'')+'" data-id="'+b.id+'" data-tier="'+b.tier+'" '+(editing&&!a?'disabled':'')+'><span class="st-ach-tile-image">'+emblem(b,locked)+'</span><span class="st-ach-tile-text"><strong>'+esc(name(b))+'</strong><small>'+esc(hidden?'隐藏成就':C.tiers[b.tier])+'</small>'+(hidden?'':'<span class="st-ach-tile-rate">'+esc(r.value)+'</span><small>'+esc(r.label)+'</small>')+(timeline?'<span class="st-ach-timeline-quote">'+esc(b.quote)+'</span>':'')+(demo?'':'<span class="st-ach-tile-date">'+esc(date)+'</span>')+'</span>'+(editing&&favorites.includes(b.id)?'<span class="st-ach-favorite-check">✓</span>':'')+'</button>';
 }
 function draw(){
  const lead=favorites[0]&&B.get(favorites[0]);root.querySelector('.st-ach-collection-emblem').innerHTML=lead?emblem(lead):'';
  if(!demo){root.querySelector('.st-ach-featured').innerHTML=favorites.map(id=>{const b=B.get(id);return '<button type="button" data-featured="'+id+'">'+emblem(b)+'<strong>'+esc(b.name)+'</strong><small>'+C.tiers[b.tier]+'</small></button>'}).join('')+Array.from({length:3-favorites.length},()=>'<button type="button" data-add-favorite><span class="st-ach-feature-empty">＋</span><small>选择徽章</small></button>').join('');
   root.querySelector('[data-edit]').textContent=editing?'完成编辑':'编辑代表徽章';root.querySelector('[data-edit]').disabled=busy;
   root.querySelector('.st-ach-edit-note').textContent=editMessage||(editing?'从已获得的徽章中选择最多3枚，点击已选择的徽章可取消。':'');
   root.querySelectorAll('[data-tab]').forEach(x=>{x.setAttribute('aria-pressed',String(x.dataset.tab===filter.tab));x.disabled=editing});
  }
  const timeline=filter.tab==='timeline';sortEl.querySelectorAll('option').forEach(o=>o.hidden=timeline&&!['new','old'].includes(o.value));sortEl.value=timeline?(filter.sort==='old'?'old':'new'):filter.sort;
  grid.classList.toggle('st-ach-timeline',timeline);const list=filtered();
  if(!list.length){grid.innerHTML='<p class="st-ach-caption">没有符合筛选条件的成就。</p>';return}
  if(timeline){const map=new Map();for(const b of list){const day=awardDay(earned.get(b.id))||'unknown';if(!map.has(day))map.set(day,[]);map.get(day).push(b)}let month='';grid.innerHTML=[...map].map(([day,items])=>{const next=day==='unknown'?'日期待追溯':day.slice(0,7);const heading=month!==next?'<h3 class="st-ach-timeline-month">'+esc(day==='unknown'?next:next.slice(0,4)+' 年 '+Number(next.slice(5,7))+' 月')+'</h3>':'';month=next;return heading+'<section class="st-ach-timeline-day"><div class="st-ach-timeline-date"><strong>'+esc(day==='unknown'?'未记录准确日期':Number(day.slice(5,7))+'月'+Number(day.slice(8))+'日')+'</strong><small>'+items.length+' 项成就</small></div><div class="st-ach-timeline-items">'+items.map(b=>tile(b,true)).join('')+'</div></section>'}).join('')}
  else grid.innerHTML=list.map(b=>tile(b)).join('');
 }
 async function toggleEdit(){if(busy)return;if(!editing){editing=true;filter.tab='owned';editMessage='';draw();return}busy=true;draw();try{if(options.onFavorites)await options.onFavorites([...favorites]);editing=false;editMessage=''}catch(_){editMessage='保存失败，请重试。'}finally{busy=false;draw()}}
 function choose(b){if(!b||busy)return;if(editing){if(!earned.has(b.id))return;if(favorites.includes(b.id))favorites=favorites.filter(x=>x!==b.id);else if(favorites.length<3)favorites.push(b.id);else{editMessage='最多选择3枚，先取消一枚即可更换。';draw();return}editMessage='';draw();return}if(demo)show(b,{evidence:demoEvidence(b)},{...opt,reveal:true,play:true});else show(b,earned.get(b.id),{...opt,play:false,pending:options.pending?.[b.id]})}
 root.querySelector('[data-tier-select]').onchange=e=>{filter.tier=e.target.value;draw()};
 root.querySelector('input[type=search]').oninput=e=>{filter.query=e.target.value.trim();draw()};
 sortEl.onchange=e=>{filter.sort=e.target.value;draw()};
 if(demo){root.querySelector('[data-reveal]').onchange=e=>{filter.reveal=e.target.checked;draw()};root.querySelector('[data-random]').onclick=()=>{const list=filtered();if(list.length){const b=list[Math.floor(Math.random()*list.length)];show(b,{evidence:demoEvidence(b)},{demo:true,reveal:true,play:true})}};root.querySelector('[data-tour]').onclick=()=>autoplay(filtered())}
 else{root.querySelector('[data-edit]').onclick=toggleEdit;root.querySelector('.st-ach-featured').onclick=e=>{const b=e.target.closest('[data-featured]');if(b)choose(B.get(b.dataset.featured));else if(e.target.closest('[data-add-favorite]')&&!editing)toggleEdit()};root.querySelector('.st-ach-tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b||editing)return;filter.tab=b.dataset.tab;if(filter.tab==='timeline')filter.sort='new';draw()}}
 grid.onclick=e=>{const tile=e.target.closest('[data-id]');if(tile)choose(B.get(tile.dataset.id))};draw();
}
function close(){if(dialog?.open)dialog.close();if(collectionDialog?.open)collectionDialog.close();stopTour();if(deck)deck.innerHTML='';if(controls)controls.innerHTML='';collectionDialog?.querySelector('.st-ach-collection-body')?.replaceChildren();shown=null;ack=null;returnFocus=null}
function openGallery(awards,opt={}){
 if(!collectionDialog){collectionDialog=document.createElement('dialog');collectionDialog.className='st-ach-collection-dialog';collectionDialog.setAttribute('aria-label','成就馆');collectionDialog.innerHTML='<div class="st-ach-collection-header"><button type="button" aria-label="返回账号页">‹ 返回</button><strong>成就馆</strong><small>Score Tracker</small></div><div class="st-ach-collection-body"></div>';document.body.append(collectionDialog);collectionDialog.querySelector('button').onclick=()=>collectionDialog.close()}
 if(dialog?.open)dialog.close();const body=collectionDialog.querySelector('.st-ach-collection-body');body.replaceChildren();const r=document.createElement('section');body.append(r);gallery(r,awards,false,opt);if(!collectionDialog.open)collectionDialog.showModal();
}
g.ScoreAchievementUI={emblem,gallery,show,autoplay,openGallery,close,rate,demoEvidence,conditionRows,summaries,awardDay,evidenceDay,dateLabel,rateInfo,favoriteIds,entryHTML};
})(window);
