import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const [html, css, app, filter, orbitMotion] = await Promise.all([
  readFile(new URL('index.html', import.meta.url), 'utf8'),
  readFile(new URL('styles.css', import.meta.url), 'utf8'),
  readFile(new URL('app.js', import.meta.url), 'utf8'),
  readFile(new URL('filterArticles.mjs', import.meta.url), 'utf8'),
  readFile(new URL('orbitMotion.mjs', import.meta.url), 'utf8')
])

const inlineOrbitMotion = orbitMotion.replaceAll('export function', 'function').replaceAll('export const', 'const')
const inlineAppSource = app
  .replace("import { filterArticles } from './filterArticles.mjs'", '')
  .replace(/import \{[\s\S]*?\} from '\.\/orbitMotion\.mjs'\n/, '')
const inlineApp = `${filter.replace('export function', 'function')}\n${inlineOrbitMotion}\n${inlineAppSource}`
const standalone = html
  .replace('<link rel="stylesheet" href="./styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="./app.js"></script>', `<script type="module">\n${inlineApp}\n</script>`)

await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/index.html', import.meta.url), standalone)
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../glenn-blog-demo.html', import.meta.url))
console.log(`Built ${standalone.length} bytes to dist/index.html and glenn-blog-demo.html`)
