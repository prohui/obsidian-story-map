const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/save-file.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {exportFilename,pickExportFile,writeExportFile}=context.exports;
test('save picker uses correct extension and a stable last-directory ID',async()=>{
  let options;const handle={name:'Selected.json'};
  assert.equal(await pickExportFile({showSaveFilePicker:async value=>{options=value;return handle;}},'Map.png','json'),handle);
  assert.equal(options.suggestedName,'Map.json');assert.equal(options.id,'story-map-export');
  assert.equal(exportFilename('../中文/地图.pdf','png'),'..-中文-地图.png');
  assert.equal(exportFilename(' ... ','pdf'),'Story Map.pdf');
});
test('cancelling picker yields no handle while permission errors propagate',async()=>{
  assert.equal(await pickExportFile({showSaveFilePicker:async()=>{throw {name:'AbortError'};}},'Map','png'),null);
  await assert.rejects(pickExportFile({showSaveFilePicker:async()=>{throw Error('permission');}},'Map','png'),/permission/);
});
test('selected file is committed only after write succeeds; failures abort',async()=>{
  const events=[];
  const handle={name:'Map.png',createWritable:async()=>({write:async()=>events.push('write'),close:async()=>events.push('close'),abort:async()=>events.push('abort')})};
  assert.equal(await writeExportFile(handle,new ArrayBuffer(2)),'Map.png');assert.deepEqual(events,['write','close']);
  events.length=0;handle.createWritable=async()=>({write:async()=>{throw Error('disk');},close:async()=>events.push('close'),abort:async()=>events.push('abort')});
  await assert.rejects(writeExportFile(handle,new ArrayBuffer(2)),/disk/);assert.deepEqual(events,['abort']);
});
