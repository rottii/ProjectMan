const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const TARGET_DIR = path.join(__dirname, 'src', 'components');

// Helper to format string into a snake_case key
function formatKey(str) {
  return str.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

// Attributes to translate
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'alt', 'label'];

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (err) {
    console.error(`Parse error in ${filePath}:`, err.message);
    return;
  }

  let needsTranslation = false;
  let hasUseTranslationImport = false;
  let hasUseTranslationHook = false;
  let mainComponentPath = null;

  traverse(ast, {
    // 1. Find imports
    ImportDeclaration(path) {
      if (path.node.source.value === 'react-i18next') {
        const specifiers = path.node.specifiers;
        if (specifiers.some(s => s.imported && s.imported.name === 'useTranslation')) {
          hasUseTranslationImport = true;
        }
      }
    },

    // 2. Find hook usage
    VariableDeclarator(path) {
      if (
        t.isCallExpression(path.node.init) &&
        t.isIdentifier(path.node.init.callee, { name: 'useTranslation' })
      ) {
        hasUseTranslationHook = true;
      }
    },

    // 3. Find main component for hook injection
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (t.isFunctionDeclaration(decl) || t.isArrowFunctionExpression(decl)) {
        mainComponentPath = path.get('declaration');
      }
    },

    // 4. Transform JSXText
    JSXText(path) {
      const text = path.node.value;
      if (text.trim().length > 0 && /[a-zA-Z]/.test(text)) {
        const str = text.trim();
        const key = formatKey(str);
        
        if (key.length > 0 && !str.includes('{') && !str.includes('}')) {
          const tCall = t.callExpression(t.identifier('t'), [
            t.stringLiteral(key),
            t.stringLiteral(str)
          ]);
          path.replaceWith(t.jsxExpressionContainer(tCall));
          needsTranslation = true;
        }
      }
    },

    // 5. Transform JSX Attributes
    JSXAttribute(path) {
      const name = path.node.name.name;
      if (TRANSLATABLE_ATTRIBUTES.includes(name) && t.isStringLiteral(path.node.value)) {
        const str = path.node.value.value;
        if (str.trim().length > 0 && /[a-zA-Z]/.test(str)) {
          const key = formatKey(str);
          if (key.length > 0) {
            const tCall = t.callExpression(t.identifier('t'), [
              t.stringLiteral(key),
              t.stringLiteral(str)
            ]);
            path.node.value = t.jsxExpressionContainer(tCall);
            needsTranslation = true;
          }
        }
      }
    }
  });

  if (needsTranslation) {
    // Inject import if missing
    if (!hasUseTranslationImport) {
      const importDecl = t.importDeclaration(
        [t.importSpecifier(t.identifier('useTranslation'), t.identifier('useTranslation'))],
        t.stringLiteral('react-i18next')
      );
      ast.program.body.unshift(importDecl);
    }

    // Inject hook if missing
    if (!hasUseTranslationHook && mainComponentPath && mainComponentPath.node.body) {
      const body = mainComponentPath.node.body.body;
      if (Array.isArray(body)) {
        const hookDecl = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
            ]),
            t.callExpression(t.identifier('useTranslation'), [])
          )
        ]);
        body.unshift(hookDecl);
      }
    }

    // Regenerate code
    const output = generate(ast, { retainLines: false }, code);
    fs.writeFileSync(filePath, output.code, 'utf-8');
    console.log(`Translated: ${path.basename(filePath)}`);
  }
}

function run() {
  const files = fs.readdirSync(TARGET_DIR);
  let count = 0;
  for (const file of files) {
    if (file.endsWith('.jsx')) {
      // Exclude files that are too huge or might break
      if (file === 'KanbanBoard.jsx') {
        // We already did KanbanBoard manually
        continue;
      }
      const fullPath = path.join(TARGET_DIR, file);
      processFile(fullPath);
      count++;
    }
  }
  console.log(`Processed ${count} files.`);
}

run();
