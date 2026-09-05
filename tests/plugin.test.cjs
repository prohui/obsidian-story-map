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
      Plugin: class { async saveData() {} }, ItemView: class {}, Modal: class {},
      getLanguage: () => 'en',
      Notice: class { constructor(message) { notices.push(message); } },
      normalizePath: path => path,
    } : require(id),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../main.js'), 'utf8'), context);
  const Plugin = context.module.exports.default;
  const plugin = new Plugin();
  plugin.app = { vault: { adapter }, workspace: { getLeavesOfType: () => [] } };
  return { plugin, notices };
}

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
