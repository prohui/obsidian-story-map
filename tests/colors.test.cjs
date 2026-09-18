const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/task-colors.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {normalizeHex,isTaskColor,colorBackground,colorInk,taskColors}=context.exports;
test('eight presets and safe custom hex colors round trip',()=>{
 assert.equal(Object.keys(taskColors).length,8);
 for(const value of ['red','gray','blue','#abc','#AABBCC']) assert.equal(isTaskColor(value),true);
 assert.equal(normalizeHex('#AbC'),'#aabbcc');
 assert.equal(colorBackground('#123456'),'#123456');
 for(const value of ['url(example)','__proto__','#12345','#12345678','red;display:none'])assert.equal(isTaskColor(value),false);
});
test('custom dark and light backgrounds choose readable text',()=>{
 assert.equal(colorInk('#000000'),'#ffffff');
 assert.equal(colorInk('#ffffff'),'#20242b');
});
