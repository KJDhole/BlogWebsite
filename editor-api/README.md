# Glenn Blog Editor API

Private runtime for the browser article editor. The public Astro blog remains a static GitHub Pages site; this service handles login, working drafts, GitHub publishing, PR/CI status, and explicit merge actions.

## Production shape

```text
blog.minglingyun.com/admin/   -> static GitHub Pages admin client
                                    |
                                    v
editor-api.minglingyun.com   -> Nginx HTTPS -> 127.0.0.1:8787
                                    |
                                    +-> SQLite /app/data/editor.sqlite
                                    +-> GitHub API -> KJDhole/Blog (private)
```

The public website code lives in `KJDhole/BlogWebsite`. Article Markdown truth lives in the private `KJDhole/Blog` repository under `posts/`.

## Required environment

Copy `.env.example` to a server-only `.env` file and fill the real values there. Do not commit it.

```text
PORT=8787
NODE_ENV=production
ADMIN_ORIGIN=https://blog.minglingyun.com
ADMIN_USERNAME=glenn
ADMIN_PASSWORD_HASH=<bcrypt-hash>
SESSION_SECRET=<at-least-32-random-characters>
GITHUB_TOKEN=<fine-grained-pat>
GITHUB_OWNER=KJDhole
GITHUB_CONTENT_REPO=Blog
SQLITE_PATH=/app/data/editor.sqlite
```

Generate the password hash from `editor-api/` after dependencies are installed:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'YOUR_PASSWORD'
```

Generate the session secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Keep the production env file readable only by the deployment user, for example `chmod 600 .env`.

## GitHub token

Use a fine-grained PAT restricted to **only** `KJDhole/Blog`.

Minimum repository permissions:

- Contents: read/write
- Pull requests: read/write
- Actions: read

The editor reads and writes articles at:

```text
posts/<slug>.md
```

Never put the PAT, password hash, raw password, or session secret in GitHub Pages, `PUBLIC_*` variables, browser JavaScript, or committed files.

## Draft model

There are two kinds of draft state:

- GitHub Markdown with `draft: true` lives in private `KJDhole/Blog/posts/`.
- Unsumbitted working drafts created in `/admin/` live in SQLite until they are submitted for publishing.

Published article truth is always the private GitHub Markdown, not SQLite.

## Build and run

From the repository root:

```bash
docker build -t glenn-blog-editor-api ./editor-api

docker volume create glenn-editor-data

docker run -d \
  --name glenn-blog-editor-api \
  --restart unless-stopped \
  --env-file ./editor-api/.env \
  -p 127.0.0.1:8787:8787 \
  -v glenn-editor-data:/app/data \
  glenn-blog-editor-api
```

The API is deliberately bound to loopback on the host. Do not expose port `8787` directly to the Internet.

## CORS

The browser admin client uses credentialed requests. The API explicitly allows the methods used by the editor:

```text
GET, HEAD, POST, PUT, DELETE, OPTIONS
```

`ADMIN_ORIGIN` must remain exactly the public admin origin.

## Nginx

Example server block:

```nginx
server {
    listen 443 ssl http2;
    server_name editor-api.minglingyun.com;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Persistence and backup

`/app/data` must be a persistent Docker volume. SQLite stores working drafts and sessions.

Before replacing the container, take a SQLite backup:

```bash
docker exec glenn-blog-editor-api \
  node -e "const Database=require('better-sqlite3'); const db=new Database('/app/data/editor.sqlite'); db.backup('/app/data/editor-backup.sqlite').then(()=>db.close())"
```

Then copy the backup out if desired:

```bash
docker cp glenn-blog-editor-api:/app/data/editor-backup.sqlite ./editor-backup.sqlite
```

## Verification

```bash
npm install --prefix editor-api
npm test --prefix editor-api
docker build -t glenn-blog-editor-api ./editor-api
```

A successful production smoke test is:

```text
/admin/login/
→ create/save draft
→ submit publish
→ PR appears in KJDhole/Blog with posts/<slug>.md
→ Content CI passes
→ confirm publish / merge
→ private Blog main updates
→ BlogWebsite Pages deployment is triggered
```

The GitHub Pages deploy workflow remains static and does not run this API container.
