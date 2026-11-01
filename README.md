# Passage Quiz Studio
`npm install && npm run dev` · `npm run build` outputs `dist/` (Vite base is `./`, so it works at any GitHub Pages sub-path).
Deploy: push to `main` with Pages source set to "GitHub Actions" (workflow included).
Quiz links carry the full quiz (with answer key) in the URL hash; results come back as a link. There is no backend or sync.
