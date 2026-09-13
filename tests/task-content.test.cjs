const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/task-content.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {renameTaskFiles,taskImage}=context.exports;

test('folder renames keep embedded images and dependency files linked without changing similarly named folders',()=>{
 const task={description:'![[Assets/a.png|300]]\n[[Assets/spec.pdf#section]]\n[[Assets-old/b.png]]',attachments:[{path:'Assets/a.png',kind:'reference'},{path:'Assets/spec.pdf',kind:'dependency'},{path:'Assets-old/b.png',kind:'reference'}]};
 assert.equal(renameTaskFiles(task,'Assets','Project/Images'),true);
 assert.equal(task.description,'![[Project/Images/a.png|300]]\n[[Project/Images/spec.pdf#section]]\n[[Assets-old/b.png]]');
 assert.equal(task.attachments[1].path,'Project/Images/spec.pdf');assert.equal(task.attachments[1].kind,'dependency');
 assert.equal(task.attachments[2].path,'Assets-old/b.png');
 assert.equal(renameTaskFiles(task,'missing.png','new.png'),false);
});
test('legacy tasks need no migration and non-image files are linked rather than embedded',()=>{
 assert.equal(renameTaskFiles({id:'old',title:'Old task'},'A','B'),false);
 assert.equal(taskImage('截图.PNG'),true);assert.equal(taskImage('report.pdf'),false);assert.equal(taskImage('image.png.exe'),false);
});
