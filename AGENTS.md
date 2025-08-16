# Repository Guidelines

## Project Structure & Module Organization
- Entry point: `app.js` (Express + EJS).
- Config: `config.js` reads `.env` and sets `PORT`, `AUTH_ENABLED`, `AUTH_PASSWORD`.
- Routes: `routes/pages.js` (API endpoints).
- Models: `models/db.js` (SQLite init/helpers), `models/pages.js` (CRUD).
- Middleware: `middleware/auth.js` (login gate when enabled).
- Views: `views/*.ejs` (server‑rendered pages); static assets in `public/`.
- Utils: `utils/codeDetector.js`, `utils/contentRenderer.js` (rendering/format).
- Scripts: `scripts/` (DB migration, port finder). Docker files for container runs.

## Build, Test, and Development Commands
- `npm run dev`: start in development with `nodemon`.
- `npm start` or `npm run prod`: start in production mode.
- `npm test`: starts the app with `NODE_ENV=test` (no unit tests yet).
- Docker: `docker-compose up -d` or `docker build -t quickshare . && docker run -p 8888:8888 quickshare`.
- Env: copy `.env.example` to `.env`; override in production via environment variables.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; keep lines under ~120 chars.
- Strings: single quotes; terminate with semicolons.
- Naming: lower-case directories; camelCase JS modules (e.g., `contentRenderer.js`).
- Templates: EJS files in `views/` use lower-case names.
- Optional tooling: Prettier/ESLint are not configured; keep consistent with existing code.

## Testing Guidelines
- Frameworks: none configured. For new logic, prefer lightweight integration tests (Jest + Supertest) under `__tests__/`.
- Manual smoke test: `npm run dev` → visit `/login` (if `AUTH_ENABLED=true`), create a page, open `/view/:id`, verify password-protected flows.
- Coverage: not enforced; include tests when adding complex parsing/rendering in `utils/` or DB changes in `models/`.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits where possible (`feat:`, `fix:`, `docs:`). Example: `fix: adapt filesystem writes for Vercel`.
- PRs: include purpose, linked issues, run steps, and screenshots for UI changes. Note any config/env requirements.

## Security & Configuration Tips
- Never commit secrets; use `.env` locally and platform env vars in production.
- Vercel/Serverless: writable path is `/tmp` (sessions/DB handled accordingly).
- SQLite file: `db/html-go.db` locally; use volume mounts in Docker if persistence is required.
