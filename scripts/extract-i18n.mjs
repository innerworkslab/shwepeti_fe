import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import ts from 'typescript'
const files = []
function walk(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name)
    if (d.isDirectory()) {
      if (!['__tests__', 'i18n'].includes(d.name)) walk(f)
    } else if (/\.(vue|ts)$/.test(f) && !f.endsWith('.test.ts')) files.push(f)
  }
}
walk('src')
const strings = new Set(JSON.parse(fs.readFileSync('src/i18n/source-strings.json', 'utf8')))
const clean = (s) => s.replace(/\s+/g, ' ').trim()
function add(s) {
  s = clean(s)
  if (/[A-Za-z]/.test(s) && s.length > 1) strings.add(s)
}
function scriptStrings(code) {
  const source = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true)
  function visit(n) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const s = n.text
      const p = n.parent
      if (
        (ts.isCallExpression(p) && p.expression.getText(source) === 't' && p.arguments[0] === n) ||
        (ts.isPropertyAssignment(p) &&
          ['label', 'title', 'caption', 'searchPlaceholder'].includes(
            p.name.getText(source).replace(/['"]/g, ''),
          )) ||
        (/^[A-Z][A-Za-z ,/'()&:#.?!…–-]+$/.test(s) && !s.includes('/api') && s.length > 2)
      )
        add(s)
    }
    ts.forEachChild(n, visit)
  }
  visit(source)
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor } = parse(source)
    if (descriptor.scriptSetup) scriptStrings(descriptor.scriptSetup.content)
    if (descriptor.template) {
      const ast = baseParse(descriptor.template.content)
      function visit(n) {
        if (n.type === 2) add(n.content)
        if (n.type === 5) scriptStrings(n.content.content)
        for (const p of n.props ?? []) {
          if (
            p.type === 6 &&
            [
              'placeholder',
              'title',
              'aria-label',
              'caption',
              'search-placeholder',
              'label',
              'alt',
            ].includes(p.name) &&
            p.value
          )
            add(p.value.content)
          if (
            p.type === 7 &&
            p.exp &&
            ['title', 'aria-label', 'placeholder', 'caption', 'label'].includes(p.arg?.content)
          )
            scriptStrings(p.exp.content)
        }
        for (const c of n.children ?? []) visit(c)
      }
      visit(ast)
    }
  } else scriptStrings(source)
}
fs.writeFileSync(
  'src/i18n/source-strings.json',
  JSON.stringify([...strings].sort(), null, 2) + '\n',
)
console.log(strings.size)
