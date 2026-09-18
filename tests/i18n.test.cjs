const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(require.resolve('../src/i18n.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function loadTs(name){const context={exports:{},require:id=>loadTs(id.replace('./',''))};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/'+name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);return context.exports;}
function translations(){return loadTs('i18n');}

test('automatic language detection and interpolation preserve user-supplied content',()=>{
  const {t,setLocale}=translations();
  setLocale('auto','en');assert.equal(t('状态：{0}',t('已规划')),'Status: Planned');
  assert.equal(t('角色：{0}','用户 {0} $&'),'Role: 用户 {0} $&');
  setLocale('auto','zh-CN');assert.equal(t('保存'),'保存');
  setLocale('auto','fr');assert.equal(t('保存'),'Enregistrer');
  setLocale('auto','pt-BR');assert.equal(t('保存'),'Save');
  setLocale('auto','zh-Hant');assert.equal(t('保存'),'儲存');
  setLocale('auto','zh_TW');assert.equal(t('保存'),'儲存');
  setLocale('auto','de-DE');assert.equal(t('保存'),'Speichern');
  setLocale('zh','en');assert.equal(t('保存'),'保存');
});

test('new editor controls follow the selected interface language',()=>{
  const {t,setLocale}=translations();
  const cases={
    'zh-TW':['任務顏色','圖片與檔案'],
    ja:['タスクの色','画像とファイル'],
    ko:['작업 색상','이미지와 파일'],
    de:['Aufgabenfarbe','Bilder und Dateien'],
    fr:['Couleur de la tâche','Images et fichiers'],
    es:['Color de la tarea','Imágenes y archivos'],
  };
  for(const [locale,[color,attachments]] of Object.entries(cases)){
    setLocale(locale);
    assert.equal(t('任务颜色'),color);
    assert.equal(t('图片和文件'),attachments);
  }
});

test('every locale covers every UI key with identical placeholders',()=>{
  const {english}=translations();
  const {dictionaries}=loadTs('locales');
  const tokens=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
  for(const [locale,dict] of Object.entries(dictionaries))for(const [key,value] of Object.entries(english)){
    assert.ok(dict[key],locale+': '+key);
    assert.deepEqual(tokens(dict[key]),tokens(value),locale+': '+key);
  }
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
