# DevConnect

DevConnect is a full-stack social platform for developers. Members can create a developer profile, upload a profile picture and cover photo, publish posts with images, connect with other developers, collaborate on projects, and chat in real time.

## Included features

- Email/OTP and Google authentication with access-token refresh
- Editable profiles: bio, skills, location, social links, profile image, and cover image
- Public developer profiles and global search
- Public or connections-only posts, image posts, likes, comments, and sharing
- Connection requests, suggestions, accept/reject flows, and notifications
- Direct Socket.IO messaging and project group chat
- Public/private project collaboration, join requests, and member management
- Responsive React interface for desktop and mobile

## Tech stack

- Client: React, Vite, Tailwind CSS, React Query, Socket.IO Client
- Server: Express, MongoDB/Mongoose, Redis (optional), Socket.IO, JWT, Cloudinary, Nodemailer

## Run locally

Requirements: Node.js 20+, MongoDB (local, Docker, or Atlas), optional Redis for shared rate limits, and Cloudinary credentials for image uploads.

### Docker (nginx + API + MongoDB + Redis)

1. Create and fill in `server/.env` (see `server/.env.example`). Compose overrides `MONGO_URI`, `REDIS_URL`, and `CLIENT_URL` for in-network services; you still need JWT secrets, Cloudinary, and any email/Google values.

2. From the repo root:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost`. Nginx serves the React build and proxies `/api`, `/socket.io/`, and `/health` to the API container.

Optional: pass Google sign-in into the client build with `VITE_GOOGLE_CLIENT_ID` in a root `.env` file or your shell before `docker compose up`.

Infra only (MongoDB + Redis while you run `npm run dev` on the host):

```bash
docker compose up -d mongodb redis
```

Use `MONGO_URI=mongodb://127.0.0.1:27017/devconnect` and `REDIS_URL=redis://127.0.0.1:6379` in `server/.env`. Omit `REDIS_URL` to keep in-memory rate limiting.

### Local development (Node on the host)

1. Create configuration files from the templates:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

2. Fill in `server/.env`. At minimum configure `MONGO_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and all three Cloudinary values. Set `REDIS_URL` when running Redis (for example via Docker Compose). Configure the Google/email values only when using Google sign-in or email OTP delivery.

3. Start the API in one terminal:

   ```bash
   cd server
   npm install
   npm run dev
   ```

4. Start the client in a second terminal:

   ```bash
   cd client
   npm install
   npm run dev
   ```

Open `http://localhost:3000`.

## Quality checks

```bash
cd client && npm run lint && npm run build
cd ../server && npm run check
```

## CI/CD (GitHub Actions)

### CI (`.github/workflows/ci.yml`)

Runs on pushes and pull requests to `main`:

- Client: `npm ci`, ESLint, production build
- Server: `npm ci`, `node --check` on `server.js`
- Docker: `docker compose build web server` (uses `server/.env.example` as a stub env file)

### CD (`.github/workflows/cd.yml`)

Runs on pushes to `main` and manual **workflow dispatch**:

1. Builds and pushes `devconnect-server` and `devconnect-web` images to **GitHub Container Registry** (`ghcr.io/<owner>/...`), tagged with `latest`, `main`, and the commit SHA.
2. **Deploy** job (GitHub **production** environment): SSH to your VPS, pulls images, and runs Compose with `docker-compose.prod.yml`.

#### Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Used for |
|--------|----------|
| `VITE_GOOGLE_CLIENT_ID` | Optional; baked into the nginx/client image at build time |
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key (PEM) for SSH |
| `DEPLOY_PATH` | Directory on the server with `docker-compose.yml`, `docker-compose.prod.yml`, and `server/.env` |
| `GHCR_DEPLOY_TOKEN` | PAT or fine-grained token with `read:packages` so the server can `docker pull` from GHCR |
| `DEPLOY_PORT` | Optional SSH port (defaults to 22 in the workflow if omitted) |

On the VPS, clone the repo (or copy compose files), create `server/.env` with production values, then make GHCR packages **public** or grant the deploy token access. First deploy:

```bash
export IMAGE_TAG=<commit-sha-or-latest>
export SERVER_IMAGE=ghcr.io/<owner>/devconnect-server
export WEB_IMAGE=ghcr.io/<owner>/devconnect-web
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull web server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build web server
```

Until deploy secrets are configured, the **build-and-push** job still publishes images. To run SSH deploy, set repository variable **`ENABLE_DEPLOY`** to `true` and add the deploy secrets below.

## Image uploads

The profile editor uploads avatar and cover images immediately. Post images use the same Cloudinary integration. The backend accepts image files up to 5 MB and safely removes temporary uploads after processing.

## Environment notes

- `VITE_API_URL` defaults to `/api` (Vite dev proxy and Docker/nginx). Set a full URL only when the API is on another host.
- `VITE_SOCKET_URL` is optional; when unset, the client uses the current page origin (works with nginx and Vite proxy).
- `CLIENT_URL` can contain comma-separated allowed browser origins.
- When email OAuth credentials are omitted in development, verification OTPs are printed in the API terminal. Production requires configured email delivery.
- Never commit `.env` files; templates are included for safe setup.
