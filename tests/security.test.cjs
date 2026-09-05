const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('release bundle contains no dynamic code execution or script creation', () => {
  const source = ts.createSourceFile('main.js', fs.readFileSync(require.resolve('../main.js'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const findings = [];
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const expr = node.expression;
      const name = ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) ? expr.name.text : '';
      const args = node.arguments || [];
      if (name === 'eval' || name === 'Function') findings.push(name);
      if ((name === 'createElement' || name === 'createElementNS') && args.some(arg => ts.isStringLiteral(arg) && arg.text.toLowerCase() === 'script')) findings.push('script creation');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(findings, []);
});
