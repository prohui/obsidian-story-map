const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const ts=require('typescript');
const ctx={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/rich-content.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {toEditorMarkdown,fromEditorMarkdown,allowedLink}=ctx.exports;
test('wiki images, file aliases and code samples survive rich-editor link conversion',()=>{
 const raw='![[参考/页面 原型.png]]\n[[文档/依赖.pdf|接口定义]]\n`![[code.png]]`\n```md\n[[sample.md]]\n```';
 assert.equal(fromEditorMarkdown(toEditorMarkdown(raw)),raw);
});
test('link editing rejects executable URLs while accepting web and vault links',()=>{
 assert.equal(allowedLink('javascript:alert(1)'),undefined);assert.equal(allowedLink('data:text/html,script'),undefined);
 assert.equal(allowedLink('example.com'),'https://example.com');assert.equal(allowedLink('https://example.com'),'https://example.com');
 assert.equal(allowedLink('storymap-vault:Assets%2Ffile.pdf'),'storymap-vault:Assets%2Ffile.pdf');
});
