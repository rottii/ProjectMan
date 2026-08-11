const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const TARGET_DIR = path.join(__dirname, 'src', 'components');
const result = {};

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (err) {
    return;
  }

  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.name === 't' && path.node.arguments.length >= 2) {
        const keyNode = path.node.arguments[0];
        const valNode = path.node.arguments[1];
        if (keyNode.type === 'StringLiteral' && valNode.type === 'StringLiteral') {
          result[keyNode.value] = valNode.value;
        }
      }
    }
  });
}

const files = fs.readdirSync(TARGET_DIR);
for (const file of files) {
  if (file.endsWith('.jsx')) {
    processFile(path.join(TARGET_DIR, file));
  }
}

fs.writeFileSync(path.join(__dirname, 'extracted_keys.json'), JSON.stringify(result, null, 2));
console.log('Extracted keys saved to extracted_keys.json');
