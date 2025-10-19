<!-- Copilot instructions for repository: website -->
# Copilot guidance — website

This repository contains simple static websites and a small Node.js site router for hosting multiple domains, plus auxiliary Minecraft server tooling. Use these instructions to help an AI coding agent be productive quickly.

High-level architecture
- ServerManagement/server.js: an Express app that serves different static folders based on the request hostname (SNI-aware HTTPS). It also exposes two GitHub webhook endpoints: `/webhook-owen` and `/webhook-susan`, which run `git pull` in the `website` and `SusanLangone` folders respectively. See `server.js` for SNI certificate logic and redirect from HTTP -> HTTPS.
- website/: a static site (index.html) intended to be served by the router; package-lock.json indicates an Express dependency available in the repository root with a start script in `ServerManagement/package.json`.
- minecraft-server/: contains PowerShell-based service management and update scripts (useful for ops tasks, not runtime logic for the website). See README.md for service commands and `update-server.ps1`.

Developer workflows & commands
- Run the router locally (development): navigate to `ServerManagement` and run `npm start` (runs `node server.js`). The script listens on HTTP 80 and attempts to use HTTPS 443 when certificates are present.
- The router serves `website/` for the default host and `SusanLangone/` when `req.hostname === 'susanlangone.com'`.
- To update the Minecraft server components, use `minecraft-server\update-server.ps1` and manage the Windows service with nssm (see `minecraft-server/README.md`).

Project-specific conventions & patterns
- Static-serving by hostname: the Node server chooses static folder by checking `req.hostname`; keep static assets under the project root (e.g., `website/` and `SusanLangone/`).
- Webhook-based auto-deploy: endpoints expect GitHub push webhook payloads and only act on pushes to `refs/heads/main`. They shell out to `git pull` with a working directory set to the site folder.
- Certificates: Node server looks for Certbot output under `C:\Certbot\live\<domain>\`; when missing it runs in HTTP-only mode.
- When adding routes or endpoints, preserve the middleware order: static serving runs first, then JSON parsing and redirect logic.

Integration points & external deps
- Express (server): used for static serving, JSON parsing, and webhook handling. See `ServerManagement/package.json` (start script).
- GitHub (webhooks): webhook endpoints trigger git pulls; ensure webhook secret and host access are configured in production (currently no secret is used in `server.js`).
- Certbot: expected certificate path `C:\Certbot\live`. If adding TLS handling, follow the existing SNI callback pattern in `server.js`.
- Windows service: nssm is used to run the Minecraft server as a service; see `minecraft-server/nssm` and README for commands.

Code patterns and examples to follow
- Host-based static middleware (keep this exact pattern when adding new hosts):

  const staticPath = (req.hostname === 'susanlangone.com')
    ? path.join(__dirname, '..', 'SusanLangone')
    : path.join(__dirname, '..', 'website');
  express.static(staticPath)(req, res, next);

- Webhook handler pattern (only act on main branch): check payload.ref for `refs/heads/main` and run `git pull` with cwd set to the site folder.

Security & deployment notes
- No webhook secret present: production webhooks are currently not validated — add HMAC verification if you update or expand webhook logic.
- `git pull` is executed directly from the webhook. If adding features, consider adding locking to avoid concurrent pulls and add logging/notifications for failures.

Files to inspect when coding
- `ServerManagement/server.js` — routing, webhooks, SNI, HTTPS/HTTP behavior.
- `ServerManagement/package.json` — scripts and how to start the router.
- `website/index.html` and `SusanLangone/index.html` — examples of static site structure.
- `minecraft-server/README.md` and `minecraft-server/update-server.ps1` — operational scripts and service management.

When in doubt
- Preserve the simple, explicit approach used in `server.js`: explicit host checks, plain `git pull`, and filesystem-based cert loading.
- Prefer minimal changes that follow existing middleware ordering and static-serving patterns.

If you need clarification, ask whether you're changing server routing, webhook behavior, TLS certificates, or adding a new site — each has different ops requirements.
