# `@liowms/web`

SPA install wizard **K1–K4** (WMS-88).

- Route: `/install`
- Visual reference: MinIO `OBJ-LIOWMS-001/design/concepts/k1–k4-*.png`
- Tokens: CSS variables `--lio-*` (pack primary `#012e5a`, accent `#294c98`)

## Dev

```bash
npm install
npm run dev -w @liowms/web
```

Proxies `/health` and `/api` to `http://127.0.0.1:3000` (API WMS-87).
