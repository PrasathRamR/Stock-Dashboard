
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush, Bar, BarChart } from 'recharts';
import StockAnalyticsDetails from './StockAnalyticsDetails';

const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF'
}

function useDebouncedValue(value, delayMs) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return v
}

async function fetchJson(pathname) {
  const res = await fetch(pathname)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function App() {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  const [search, setSearch] = useState({ loading: false, data: [], error: null })
  const [topFive, setTopFive] = useState({ loading: true, data: [], error: null })
  const [analytics, setAnalytics] = useState({ loading: true, data: null, error: null })
  const [selectedStock, setSelectedStock] = useState(null)
  const [stockAnalytics, setStockAnalytics] = useState({ loading: false, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setSearch(s => ({ ...s, loading: true }))
      try {
        const json = debounced ? await fetchJson(`/api/search?query=${encodeURIComponent(debounced)}`) : { results: [] }
        if (!cancelled) setSearch({ loading: false, data: json.results || [], error: null })
      } catch (e) {
        if (!cancelled) setSearch({ loading: false, data: [], error: e.message })
      }
    }
    run()
    return () => { cancelled = true }
  }, [debounced])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const json = await fetchJson('/api/top-five')
        if (!cancelled) setTopFive({ loading: false, data: json.results || [], error: null })
      } catch (e) {
        if (!cancelled) setTopFive({ loading: false, data: [], error: e.message })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const json = await fetchJson('/api/analytics')
        if (!cancelled) setAnalytics({ loading: false, data: json, error: null })
      } catch (e) {
        if (!cancelled) setAnalytics({ loading: false, data: null, error: e.message })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Fetch analytics for selected stock
  useEffect(() => {
    if (!selectedStock) return;
    let cancelled = false;
    setStockAnalytics({ loading: true, data: null, error: null });
    fetchJson(`/api/stock/${selectedStock}`)
      .then(json => { if (!cancelled) setStockAnalytics({ loading: false, data: json, error: null }) })
      .catch(e => { if (!cancelled) setStockAnalytics({ loading: false, data: null, error: e.message }) })
    return () => { cancelled = true }
  }, [selectedStock])

  function handleViewStock(symbol) {
    setSelectedStock(symbol)
    setQuery('')
  }

  function handleHome() {
    setSelectedStock(null)
    setQuery('')
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial', background: colors.white, color: colors.dark, minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: `3px solid ${colors.dark}10` }}>
        <div style={{ fontWeight: 800, color: colors.orange, fontSize: 20, cursor: 'pointer' }} onClick={handleHome}>FinAPP</div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', width: 420, maxWidth: '60vw' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search NSE stocks..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.dark}30`, outline: 'none' }}
          />
          {search.loading && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: colors.blue }}>Loading...</span>}
          {!!search.error && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: 'crimson' }}>Error</span>}
        </div>

      </nav>
      <main style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {!selectedStock ? (
          <>
            <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <Card title="Top 5 by Profit %" accent={colors.green}>
                {topFive.loading ? <Loading /> : topFive.error ? <ErrorMsg msg={topFive.error} /> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {topFive.data.map((r, i) => (
                      <div key={r.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.dark}22`, background: i === 0 ? `${colors.green}15` : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <RankBadge rank={i + 1} />
                          <div style={{ fontWeight: 600 }}>{r.symbol}</div>
                          <div style={{ opacity: 0.7 }}>{r.name}</div>
                        </div>
                        <div style={{ color: colors.green, fontWeight: 700 }}>{r.profitPercent.toFixed(2)}%</div>
                      </div>
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
              <Card title="News Sentiment Effect" accent={colors.green}>
                <List data={analytics.data?.sentimentEffect} loading={analytics.loading} error={analytics.error} valueKey={(d) => (d.sentimentSignal * d.profitPercent).toFixed(2)} />
              </Card>
              <Card title="Sector Performance" accent={colors.dark}>
                <List data={analytics.data?.sectorPerformance} loading={analytics.loading} error={analytics.error} valueKey={(d) => `${d.avgProfitPercent.toFixed(2)}%`} labelKey={(d)=> d.sector} />
              </Card>
            </section>

            {search.data.length > 0 && (
              <section>
                <Card title="Search Results" accent={colors.dark}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {search.data.map(r => (
                      <div key={r.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${colors.dark}20`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ fontWeight: 600 }}>{r.symbol}</div>
                          <div style={{ opacity: 0.7 }}>{r.name}</div>
                        </div>
                        <button style={{ color: colors.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleViewStock(r.symbol)}>View</button>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </>
        ) : (
          <section>
            <Card title={`Stock Analytics: ${selectedStock}`} accent={colors.blue}>
              {stockAnalytics.loading ? <Loading /> : stockAnalytics.error ? <ErrorMsg msg={stockAnalytics.error} /> : stockAnalytics.data ? (
                <StockAnalyticsDetails stockAnalytics={stockAnalytics.data} />
              ) : null}
            </Card>
          </section>
        )}
      </main>
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
  )
}

function Loading() { return <div style={{ opacity: 0.6 }}>Loading...</div> }
function ErrorMsg({ msg }) { return <div style={{ color: 'crimson' }}>{msg}</div> }

function RankBadge({ rank }) {
  const bg = rank === 1 ? colors.green : rank === 2 ? colors.blue : colors.orange
  return (
    <div style={{ background: bg, color: colors.white, borderRadius: 20, width: 28, height: 28, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{rank}</div>
  )
}

function List({ data, loading, error, valueKey, labelKey }) {
  if (loading) return <Loading />
  if (error) return <ErrorMsg msg={error} />
  if (!data || data.length === 0) return <div style={{ opacity: 0.6 }}>No data</div>
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {data.map((d, i) => (
        <div key={(d.symbol || d.sector || i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: `1px solid ${colors.dark}15` }}>
          <div style={{ fontWeight: 600 }}>{labelKey ? labelKey(d) : d.symbol}</div>
          <div style={{ opacity: 0.8 }}>{valueKey(d)}</div>
        </div>
      ))}
    </div>
  )
}


