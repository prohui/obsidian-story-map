const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(require.resolve('../src/i18n.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function translations(){const context={exports:{}};vm.runInNewContext(code,context);return context.exports;}

test('automatic language detection and interpolation preserve user-supplied content',()=>{
  const {t,setLocale}=translations();
  setLocale('auto','en');assert.equal(t('状态：{0}',t('已规划')),'Status: Planned');
  assert.equal(t('角色：{0}','用户 {0} $&'),'Role: 用户 {0} $&');
  setLocale('auto','zh-CN');assert.equal(t('保存'),'保存');
  setLocale('auto','fr');assert.equal(t('保存'),'Save');
  setLocale('zh','en');assert.equal(t('保存'),'保存');
});

test('all explicit UI translation keys have nonempty English translations',()=>{
  const {english}=translations();
  const main=fs.readFileSync(require.resolve('../src/main.ts'),'utf8');
  const file=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true);
  const missing=[];
  function visit(node){
    if(ts.isCallExpression(node)&&node.expression.getText(file)==='t'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
      const key=node.arguments[0].text;
      if(!english[key])missing.push(key);
    }
    ts.forEachChild(node,visit);
  }
  visit(file);assert.deepEqual(missing,[]);
});
