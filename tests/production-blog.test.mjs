import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('production identity and canonical domain are configured', async () => {
  const config = await read('../src/config/site.mjs')
  const astro = await read('../astro.config.mjs')
  const cname = await read('../public/CNAME')
  assert.match(config, /Glenn — Study in public/)
  assert.match(config, /https:\/\/blog\.minglingyun\.com/)
  assert.match(astro, /site: 'https:\/\/blog\.minglingyun\.com'/)
  assert.equal(cname.trim(), 'blog.minglingyun.com')
})

test('standard blog discovery, error, archive, tag and deployment surfaces exist', async () => {
  const rss = await read('../src/pages/rss.xml.js')
  const robots = await read('../public/robots.txt')
  const deploy = await read('../.github/workflows/deploy.yml')
  const archive = await read('../src/pages/archive.astro')
  const tags = await read('../src/pages/tags/[tag].astro')
  const notFound = await read('../src/pages/404.astro')
  assert.match(rss, /@astrojs\/rss/)
  assert.match(robots, /Sitemap: https:\/\/blog\.minglingyun\.com\/sitemap-index\.xml/)
  assert.match(deploy, /actions\/deploy-pages@v4/)
  assert.match(archive, /Archive/)
  assert.match(tags, /getStaticPaths/)
  assert.match(notFound, /Nothing here/)
})
