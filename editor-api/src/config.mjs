function required(env, name) {
  const value = env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parsePort(value) {
  const port = Number(value ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535')
  return port
}

export function loadConfig(env = process.env) {
  const sessionSecret = required(env, 'SESSION_SECRET')
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')

  const adminOrigin = required(env, 'ADMIN_ORIGIN')
  try {
    new URL(adminOrigin)
  } catch {
    throw new Error('ADMIN_ORIGIN must be a valid origin URL')
  }

  return {
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
    adminOrigin,
    adminUsername: required(env, 'ADMIN_USERNAME'),
    adminPasswordHash: required(env, 'ADMIN_PASSWORD_HASH'),
    sessionSecret,
    githubToken: required(env, 'GITHUB_TOKEN'),
    githubOwner: env.GITHUB_OWNER ?? 'KJDhole',
    githubRepo: env.GITHUB_CONTENT_REPO ?? 'Blog',
    sqlitePath: env.SQLITE_PATH ?? './data/editor.sqlite'
  }
}
