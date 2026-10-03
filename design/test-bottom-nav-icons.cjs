const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('app-v3.js'),stats=read('app-v32.js'),bundle=read('app-bundle.js'),styles=read('styles.css');

for(const name of ['home','records','stats','account']){
  assert(source.includes(`${name}: '<svg`),`missing ${name} icon`);
  assert(bundle.includes(`${name}: '<svg`),`bundle missing ${name} icon`);
}
assert(source.includes('class="nav-icon" aria-hidden="true">${navIcon(p)}'));
assert(source.includes('aria-current="page"'));
assert(stats.includes("navIcon('stats')"));
assert(stats.includes('setAttribute("aria-current","page")'));
assert(styles.includes('.bottom-nav .nav-icon{width:22px;height:22px;display:block}'));
assert(!styles.includes('.bottom-nav button span:first-child{font-size:19px}'));
assert(!source.includes("bottomButton('records', '▤'"));
assert(!stats.includes("<span>▦</span>"));
console.log('Bottom navigation: consistent SVG icons, active semantics, bundle output and mobile sizing passed');
