// Generate a sample through the production exporter for manual XMind validation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-map-xmind-'));
const context = {
  module: { exports: {} }, exports: {}, console, setTimeout, clearTimeout,
  setImmediate, Uint8Array, ArrayBuffer,
  require: id => id === 'obsidian' ? {
    Plugin: class {}, FileView: class {}, Modal: class {}, FuzzySuggestModal: class {},
    Notice: class {}, normalizePath: value => value,
  } : require(id),
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), context);
const plugin = new context.module.exports.default();
plugin.data.title = '故事地图导出验收';
plugin.data.stories[0].roleId = 'visitor';
plugin.app = { vault: { adapter: {
  exists: async value => value === '故事地图导出',
  writeBinary: async (value, bytes) => {
    const target = path.join(outputDir, path.basename(value));
    fs.writeFileSync(target, Buffer.from(bytes));
    console.log(target);
  },
} } };
plugin.exportXMind().catch(error => { console.error(error); process.exitCode = 1; });
