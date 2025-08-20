# Docker Usage Guide

This guide explains how to build, run, and access the FinAPP project using Docker.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- (Optional) [Docker Hub](https://hub.docker.com/) account for pulling/pushing images

## 1. Build the Docker Image

Open a terminal in the project root directory and run:

```
docker build -t yourdockerhubusername/finapp .
```
Replace `yourdockerhubusername` with your Docker Hub username, or use any local tag you prefer.

## 2. Prepare Your Data

Make sure your `Datasets` folder is in the project root and contains all required CSV files.

## 3. Run the Docker Container

Run the following command from your project root:

```
docker run --env-file ./server/.env.docker -e NODE_OPTIONS=--max-old-space-size=4096 -p 4000:4000 -p 5173:5173 -v "%cd%/Datasets:/data" --name finapp yourdockerhubusername/finapp
```

- `--env-file ./server/.env.docker` loads environment variables for Docker.
- `-e NODE_OPTIONS=--max-old-space-size=4096` increases Node.js memory limit.
- `-p 4000:4000` exposes backend API on port 4000.
- `-p 5173:5173` exposes frontend on port 5173.
- `-v "%cd%/Datasets:/data"` mounts your local `Datasets` folder into the container.
- `--name finapp` names your container.

**Note:**  
On Windows CMD, use `%cd%` for the current directory.  
On PowerShell, use `${PWD}`.

## 4. Access the Application

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:4000](http://localhost:4000)

## 5. Stopping and Removing the Container

To stop and remove the container:

```
docker stop finapp
docker rm finapp
```

## 6. (Optional) Push to Docker Hub

1. Log in:
	```
	docker login
	```
2. Tag your image:
	```
	docker tag finapp yourdockerhubusername/finapp:latest
	```
3. Push:
	```
	docker push yourdockerhubusername/finapp:latest
	```

## Troubleshooting

- **Port already in use:** Stop any process using the port or change the port mapping.
- **Data not loading:** Ensure your `Datasets` folder is correctly mounted and `.env.docker` paths match `/data/...`.
- **Out of memory:** Increase the `NODE_OPTIONS` memory limit as shown above.

# Unified Single-Node/Single-Container Architecture

This app now runs both the backend (Node.js API) and frontend (React app) together in a single container and can be deployed on a single node. All backend API logic, async CSV processing, technical indicators, and frontend React components are bundled and served from one place.

**Kubernetes resources:**
- `k8s/deployment.yaml`: Unified deployment for both backend and frontend
- `k8s/pvc.yaml`: PersistentVolumeClaim for datasets
- `k8s/configmap.yaml`: Environment variables for backend

**Deployment steps:**
1. Apply PVC and ConfigMap:
	```
	kubectl apply -f k8s/pvc.yaml
	kubectl apply -f k8s/configmap.yaml
	```
2. Deploy the unified app:
	```
	kubectl apply -f k8s/deployment.yaml
	```
3. Expose the service as needed (LoadBalancer/Ingress for production).

See [`k8s/architecture.md`](k8s/architecture.md) for a diagram, local vs K8s comparison, and troubleshooting tips.
# FinAPP — Advanced Async NSE CSV Analytics (Local-only)

FinAPP is a modern, fully asynchronous Node.js + React app for advanced NSE stock analytics using only local CSV files. No external APIs are used.

## Highlights
- Async CSV ingestion via streams for manifest and per-stock files
- Advanced technical indicators: RSI, MACD, Bollinger Bands, Moving Averages
- Non-blocking backend endpoints for search, analytics, and technical analysis
- React frontend with interactive charts and performance comparison
- Single Docker image (frontend build + backend runtime)
- Kubernetes manifests for scalable deployment

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

## Backend Technical Indicators

### Core Indicators Module (`server/src/services/technicalIndicators.js`)
- **RSI (Relative Strength Index)**: 14-day RSI with overbought/oversold detection
- **MACD**: 12/26 EMA with signal line and histogram, crossover detection
- **Bollinger Bands**: 20-period SMA with configurable standard deviation, squeeze detection
- **Moving Averages**: SMA/EMA for multiple periods (5, 10, 20, 50) with crossover signals
- **Volume Analysis**: Volume-price correlation, spike detection, rolling averages

### Analytics Service (`server/src/services/analyticsService.js`)
- Enhanced with technical indicator integration
- Multi-metric analytics grid with RSI, volatility, and profit metrics
- Performance comparison across multiple stocks and timeframes
- OHLC data extraction with date filtering and pagination

### API Endpoints

#### Technical Analysis
- `GET /api/stock/:symbol/indicators` - All technical indicators for a stock
- `GET /api/stock/:symbol/rsi?period=14` - RSI with configurable period
- `GET /api/stock/:symbol/macd?fastPeriod=12&slowPeriod=26&signalPeriod=9` - MACD with custom parameters
- `GET /api/stock/:symbol/bollinger-bands?period=20&stdDev=2` - Bollinger Bands with custom parameters

#### Advanced Analytics
- `GET /api/performance-comparison?symbols=RELIANCE,TCS&timeframe=30d` - Multi-stock comparison
- `GET /api/stock/:symbol/ohlc?startDate=&endDate=&limit=100` - OHLC data with filtering

#### Existing Endpoints
- `GET /api/search?query=...` - Fuzzy search on stock names/symbols
- `GET /api/top-five` - Top 5 stocks by profit percentage
- `GET /api/analytics` - Analytics grid with enhanced metrics
- `GET /api/stock/:symbol` - Stock analytics and basic metrics

### Performance Features
- Intelligent caching of technical indicator calculations
- Batched processing with configurable concurrency limits
- Async streaming for large CSV files
- Memory-efficient data structures

## Frontend Components

### Core Components
- **StockAnalyticsDetails**: Comprehensive stock analysis with technical indicators
- **PerformanceComparison**: Multi-stock comparison with charts and controls

### Technical Indicator Widgets
- **RSI Display**: Current value, overbought/oversold counts, mini-chart
- **MACD Panel**: MACD line, signal line, histogram, crossover alerts
- **Bollinger Bands**: Current bandwidth, squeeze detection, statistical summary
- **Moving Averages**: Multiple period display with golden/death cross detection
- **Volume Analysis**: Volume spikes, price correlation, volume charts

### Chart Features
- **Recharts Integration**: Responsive line charts, bar charts, and area charts
- **Interactive Elements**: Tooltips, hover effects, zoom capabilities
- **Color Coding**: Consistent palette with semantic meaning
- **Responsive Design**: Mobile-friendly chart layouts

### Navigation & UX
- **Multi-View Navigation**: Dashboard, Stock Details, Performance Comparison
- **Search Integration**: Debounced search with real-time results
- **Stock Selection**: Click-to-view stock details from any list
- **Loading States**: Graceful loading and error handling throughout


## Developer Onboarding

This project uses **Node.js** for both backend and frontend. All dependencies are managed via `package.json` files in the `server` and `client` directories. No `requirements.txt` is needed.

### Quick Start
1. **Clone the repository**
2. **Install dependencies:**
	 - Backend:
		 ```
		 cd server
		 npm install
		 ```
	 - Frontend:
		 ```
		 cd client
		 npm install
		 ```
3. **Run in development mode:**
	 - Backend:
		 ```
		 npm run dev
		 ```
	 - Frontend:
		 ```
		 npm run dev
		 ```

The frontend will proxy `/api` requests to `http://localhost:4000` by default.

**Note:** If you are using Docker or Kubernetes, dependency installation is handled automatically during the build process.

## Docker
Build and run single image (serves API on :4000 and static frontend):
```
docker build -t findash .
docker run --rm -p 4000:4000 --env-file .env -v "C:\\Prasath\\FinProj\\Datasets":/data findash
```
Ensure `.env` paths refer to host-mounted CSVs. On Linux/Mac, adjust paths accordingly.

## Kubernetes
Apply manifests:
```
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/secret-example.yaml   # or create your own Secret
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/frontend.yaml
```
Expose via a LoadBalancer/Ingress as needed. Set Secret values to your cluster paths or CSI mounts.

## Technical Implementation Details

### Backend Architecture
- **Modular Design**: Separate services for CSV utilities, analytics, and technical indicators
- **Async Processing**: All I/O operations use async/await and streaming
- **Caching Strategy**: Intelligent caching to avoid recomputation of technical indicators
- **Error Handling**: Robust error boundaries with graceful degradation

### Frontend Architecture
- **React Hooks**: Functional components with custom hooks for data fetching
- **State Management**: Local state with React hooks, no external state management
- **Component Composition**: Reusable components with consistent styling
- **Performance**: Optimized re-renders and efficient data visualization

### Data Flow
1. **CSV Ingestion**: Stream-based reading with schema tolerance
2. **Technical Calculation**: Async computation with intermediate result caching
3. **API Delivery**: RESTful endpoints with JSON responses
4. **Frontend Rendering**: Reactive UI with loading states and error handling

## Performance Considerations
- **Concurrency Control**: Configurable batch sizes for large datasets
- **Memory Management**: Efficient data structures and streaming
- **Caching Strategy**: Multi-level caching for technical indicators
- **Frontend Optimization**: Virtualized lists and efficient chart rendering

## Notes
- No synchronous I/O anywhere; streams are used end-to-end
- All stock CSV paths are derived dynamically from the manifest symbol and `ROOT_PATH`
- Schema variations tolerated; absent stocks/files are skipped without failing whole requests
- Technical indicators are computed on-demand and cached for performance
- Frontend charts are responsive and optimized for mobile devices

## Version 2.0 Features
- Advanced technical indicators (RSI, MACD, Bollinger Bands, Moving Averages)
- Hoverable info icons for all metrics, explaining calculation methods
- Multi-stock performance comparison with interactive charts
- Enhanced stock analytics with comprehensive technical analysis
- Improved UI/UX with navigation and responsive design
- Performance optimizations and intelligent caching
