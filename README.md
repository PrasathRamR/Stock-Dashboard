# FinAPP — Advanced Async NSE CSV Analytics (Local-only)

FinAPP is a modern, fully asynchronous Node.js + React app for advanced NSE stock analytics using only local CSV files. No external APIs are used.

## Highlights
- Async CSV ingestion via streams for manifest and per-stock files
- Advanced technical indicators: RSI, MACD, Bollinger Bands, Moving Averages
- Non-blocking backend endpoints for search, analytics, and technical analysis
- React frontend with interactive charts, sector heatmaps, and performance comparison
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
- Sector heatmap generation with RSI, volatility, and profit metrics
- Performance comparison across multiple stocks and timeframes
- OHLC data extraction with date filtering and pagination

### API Endpoints

#### Technical Analysis
- `GET /api/stock/:symbol/indicators` - All technical indicators for a stock
- `GET /api/stock/:symbol/rsi?period=14` - RSI with configurable period
- `GET /api/stock/:symbol/macd?fastPeriod=12&slowPeriod=26&signalPeriod=9` - MACD with custom parameters
- `GET /api/stock/:symbol/bollinger-bands?period=20&stdDev=2` - Bollinger Bands with custom parameters

#### Advanced Analytics
- `GET /api/sector-heatmap` - Sector performance heatmap with technical metrics
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
- **SectorHeatmap**: Interactive sector performance visualization
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
- **Multi-View Navigation**: Dashboard, Stock Details, Sector Heatmap, Performance Comparison
- **Search Integration**: Debounced search with real-time results
- **Stock Selection**: Click-to-view stock details from any list
- **Loading States**: Graceful loading and error handling throughout

## Local Development
```
# Terminal 1 - Backend
cd server && npm install && npm run dev

# Terminal 2 - Frontend
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
- Sector performance heatmaps with technical metrics
- Multi-stock performance comparison with interactive charts
- Enhanced stock analytics with comprehensive technical analysis
- Improved UI/UX with navigation and responsive design
- Performance optimizations and intelligent caching
