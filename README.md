# HSR Optimizer - CV Leaderboard Fork

This repository is a feature fork of [fribbels/hsr-optimizer](https://github.com/fribbels/hsr-optimizer), focused on adding CV leaderboard tooling while keeping the upstream experience intact. Refer to the upstream project for full documentation, issue tracking, and release notes.

## Features

- Character optimizer: https://fribbels.github.io/hsr-optimizer/
- Relic scorer: https://fribbels.github.io/hsr-optimizer/#showcase
- CV leaderboard: https://fribbels.github.io/hsr-optimizer/#leaderboard

## CV Leaderboard

Compare your builds with the community using the global Crit Value leaderboard. Filter by character and region to discover the top entries and light cone pairings.

**How to share your build**
1. Open the `Showcase` tab and load a 9-digit showcase ID.
2. Once the profile finishes loading, characters with valid Crit Rate and Crit DMG stats upload automatically.
3. Open the `Leaderboard` tab to view your builds alongside the community rankings.

## Project Links

- Upstream repository: https://github.com/fribbels/hsr-optimizer
- Contributing guide: https://github.com/fribbels/hsr-optimizer/blob/main/CONTRIBUTING.md
- Getting started: https://github.com/fribbels/hsr-optimizer/blob/main/GETTING_STARTED.md

## Deploying on Render

The leaderboard API now targets Render Web Services with a managed PostgreSQL instance. Follow the steps below after pushing your changes:

1. **Create a Render Postgres instance.** Copy the `External Database URL` and keep the database password handy - you will use this for local development and the web service.
2. **Populate environment variables on the web service.**
   - `DATABASE_URL` - paste the connection string from the Postgres dashboard.
   - (Optional) `VITE_API_BASE_URL` - set this on any static frontend build so the client points to the Render API domain, e.g. `https://your-service.onrender.com`.
   - For local development, create a `.env` file with the same `DATABASE_URL`; add a second database URL as `SHADOW_DATABASE_URL` only if you intend to run `prisma migrate dev`.
3. **Provision the Render Web Service.**
   - Build command: `npm install`
   - Start command: `npm run start:render`
   - Render injects `PORT`, so no extra configuration is required.
4. **Run migrations automatically.** The `start:render` script runs `prisma migrate deploy` before starting the server, ensuring the schema is always up to date.
5. **Point the frontend to the API.** If you rebuild the Vite app (for example when hosting on GitHub Pages), run `VITE_API_BASE_URL=https://your-service.onrender.com npm run build` so client requests use the Render backend.

After the first deploy completes, test the health endpoint at `https://your-service.onrender.com/api/health`. Once it returns `{ "ok": true }`, you can begin ingesting leaderboard data from the UI.
