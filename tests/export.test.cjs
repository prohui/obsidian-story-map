const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{},TextEncoder,Uint8Array,require:()=>({t:(s)=>s})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/export.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {imagePdf,wrapText,renderMap}=context.exports;
test('PDF has correct binary stream length, page ratio, and cross-reference offsets',()=>{
  const jpeg=Uint8Array.from([255,216,255,224,0,16,0,255,217]);
  const pdf=Buffer.from(imagePdf(jpeg,2000,1000));
  const text=pdf.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text,/\/MediaBox \[0 0 1500.00 750.00\]/);
  assert.match(text,/\/Length 9 >>\nstream/);
  assert.ok(pdf.includes(Buffer.from(jpeg)));
  const xref=Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xref,xref+4),'xref');
  const lines=text.slice(xref).split('\n');
  for(let id=1;id<=5;id++){const offset=Number(lines[id+2].slice(0,10));assert.equal(text.slice(offset,offset+7),`${id} 0 obj`);}
});
test('wrapping handles Unicode and line breaks without losing characters',()=>{
  const result=wrapText({measureText:s=>({width:Array.from(s).length*10})},'中文🙂abc\n日本語',30);
  assert.equal(result.join(''),'中文🙂abc日本語');assert.ok(result.every(s=>Array.from(s).length<=3));
});
test('oversized visual export rejects before allocating a large canvas',async()=>{
  const canvas={remove:()=>{},getContext:()=>({measureText:s=>({width:s.length*10})})};
  const data={title:'Large',activities:Array.from({length:100},(_,i)=>({id:String(i),title:'Activity'})),tasks:[],releases:[],stories:[],roles:[]};
  await assert.rejects(renderMap(data,{fonts:{ready:Promise.resolve()},body:{createEl:()=>canvas}}),/地图过大/);
  assert.equal(canvas.width,undefined);
});
