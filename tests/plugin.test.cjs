const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

function createPlugin(adapter = {}) {
  const notices = [];
  const context = {
    module: { exports: {} }, exports: {}, console, setTimeout, clearTimeout,
    setImmediate, Uint8Array, ArrayBuffer,
    require: id => id === 'obsidian' ? {
      Plugin: class {}, ItemView: class {}, Modal: class {},
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
  await plugin.exportXMind();
  const zip = await JSZip.loadAsync(output);
  const sheets = JSON.parse(await zip.file('content.json').async('string'));
  const branches = sheets[0].rootTopic.children.attached;
  assert.deepEqual(branches.map(branch => branch.title), ['用户旅程', '发布计划', '角色']);
  assert.equal(branches[1].children.attached.length, plugin.data.releases.length);
  assert.deepEqual(branches[0].children.attached[0].children.attached[0].children.attached[0].labels, ['访客']);
  const metadata = JSON.parse(await zip.file('metadata.json').async('string'));
  assert.equal(metadata.creator.version, require('../manifest.json').version);
});
