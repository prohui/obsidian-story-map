const {test,after,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const esbuild=require('esbuild');
const dom=new JSDOM('<!doctype html><html><head></head><body class="theme-dark"></body></html>',{url:'https://test.local',pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','Element','Node','Text','ShadowRoot','MutationObserver','DOMParser','Event','MouseEvent','KeyboardEvent','SVGElement','HTMLInputElement','HTMLTextAreaElement','DocumentFragment']) Object.defineProperty(global,name,{value:dom.window[name],configurable:true});
global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);global.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
global.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
dom.window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
dom.window.createEl=tag=>document.createElement(tag);document.win=dom.window;
global.createEl=tag=>document.createElement(tag);
global.MessageChannel=class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:()=>queueMicrotask(()=>this.port1.onmessage?.({})),close(){}};}};
global.IS_REACT_ACT_ENVIRONMENT=true;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'story-map-react-tests-'));
esbuild.buildSync({entryPoints:[path.join(__dirname,'ui/entry.ts')],bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'app.cjs'),alias:{obsidian:path.join(__dirname,'ui/obsidian-stub.ts'),'resize-observer-polyfill':path.join(__dirname,'../src/native-resize-observer.ts')},define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
const ui=require(path.join(dir,'app.cjs'));ui.setLocale('zh');
after(()=>{dom.window.close();fs.rmSync(dir,{recursive:true,force:true});});
const mounted=new Set();
afterEach(async()=>{for(const root of mounted)await ui.act(async()=>root.unmount());mounted.clear();document.body.replaceChildren();});
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
async function fixture(kind='task',entity={id:'t',activityId:'a',title:'Task'},files=[]) {
 const mock=ui.createFixtureApp();for(const path of files)mock.files.set(path,new ui.TFile(path));const container=document.createElement('div');document.body.append(container);const root=ui.createRoot(container);mounted.add(root);const saved=[];let busy=false,closed=false,fail=false;
 await ui.act(async()=>{root.render(ui.createElement(ui.DetailEditorApp,{app:mock.app,sourcePath:'Map.storymap',entity,kind,creating:false,onBusy:v=>busy=v,onClose:()=>closed=true,onSave:async draft=>{if(fail)return false;saved.push(draft);return true;}}));await tick();});
 return {...mock,container,saved,get busy(){return busy;},get closed(){return closed;},set fail(v){fail=v;},button(label){return [...container.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===label||el.textContent.replace(/\s/g,'')===label);},async click(button){assert.ok(button);await ui.act(async()=>{button.dispatchEvent(new MouseEvent('click',{bubbles:true}));await tick();});},async close(){await ui.act(async()=>root.unmount());mounted.delete(root);container.remove();}};
}

test('Task renders a real contenteditable editor; colors save and theme reset preserves legacy Markdown',async()=>{
 const original='## 原始标题\n\n**原样保留**';const f=await fixture('task',{id:'t',activityId:'a',title:'Task',description:original});
 assert.ok(f.container.querySelector('[contenteditable="true"] h2'));assert.equal(f.container.querySelector('textarea'),null);
 assert.equal(f.button('预览'),undefined);await f.click(f.button('蓝色'));assert.equal(f.button('蓝色').getAttribute('aria-pressed'),'true');
 await f.click(f.button('保存'));assert.equal(f.saved[0].color,'blue');assert.equal(f.saved[0].description,original);
 await f.close();
 const reopened=await fixture('task',{id:'t',activityId:'a',...f.saved[0]});await reopened.click(reopened.button('跟随主题'));await reopened.click(reopened.button('保存'));assert.equal(reopened.saved[0].color,undefined);await reopened.close();
});

test('Activity supports WYSIWYG image paste, attachments, and save retry without duplication',async()=>{
 const f=await fixture('activity',{id:'a',title:'Activity',description:'## 目标\n\n说明'});
 const editor=f.container.querySelector('[contenteditable="true"]');assert.ok(editor);assert.equal(f.button('蓝色'),undefined);
 const paste=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{getData:()=>'',files:[{name:'reference.png',arrayBuffer:async()=>new Uint8Array([1,2]).buffer}]}});
 await ui.act(async()=>{editor.dispatchEvent(paste);await tick();});assert.equal(paste.defaultPrevented,true);assert.equal(f.writes.length,1);assert.ok(editor.querySelector('img'));assert.equal(editor.lastElementChild.tagName,'P','a paragraph remains after an imported image for continued typing');
 f.fail=true;await f.click(f.button('保存'));assert.equal(f.closed,false);assert.equal(f.busy,false);assert.match(f.container.textContent,/保存失败/);
 f.fail=false;await f.click(f.button('保存'));assert.match(f.saved[0].description,/!\[\[Assets\/reference.png\]\]/);assert.equal(f.saved[0].attachments.length,1);assert.equal(f.writes.length,1);await f.close();
});

test('existing file embeds and task checkboxes round trip as editable content; cancellation does not save',async()=>{
 const f=await fixture('task',{id:'t',activityId:'a',title:'Task',description:'- [ ] 验收\n\n![[Assets/mock.png]]',attachments:[]});
 const editor=f.container.querySelector('[contenteditable="true"]');assert.ok(editor.querySelector('img'));assert.ok(editor.querySelector('input[type="checkbox"]'));
 await f.click(editor.querySelector('input[type="checkbox"]'));await f.click(f.button('保存'));assert.match(f.saved[0].description,/- \[x\]/);assert.match(f.saved[0].description,/!\[\[Assets\/mock.png\]\]/);await f.close();
 const cancelled=await fixture('activity',{id:'a',title:'A'});await cancelled.click(cancelled.button('取消'));assert.equal(cancelled.saved.length,0);assert.equal(cancelled.closed,true);await cancelled.close();
});


test('relative Markdown images resolve vault files and keep their source after text edits',async()=>{
 const f=await fixture('task',{id:'t',activityId:'a',title:'Task',description:'- [ ] Review\n\n![reference](Assets/reference%20image.png)'},['Assets/reference image.png']);
 const editor=f.container.querySelector('[contenteditable="true"]');
 assert.match(editor.querySelector('img').getAttribute('src'),/reference%20image.png/);
 await f.click(editor.querySelector('input[type="checkbox"]'));await f.click(f.button('保存'));
 assert.match(f.saved[0].description,/Assets\/reference%20image.png/);assert.match(f.saved[0].description,/- \[x\]/);await f.close();
});

test('custom Task colors reopen and save without losing the hex value',async()=>{
 const f=await fixture('task',{id:'t',activityId:'a',title:'Custom',color:'#123456'});
 assert.equal(f.container.querySelector('input[type="color"]').value,'#123456');
 assert.ok(f.button('红色'));assert.ok(f.button('灰色'));
 await f.click(f.button('保存'));assert.equal(f.saved[0].color,'#123456');await f.close();
});
