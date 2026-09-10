import { loadConfig } from './config.mjs'
import { createStore } from './db.mjs'
import { createGitHubClient } from './github.mjs'
import { buildApp } from './app.mjs'

const config = loadConfig()
const store = createStore({ filename: config.sqlitePath })
const github = createGitHubClient({
  token: config.githubToken,
  owner: config.githubOwner,
  repo: config.githubRepo
})
const app = await buildApp({ config, store, github })

const shutdown = async signal => {
  app.log.info({ signal }, 'shutting down editor API')
  await app.close()
  store.close()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

await app.listen({ host: '0.0.0.0', port: config.port })
