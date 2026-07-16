# Tech Stack
- Single buildless `index.html`; Tailwind CSS loaded/configured inline from CDN; inline CSS and JavaScript.
- No app framework, package manager, build step, server code, test suite, or CI workflow.
- Darwin development host; local preview uses Python HTTP server.
- Vercel deploy is guarded by `.vercelignore`; only `index.html` and `assets/*.webp` are public artifacts.