# Task Completion
- Inspect `git diff --check` and `git diff -- index.html` for scope and whitespace.
- Run focused `rg` checks for changed metadata/copy/URLs and forbidden or stale public facts relevant to the edit.
- For markup/script changes, serve with `python3 -m http.server 8080` and inspect the returned HTML; meaningful visual changes additionally require desktop/tablet/mobile screenshots.
- Confirm `.vercelignore` still allows every referenced public WebP and blocks docs/tool state/raw images.