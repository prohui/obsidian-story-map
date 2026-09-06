const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

function createPlugin(adapter = {}) {
  const notices = [];
  const context = {
    module: { exports: {} }, exports: {}, console, setTimeout, clearTimeout,
    setImmediate, Uint8Array, ArrayBuffer, TextEncoder,
    require: id => id === 'obsidian' ? {
      Plugin: class { constructor(app, manifest) { this.app=app; this.manifest=manifest; } async saveData() {} registerExtensions() {} registerEvent() {} }, FileView: class {}, Modal: class {}, FuzzySuggestModal: class {},
      getLanguage: () => 'en',
      Notice: class { constructor(message) { notices.push(message); } },
      normalizePath: path => path,
    } : require(id),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../main.js'), 'utf8'), context);
  const Plugin = context.module.exports.default;
  const plugin = new Plugin();
  plugin.app = { vault: { adapter, on:()=>({}) }, workspace: { getLeavesOfType: () => [], on:()=>({}) } };
  return { plugin, notices };
}

test('modal save failure rolls back creation and edits; retry creates exactly once', async()=>{
  let fail=true;
  const {plugin}=createPlugin({write:async()=>{if(fail)throw Error('disk full');}});
  const release=plugin.data.releases[0], title=release.title, count=plugin.data.activities.length;
  const action=()=>{release.title='Edited';plugin.data.activities.push({id:'new',title:'New'});};
  assert.equal(await plugin.commitModal(action),false);
  assert.equal(release.title,title);assert.equal(plugin.data.activities.length,count);
  fail=false;assert.equal(await plugin.commitModal(action),true);
  assert.equal(plugin.data.activities.length,count+1);assert.equal(release.title,'Edited');
  plugin.undo();assert.equal(plugin.data.activities.length,count);
});

test('multiple maps isolate data, preserve legacy, duplicate and archive safely', async () => {
  const files = new Map(); const folders = new Set();
  const {plugin} = createPlugin({exists:async p=>files.has(p)||folders.has(p), mkdir:async p=>folders.add(p), read:async p=>{if(!files.has(p))throw Error('missing');return files.get(p)}, write:async(p,v)=>files.set(p,v), list:async()=>({files:[...files.keys()].filter(p=>p.startsWith('.story-maps/'))})});
  plugin.data.title='Original'; await plugin.commit(false); const original=files.get('.story-map.json');
  await plugin.createMap('Blank','blank'); const blank=plugin.mapPath;
  assert.equal(plugin.data.stories.length,0); assert.equal(files.get('.story-map.json'),original);
  plugin.data.roles.push({id:'test',name:'Unique',description:''}); await plugin.commit();
  await plugin.createMap('Copy','copy'); assert.notEqual(plugin.mapPath,blank); assert.equal(plugin.data.roles[0].name,'Unique');
  await plugin.switchMap('.story-map.json'); assert.equal(plugin.data.title,'Original');
  await plugin.archiveMap(blank,true); assert.equal(JSON.parse(files.get(blank)).archived,true);
  await plugin.archiveMap(blank,false); assert.equal(JSON.parse(files.get(blank)).archived,false);
  await assert.rejects(plugin.switchMap('../outside.json'));
  assert.equal((await plugin.listMaps()).length,3);
});

test('failed save prevents map creation or switch; corrupt target preserves current data', async()=>{
  let fail=false;const files=new Map();
  const {plugin}=createPlugin({exists:async p=>files.has(p),read:async p=>files.get(p),write:async(p,v)=>{if(fail)throw Error('disk');files.set(p,v)}});
  const before=JSON.stringify(plugin.data); fail=true;
  await assert.rejects(plugin.createMap('Blocked','blank')); assert.equal(plugin.mapPath,'.story-map.json');
  fail=false;files.set('.story-maps/broken.json','{}');
  await assert.rejects(plugin.switchMap('.story-maps/broken.json')); assert.equal(JSON.stringify(plugin.data),before);
});

test('JSON export preserves full map data and numbers concurrent filenames', async () => {
  const files = new Map();
  const {plugin}=createPlugin({exists:async path=>path==='Story Map Exports'||files.has(path),writeBinary:async(path,bytes)=>files.set(path,Buffer.from(bytes).toString('utf8'))});
  const original=JSON.stringify(plugin.data);
  await Promise.all([plugin.exportMap('json',{}),plugin.exportMap('json',{})]);
  assert.equal(files.size,2);
  assert.ok([...files.keys()].some(path=>path.endsWith('-2.json')));
  for(const content of files.values()) assert.deepEqual(JSON.parse(content),JSON.parse(original));
  assert.equal(JSON.stringify(plugin.data),original);
});

test('new storymap files start with an independent complete template', async()=>{
  const {plugin}=createPlugin(); const files=new Map(); let opened;
  const original=JSON.stringify(plugin.data);
  plugin.app.vault.create=async(path,payload)=>{if(files.has(path))throw Error('exists');files.set(path,payload);return {path};};
  plugin.app.workspace.getLeaf=()=>({openFile:async file=>{opened=file.path;}});
  const folder={path:'Projects',isRoot:()=>false};
  await plugin.createMapFile(folder,'First',true);
  const data=JSON.parse(files.get('Projects/First.storymap'));
  assert.equal(opened,'Projects/First.storymap');assert.equal(data.title,'First');
  for(const key of ['activities','tasks','stories','roles','releases'])assert.ok(data[key].length>0,key);
  for(const story of data.stories){
    assert.ok(data.tasks.some(task=>task.id===story.taskId && task.activityId===story.activityId));
    assert.ok(data.releases.some(release=>release.id===story.releaseId));
    assert.equal(story.notePath,undefined);assert.equal(story.status,'planned');
  }
  await plugin.createMapFile(folder,'Second');
  const starter=JSON.parse(files.get('Projects/Second.storymap'));
  assert.equal(starter.activities.length,1);assert.equal(starter.tasks.length,1);
  assert.equal(starter.releases.length,1);assert.equal(starter.stories.length,0);assert.equal(starter.roles.length,0);
  assert.equal(JSON.stringify(plugin.data),original);
  await assert.rejects(plugin.createMapFile(folder,'First'),/exists/);
  assert.equal(JSON.parse(files.get('Projects/First.storymap')).title,'First');
});

test('storymap file sessions are isolated and follow renamed file handles', async()=>{
  const {plugin}=createPlugin();
  const a={path:'A.storymap'},b={path:'B.storymap'};const files=new Map([[a,JSON.stringify(plugin.data)],[b,JSON.stringify(plugin.data)]]);
  plugin.app.vault.read=async f=>files.get(f);
  plugin.app.vault.modify=async(f,payload)=>files.set(f,payload);
  plugin.app.vault.process=async(f,fn)=>{const next=fn(files.get(f));files.set(f,next);};
  plugin.app.vault.getAbstractFileByPath=p=>[a,b].find(f=>f.path===p);
  const sa=await plugin.fileSession(a), sb=await plugin.fileSession(b);
  assert.equal(await plugin.fileSession(a),sa);assert.notEqual(sa,sb);
  a.path='Moved/A.storymap';sa.data.title='Only A';await sa.commit();
  assert.equal(JSON.parse(files.get(a)).title,'Only A');assert.notEqual(JSON.parse(files.get(b)).title,'Only A');assert.equal(sa.mapPath,a.path);
  files.set(a,JSON.stringify({...JSON.parse(files.get(a)),title:'External'}));
  sa.data.title='Local';assert.equal(await sa.commit(),false);
  assert.equal(JSON.parse(files.get(a)).title,'External');
  plugin.app.vault.getAbstractFileByPath=()=>null;
  assert.equal(await sa.commit(),false);
});

test('external changes reload clean sessions and conflict recovery preserves both versions',async()=>{
  const {plugin}=createPlugin();const file={path:'A.storymap'};let disk=JSON.stringify(plugin.data);const backups=[];
  plugin.app.vault.read=async()=>disk;
  plugin.app.vault.create=async(path,raw)=>{backups.push({path,raw});return {path};};
  const session=await plugin.fileSession(file);
  disk=JSON.stringify({...plugin.data,title:'External one'});await session.refreshExternal();
  assert.equal(session.data.title,'External one');
  session.data.title='Local';disk=JSON.stringify({...plugin.data,title:'External two'});
  await session.refreshExternal();assert.equal(session.conflicted,true);
  await session.resolveConflict();assert.equal(session.data.title,'External two');
  assert.equal(JSON.parse(backups[0].raw).title,'Local');assert.equal(JSON.parse(disk).title,'External two');
});

test('note rename updates unopened maps and respects path boundaries',async()=>{
  const {plugin}=createPlugin({write:async()=>{}});const file={path:'A.storymap',extension:'storymap'};
  const data=JSON.parse(JSON.stringify(plugin.data));data.stories[0].notePath='Folder/Note.md';data.stories[1].notePath='Folder2/Other.md';
  let disk=JSON.stringify(data);plugin.app.vault.getFiles=()=>[file];plugin.app.vault.process=async(_,fn)=>{disk=fn(disk);};
  await plugin.updateNotePaths('Folder','Moved');
  assert.equal(JSON.parse(disk).stories[0].notePath,'Moved/Note.md');
  assert.equal(JSON.parse(disk).stories[1].notePath,'Folder2/Other.md');
});

test('failed export does not poison the next export or modify source data',async()=>{
  let fail=true;
  const {plugin}=createPlugin({exists:async()=>true,writeBinary:async()=>{}});
  plugin.app.vault.adapter.exists=async path=>path==='Story Map Exports';
  plugin.app.vault.adapter.writeBinary=async()=>{if(fail)throw Error('disk full');};
  const original=JSON.stringify(plugin.data);
  await assert.rejects(plugin.exportMap('json',{}),/disk full/);
  fail=false;await plugin.exportMap('json',{});
  assert.equal(JSON.stringify(plugin.data),original);
});

test('all eight languages initialize translated samples, export, and preserve existing data', async () => {
  const cases = { en: 'Account access journey', zh: '进入系统的用户旅程', 'zh-TW': '進入系統的使用者旅程', ja: 'システムアクセスのユーザージャーニー', ko: '시스템 접속 사용자 여정', de: 'Nutzerreise zum Systemzugang', fr: 'Parcours d’accès au compte', es: 'Recorrido de acceso a la cuenta' };
  for (const [locale, title] of Object.entries(cases)) {
    let output;
    const {plugin}=createPlugin({exists:async()=>false,writeBinary:async(_,bytes)=>{output=bytes;}});
    plugin.app.vault.createFolder=async()=>{};
    await plugin.changeLanguage(locale);
    await plugin.loadMap();
    assert.equal(plugin.data.title,title);
    assert.equal(plugin.data.stories.length,13);
    const snapshot=JSON.stringify(plugin.data);
    await plugin.exportXMind();
    const zip=await JSZip.loadAsync(output);
    const content=JSON.parse(await zip.file('content.json').async('string'));
    assert.equal(content[0].title,title);
    assert.equal(content[0].rootTopic.children.attached.length,3);
    await plugin.changeLanguage(locale==='en'?'zh':'en');
    assert.equal(JSON.stringify(plugin.data),snapshot);
    plugin.app.vault.adapter={exists:async()=>true,read:async()=>snapshot};
    await plugin.loadMap();
    assert.equal(JSON.stringify(plugin.data),snapshot);
  }
});

test('saved language preferences are restored before initializing a fresh map', async () => {
  for (const language of ['zh-TW','ja','ko','de','fr','es','en','zh','auto','invalid']) {
    const {plugin}=createPlugin({exists:async()=>false});
    plugin.loadData=async()=>({language});
    plugin.registerView=()=>{};plugin.addRibbonIcon=()=>{};plugin.addCommand=()=>{};
    await plugin.onload();
    assert.equal(plugin.language,language==='invalid'?'auto':language);
    assert.ok(plugin.data.title);
  }
});

test('overlapping edits are written sequentially with the latest edit last', async () => {
  const writes = [];
  const { plugin } = createPlugin({ write: async (_, text) => {
    await new Promise(resolve => setTimeout(resolve, 5));
    writes.push(JSON.parse(text).title);
  } });
  plugin.data.title = 'first'; const first = plugin.commit();
  plugin.data.title = 'second'; const second = plugin.commit();
  await Promise.all([first, second]);
  assert.deepEqual(writes, ['first', 'second']);
  assert.match(plugin.saveStatus, /已保存/);
});

test('failed saves retain edits and can be retried', async () => {
  let fail = true;
  const { plugin, notices } = createPlugin({ write: async () => { if (fail) throw Error('disk'); } });
  plugin.data.title = 'keep this';
  await plugin.commit();
  assert.match(plugin.saveStatus, /失败/);
  assert.equal(plugin.data.title, 'keep this');
  assert.equal(notices.length, 1);
  fail = false; await plugin.commit(false);
  assert.match(plugin.saveStatus, /已保存/);
});

test('loading a modified legacy demo preserves content and migrates one role', async () => {
  let writes = 0;
  const { plugin } = createPlugin();
  const data = JSON.parse(JSON.stringify(plugin.data));
  data.title = '用户登录流程';
  data.activities[0].id = 'auth';
  data.stories[0].title = 'user-edited story';
  data.stories[0].roleIds = ['visitor', 'member'];
  plugin.app.vault.adapter = { exists: async () => true, read: async () => JSON.stringify(data), write: async () => writes++ };
  await plugin.loadMap();
  assert.equal(plugin.data.stories[0].title, 'user-edited story');
  assert.equal(plugin.data.stories[0].roleId, 'visitor');
  assert.equal(plugin.data.stories[0].roleIds, undefined);
  assert.equal(writes, 0);
});

test('unreadable map never gets overwritten by fallback sample data', async () => {
  let writes = 0;
  const { plugin } = createPlugin({ exists: async () => true, read: async () => '{invalid', write: async () => writes++ });
  await plugin.loadMap(); await plugin.commit();
  assert.equal(writes, 0);
  assert.match(plugin.saveStatus, /读取失败/);
});

test('undo and redo restore saved edits', async () => {
  const { plugin } = createPlugin({ write: async () => {} });
  const original = plugin.data.title;
  plugin.data.title = 'edited'; await plugin.commit();
  plugin.undo(); await plugin.saveQueue;
  assert.equal(plugin.data.title, original);
  plugin.redo(); await plugin.saveQueue;
  assert.equal(plugin.data.title, 'edited');
});

test('XMind archive includes journey, milestones and single-role story labels', async () => {
  let output;
  const { plugin } = createPlugin({ exists: async path => path === '故事地图导出', writeBinary: async (_, bytes) => { output = bytes; } });
  plugin.data.stories[0].roleId = 'visitor';
  await plugin.changeLanguage('zh');
  await plugin.exportXMind();
  const zip = await JSZip.loadAsync(output);
  const sheets = JSON.parse(await zip.file('content.json').async('string'));
  const branches = sheets[0].rootTopic.children.attached;
  assert.deepEqual(branches.map(branch => branch.title), ['用户旅程', '发布计划', '角色']);
  assert.equal(branches[1].children.attached.length, plugin.data.releases.length);
  assert.deepEqual(branches[0].children.attached[0].children.attached[0].children.attached[0].labels, ['Visitor']);
  const note = branches[0].children.attached[0].children.attached[0].children.attached[0].notes.plain.content;
  assert.match(note, /状态：已规划/);
  assert.match(note, /优先级：高/);
  assert.match(note, /关联笔记：Stories\/Sign up with email.md/);
  const metadata = JSON.parse(await zip.file('metadata.json').async('string'));
  assert.equal(metadata.creator.version, require('../manifest.json').version);
});

test('English and automatic language exports translate labels, never story content', async () => {
  let output;
  const { plugin } = createPlugin({ exists: async path => path === 'Story Map Exports', writeBinary: async (_, bytes) => { output = bytes; } });
  const original = JSON.stringify(plugin.data);
  await plugin.changeLanguage('en');
  await plugin.exportXMind();
  let zip = await JSZip.loadAsync(output);
  let sheets = JSON.parse(await zip.file('content.json').async('string'));
  const branches = sheets[0].rootTopic.children.attached;
  assert.deepEqual(branches.map(branch => branch.title), ['User journey', 'Release plan', 'Roles']);
  const story = branches[0].children.attached[0].children.attached[0].children.attached[0];
  assert.equal(story.title, 'Sign up with email');
  assert.match(story.notes.plain.content, /Status: Planned/);
  assert.match(story.notes.plain.content, /Priority: High/);
  await plugin.changeLanguage('auto');
  await plugin.exportXMind();
  zip = await JSZip.loadAsync(output);
  sheets = JSON.parse(await zip.file('content.json').async('string'));
  assert.equal(sheets[0].rootTopic.children.attached[0].title, 'User journey');
  assert.equal(JSON.stringify(plugin.data), original);
});
