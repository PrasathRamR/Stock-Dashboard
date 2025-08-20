
import React, { useState, useEffect } from 'react';
import StockAnalyticsDetails from './StockAnalyticsDetails';
import PerformanceComparison from './components/PerformanceComparison';
import { MetricInfo, metricDescriptions } from './components/MetricInfo';
// ...existing code up to the end of the first PopularStocksBar definition...

// ...removed duplicate useDebouncedValue definition...

// ...removed duplicate App component definition...

const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF',
};

function PopularStocksBar() {
  const popularStocks = [
    { symbol: 'RELIANCE', price: 2850.25, percent: 2.15 },
    { symbol: 'TCS', price: 3950.10, percent: 1.80 },
    { symbol: 'INFY', price: 1620.50, percent: 1.25 },
    { symbol: 'HDFCBANK', price: 1705.00, percent: 2.05 },
    { symbol: 'ICICIBANK', price: 990.30, percent: 1.95 },
    { symbol: 'HINDUNILVR', price: 2650.00, percent: 1.10 },
    { symbol: 'SBIN', price: 610.20, percent: 2.25 },
    { symbol: 'BHARTIARTL', price: 950.40, percent: 1.75 },
    { symbol: 'KOTAKBANK', price: 1850.00, percent: 1.60 },
    { symbol: 'LT', price: 3550.00, percent: 2.00 },
    { symbol: 'AXISBANK', price: 1100.00, percent: 1.90 },
    { symbol: 'MARUTI', price: 11250.00, percent: 2.10 },
    { symbol: 'ITC', price: 450.00, percent: 1.20 },
    { symbol: 'SUNPHARMA', price: 1350.00, percent: 1.85 },
    { symbol: 'TITAN', price: 3450.00, percent: 2.30 },
    { symbol: 'ULTRACEMCO', price: 9000.00, percent: 1.70 },
    { symbol: 'BAJFINANCE', price: 7500.00, percent: 2.40 },
    { symbol: 'HCLTECH', price: 1450.00, percent: 1.55 },
    { symbol: 'WIPRO', price: 520.00, percent: 1.35 },
    { symbol: 'ADANIENT', price: 2850.00, percent: 2.50 },
  ];
  const [stockSet, setStockSet] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setStockSet(s => (s + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      style={{
        background: `${colors.orange}4D`,
        color: '#142850',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: 48,
        borderBottom: `1px solid ${colors.dark}22`,
      }}
    >
      {popularStocks.slice(stockSet * 5, stockSet * 5 + 5).map((stock, i) => (
        <div
          key={stock.symbol}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 16,
            color: '#142850',
            padding: '0 8px',
            borderRight: i < 4 ? `1px solid ${colors.orange}55` : 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          tabIndex={0}
        >
          <div style={{ fontWeight: 700 }}>{stock.symbol}</div>
          <div style={{ color: colors.green, fontSize: 15, fontWeight: 500 }}>
            {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span style={{ color: colors.green, fontWeight: 400, fontSize: 14 }}> ({stock.percent.toFixed(2)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function useDebouncedValue(value, delayMs) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

async function fetchJson(pathname) {
  const res = await fetch(pathname);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export default function App() {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const [search, setSearch] = useState({ loading: false, data: [], error: null });
  const [topFive, setTopFive] = useState({ loading: true, data: [], error: null });
  const [analytics, setAnalytics] = useState({ loading: true, data: null, error: null });
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockAnalytics, setStockAnalytics] = useState({ loading: false, data: null, error: null });
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, stock, heatmap, comparison
  // Performance Comparison shared state
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  function handleAddSymbol(symbol) {
    setSelectedSymbols(prev => prev.includes(symbol) || prev.length >= 7 ? prev : [...prev, symbol]);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setSearch(s => ({ ...s, loading: true }));
      try {
        const json = debounced ? await fetchJson(`/api/search?query=${encodeURIComponent(debounced)}`) : { results: [] };
        if (!cancelled) setSearch({ loading: false, data: json.results || [], error: null });
      } catch (e) {
        if (!cancelled) setSearch({ loading: false, data: [], error: e.message });
      }
    }
    run();
    return () => { cancelled = true };
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const json = await fetchJson('/api/top-five');
        if (!cancelled) setTopFive({ loading: false, data: json.results || [], error: null });
      } catch (e) {
        if (!cancelled) setTopFive({ loading: false, data: [], error: e.message });
      }
    }
    run();
    return () => { cancelled = true };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const json = await fetchJson('/api/analytics');
        if (!cancelled) setAnalytics({ loading: false, data: json, error: null });
      } catch (e) {
        if (!cancelled) setAnalytics({ loading: false, data: null, error: e.message });
      }
    }
    run();
    return () => { cancelled = true };
  }, []);

  useEffect(() => {
    if (currentView !== 'stock' || !selectedStock) return;
    let cancelled = false;
    setStockAnalytics({ loading: true, data: null, error: null });
    fetchJson(`/api/stock/${selectedStock}`)
      .then(json => { if (!cancelled) setStockAnalytics({ loading: false, data: json, error: null }); })
      .catch(e => { if (!cancelled) setStockAnalytics({ loading: false, data: null, error: e.message }); });
    return () => { cancelled = true };
  }, [selectedStock, currentView]);

  function handleViewStock(symbol) {
    if (currentView === 'stock' && selectedStock === symbol) return;
    setQuery('');
    if (currentView !== 'stock') setCurrentView('stock');
    if (selectedStock !== symbol) setSelectedStock(symbol);
  }

  function handleHome() {
    setSelectedStock(null);
    setCurrentView('dashboard');
    setQuery('');
  }

  function handleNavigation(view) {
    setCurrentView(view);
    setSelectedStock(null);
    setQuery('');
  }

  function renderNavigation() {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => handleNavigation('dashboard')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: currentView === 'dashboard' ? `2px solid ${colors.blue}` : `1px solid ${colors.dark}30`,
            backgroundColor: currentView === 'dashboard' ? colors.blue : colors.white,
            color: currentView === 'dashboard' ? colors.white : colors.dark,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Statistics
        </button>

        <button
          onClick={() => handleNavigation('comparison')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: currentView === 'comparison' ? `2px solid ${colors.blue}` : `1px solid ${colors.dark}30`,
            backgroundColor: currentView === 'comparison' ? colors.blue : colors.white,
            color: currentView === 'comparison' ? colors.white : colors.dark,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Performance Comparison
        </button>
      </div>
    );
  }

  function StockHoverTooltip({ stock, position }) {
    if (!stock || !position) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: position.y + 12,
          left: position.x + 12,
          zIndex: 9999,
          background: '#fff',
          color: colors.dark,
          border: `1px solid ${colors.dark}22`,
          borderRadius: 10,
          boxShadow: '0 4px 16px #0001',
          padding: '12px 18px',
          minWidth: 180,
          pointerEvents: 'none',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: colors.blue }}>{stock.symbol}</div>
        <div><b>Name:</b> {stock.name}</div>
        {stock.latestPrice !== undefined && (
          <div><b>Latest Price:</b> ₹{stock.latestPrice}</div>
        )}
        {stock.profitPercent !== undefined && (
          <div><b>Profit %:</b> {stock.profitPercent.toFixed(2)}</div>
        )}
      </div>
    );
  }

  function StockHoverableRow({ stock, onClick, children }) {
    const [hover, setHover] = useState(false);
    const [pos, setPos] = useState(null);
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: 10,
          border: `1px solid ${colors.dark}22`,
          background: '#fff',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
          position: 'relative',
          marginBottom: 2,
        }}
        onMouseEnter={e => {
          setHover(true);
          setPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={e => {
          if (hover) setPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => {
          setHover(false);
          setPos(null);
        }}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        tabIndex={0}
      >
        {children}
        {hover && <StockHoverTooltip stock={stock} position={pos} />}
      </div>
    );
  }

  function Card({ title, accent, children }) {
    return (
      <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', background: `${accent}12`, fontWeight: 700 }}>{title}</div>
        <div style={{ padding: 12 }}>
          {children}
        </div>
      </div>
    );
  }

  function Loading() { return <div style={{ opacity: 0.6 }}>Loading...</div>; }
  function ErrorMsg({ msg }) { return <div style={{ color: 'crimson' }}>{msg}</div>; }

  function RankBadge({ rank }) {
    const bg = rank === 1 ? colors.green : rank === 2 ? colors.blue : colors.orange;
    return (
      <div style={{ background: bg, color: colors.white, borderRadius: 20, width: 28, height: 28, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{rank}</div>
    );
  }

  function List({ data, loading, error, valueKey, labelKey }) {
    if (loading) return <Loading />;
    if (error) return <ErrorMsg msg={error} />;
    if (!data || data.length === 0) return <div style={{ opacity: 0.6 }}>No data</div>;
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {data.map((d, i) => (
          <StockHoverableRow key={(d.symbol || d.sector || i)} stock={d} onClick={() => {}}>
            <div style={{ fontWeight: 600 }}>{labelKey ? labelKey(d) : d.symbol}</div>
            <div style={{ opacity: 0.8 }}>{valueKey(d)}</div>
          </StockHoverableRow>
        ))}
      </div>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <Card title="Top 5 by Profit %" accent={colors.green}>
            {topFive.loading ? <Loading /> : topFive.error ? <ErrorMsg msg={topFive.error} /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {topFive.data.map((r, i) => (
                  <StockHoverableRow key={r.symbol} stock={r} onClick={() => handleViewStock(r.symbol)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <RankBadge rank={i + 1} />
                      <div style={{ fontWeight: 600, color: colors.blue, textDecoration: 'underline' }}>{r.symbol}</div>
                      <div style={{ opacity: 0.7 }}>{r.name}</div>
                    </div>
                    <div style={{ color: colors.green, fontWeight: 700 }}>{r.profitPercent.toFixed(2)}%</div>
                  </StockHoverableRow>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <Card title="Volume vs Volatility" accent={colors.blue}>
            <List data={analytics.data?.volumeVolatility} loading={analytics.loading} error={analytics.error} valueKey={(d) => (d.avgVolume * d.volatility).toFixed(2)} />
          </Card>
          <Card title="Dividend/Fundamentals" accent={colors.orange}>
            <List data={analytics.data?.fundamentals} loading={analytics.loading} error={analytics.error} valueKey={(d) => `${d.profitPercent.toFixed(2)}%`} />
          </Card>
          <Card title="Top Gainers in 30 Days" accent={colors.green}>
            <List data={analytics.data?.thirtyDayGainers} loading={analytics.loading} error={analytics.error} valueKey={(d) => `${d.profitPercent.toFixed(2)}%`} labelKey={(d) => d.symbol} />
          </Card>
          <Card title="Top Losers in 30 Days" accent={colors.orange}>
            <List data={analytics.data?.thirtyDayLosers} loading={analytics.loading} error={analytics.error} valueKey={(d) => `${d.profitPercent.toFixed(2)}%`} labelKey={(d) => d.symbol} />
          </Card>
        </section>


      </>
    );
  }

  function renderContent() {
    switch (currentView) {
      case 'stock':
        return (
          <section>
            <Card title={`Stock Analytics: ${selectedStock}`} accent={colors.blue}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 20, color: colors.blue }}>{selectedStock}</span>
                <button
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: `1px solid ${colors.green}`,
                    background: colors.white,
                    color: colors.green,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                  onClick={() => handleAddSymbol(selectedStock)}
                  disabled={selectedSymbols.includes(selectedStock) || selectedSymbols.length >= 7}
                  title={selectedSymbols.includes(selectedStock) ? 'Already added' : selectedSymbols.length >= 7 ? 'Maximum 7 stocks' : ''}
                >
                  Add to Performance Comparison
                </button>
              </div>
              {stockAnalytics.loading ? <Loading /> : stockAnalytics.error ? <ErrorMsg msg={stockAnalytics.error} /> : stockAnalytics.data ? (
                <StockAnalyticsDetails stockAnalytics={stockAnalytics.data} />
              ) : null}
            </Card>
          </section>
        );
      case 'heatmap':

      case 'comparison':
        return <PerformanceComparison selectedSymbols={selectedSymbols} setSelectedSymbols={setSelectedSymbols} />;
      default:
        return renderDashboard();
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial', background: colors.white, color: colors.dark, minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: `3px solid ${colors.dark}10` }}>
        <div style={{ fontWeight: 800, color: colors.orange, fontSize: 20, cursor: 'pointer', marginRight: 32, flexShrink: 0 }} onClick={handleHome}>FinAPP</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 420, maxWidth: '60vw' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search NSE stocks..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.dark}30`, outline: 'none' }}
            autoComplete="off"
          />
          {search.loading && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: colors.blue }}>Loading...</span>}
          {!!search.error && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: 'crimson' }}>Error</span>}
          {query && search.data.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 44,
              left: 0,
              width: '100%',
              background: colors.white,
              border: `1px solid ${colors.dark}30`,
              borderRadius: 10,
              boxShadow: '0 4px 16px #0002',
              zIndex: 1000,
              maxHeight: 320,
              overflowY: 'auto',
              padding: 4
            }}>
              {search.data.map(r => (
                <div
                  key={r.symbol}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.15s',
                  }}
                  onClick={() => handleViewStock(r.symbol)}
                  onMouseDown={e => e.preventDefault()}
                  tabIndex={0}
                >
                  <span style={{ fontWeight: 600, color: colors.blue }}>{r.symbol}</span>
                  <span style={{ opacity: 0.7 }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </nav>

      {/* Scrolling popular stocks bar with orange bg and navy blue text */}
  <PopularStocksBar />



      <main style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {renderNavigation()}
        {renderContent()}

      </main>
    </div>
  );
}


