<<<<<<< HEAD
# FinAPP — Async NSE CSV Analytics (Local-only)

FinAPP is a modern, fully asynchronous Node.js + React app for NSE stock analytics using only local CSV files. No external APIs are used.

## Highlights
- Async CSV ingestion via streams for manifest and per-stock files
- Non-blocking backend endpoints for search, top 5, analytics grid, and stock detail
- React frontend with async UI, debounce, and loading/error states
- Single Docker image (frontend build + backend runtime)
- Kubernetes manifests for a two-replica backend

## Environment
Create a `.env` at project root with:
```
ROOT_PATH="C:\\Prasath\\FinProj\\Datasets\\SCRIP"
MANIFEST_PATH="C:\\Prasath\\FinProj\\Datasets\\manifest.csv"
PORT=4000
```
Only these variables control all CSV paths. Stock files are dynamically resolved as:
```
${ROOT_PATH}\\${stock_name_from_manifest}.csv
```

## Data Model
The manifest CSV lists symbols and optional fields (name, sector). Columns are normalized with fallbacks (e.g., `symbol|SYMBOL|ticker`).
Each stock CSV is streamed and coerced with tolerant parsing:
- `symbol, name, date, open, high, low, close, prev_close, volume, sector, news/sentiment`
Missing fields are handled gracefully.

## Backend
- Node 18+, Express. All I/O async.
- Key services in `server/src/services`:
  - `csvUtils.js`: env validation, manifest read (streamed), stock path builder, CSV row streaming, coercion helpers
  - `analyticsService.js`: fuzzy search, top five by profit %, analytics grid, per-stock analytics
- API routes under `/api`:
  - `GET /api/search?query=...`
  - `GET /api/top-five`
  - `GET /api/analytics`
  - `GET /api/stock/:symbol`

Calculations:
- Profit % = change from first to last available close
- Volatility = stddev of closes
- Average volume
- Sentiment effect = crude positivity ratio if present
- Future potential = strong profit % and non-negative sentiment

## Frontend
- Vite + React function components only
- Debounced search, async fetches with loading/error states
- Widgets: top 5, volume/volatility, fundamentals, sentiment effect, sector performance
- Vibrant minimal palette: `#FF9F43, #00B894, #0984E3, #2D3436, #FFFFFF`

## Local Development
```
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```
Frontend proxies `/api` to `http://localhost:4000`.

## Docker
Build and run single image (serves API on :4000 and static frontend):
```
docker build -t finapp .
docker run --rm -p 4000:4000 --env-file .env -v "C:\\Prasath\\FinProj\\Datasets":/data finapp
```
Ensure `.env` paths refer to host-mounted CSVs. On Linux/Mac, adjust paths accordingly.

## Kubernetes
Apply manifests:
```
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/secret-example.yaml   # or create your own Secret
kubectl apply -f k8s/deployment.yaml
```
Expose via a LoadBalancer/Ingress as needed. Set Secret values to your cluster paths or CSI mounts.

## Notes
- No synchronous I/O anywhere; streams are used end-to-end.
- All stock CSV paths are derived dynamically from the manifest symbol and `ROOT_PATH`.
- Schema variations tolerated; absent stocks/files are skipped without failing whole requests.
=======
# Stock-Dashboard
>>>>>>> 6ddf99a487c96ab90690b12b315d848af07a760b
