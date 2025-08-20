import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF',
  red: '#E74C3C',
  purple: '#9B59B6',
  teal: '#1ABC9C',
  pink: '#E91E63'
};

const timeframes = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' }
];

const chartColors = [colors.blue, colors.green, colors.orange, colors.purple, colors.teal, colors.pink, colors.red];


export default function PerformanceComparison({ selectedSymbols, setSelectedSymbols }) {
  const [timeframe, setTimeframe] = useState('30d');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableSymbols, setAvailableSymbols] = useState([]);
  // Add state and filter logic for the add stock input
  const [addStockQuery, setAddStockQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const filteredSymbols = availableSymbols.filter(s => {
    if (selectedSymbols.includes(s.symbol)) return false;
    const q = addStockQuery.toUpperCase();
    return s.symbol.toUpperCase().includes(q) || (s.name && s.name.toUpperCase().includes(q));
  }).slice(0, 30);

  // Fetch initial symbols with a default query (e.g., 'A') to ensure dropdown is populated
  useEffect(() => {
    fetchAvailableSymbols('A');
  }, []);

  useEffect(() => {
    if (selectedSymbols.length > 0) {
      fetchComparisonData();
    }
  }, [selectedSymbols, timeframe]);

  async function fetchAvailableSymbols(query) {
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSymbols(data.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch available symbols:', err);
    }
  }

  async function fetchComparisonData() {
    setLoading(true);
    setError(null);
    try {
      const symbolsParam = selectedSymbols.join(',');
      const response = await fetch(`/api/performance-comparison?symbols=${symbolsParam}&timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch comparison data');
      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSymbolToggle(symbol) {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      } else {
        if (prev.length < 7) { // Max 7 symbols for chart clarity
          return [...prev, symbol];
        }
        return prev;
      }
    });
  }

  function handleAddSymbol(symbol) {
    if (!selectedSymbols.includes(symbol) && selectedSymbols.length < 7) {
      setSelectedSymbols(prev => [...prev, symbol]);
    }
  }

  // Prepare chart data for performance comparison
  const chartData = comparisonData?.comparison?.map((stock, index) => ({
    symbol: stock.symbol,
    profitPercent: stock.profitPercent,
    volatility: stock.volatility,
    avgVolume: stock.avgVolume,
    color: chartColors[index % chartColors.length]
  })) || [];

  return (
    <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 14, overflow: 'hidden', minHeight: 600 }}>
      <div style={{ padding: '10px 12px', background: `${colors.dark}12`, fontWeight: 700 }}>Performance Comparison</div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: colors.dark }}>Selected Stocks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedSymbols.map((symbol, index) => (
                <div
                  key={symbol}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: chartColors[index % chartColors.length],
                    color: colors.white,
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => handleSymbolToggle(symbol)}
                >
                  {symbol}
                  <span style={{ fontSize: 16 }}>×</span>
                </div>
              ))}
              {selectedSymbols.length < 7 && (
                <div style={{ position: 'relative', minWidth: 180 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add Stock"
                    value={addStockQuery || ''}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setAddStockQuery(val);
                      setDropdownOpen(true);
                      if (val.length > 0) {
                        fetchAvailableSymbols(val);
                      } else {
                        fetchAvailableSymbols('A');
                      }
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={e => {
                      setTimeout(() => setDropdownOpen(false), 120);
                    }}
                    style={{
                      padding: '6px 12px',
                      border: `1px solid ${colors.dark}30`,
                      borderRadius: 20,
                      backgroundColor: colors.white,
                      fontSize: 14,
                      width: '100%'
                    }}
                  />
                  {dropdownOpen && addStockQuery && filteredSymbols.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 36,
                      left: 0,
                      width: '100%',
                      background: colors.white,
                      border: `1px solid ${colors.dark}30`,
                      borderRadius: 10,
                      boxShadow: '0 4px 16px #0002',
                      zIndex: 1000,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}>
                      {filteredSymbols.map(s => (
                        <div
                          key={s.symbol}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            transition: 'background 0.15s',
                          }}
                          onMouseDown={e => {
                            e.preventDefault();
                            handleAddSymbol(s.symbol);
                            setAddStockQuery('');
                            setDropdownOpen(false);
                            if (inputRef.current) inputRef.current.blur();
                          }}
                          tabIndex={0}
                        >
                          <span style={{ fontWeight: 600, color: colors.blue }}>{s.symbol}</span>
                          <span style={{ opacity: 0.7 }}>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

  
            </div>
          </div>

          {/* Timeframe Selection */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: colors.dark }}>Timeframe</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: timeframe === tf.value ? `2px solid ${colors.blue}` : `1px solid ${colors.dark}30`,
                    backgroundColor: timeframe === tf.value ? colors.blue : colors.white,
                    color: timeframe === tf.value ? colors.white : colors.dark,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading comparison data...</div>}
        {error && <div style={{ color: colors.red, textAlign: 'center', padding: 20 }}>Error: {error}</div>}

        {/* Comparison Results */}
        {comparisonData && !loading && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Performance Chart */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: '0 0 16px 0', color: colors.dark }}>Profit % Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${colors.dark}20`} />
                  <XAxis dataKey="symbol" stroke={colors.dark} />
                  <YAxis stroke={colors.dark} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(2)}%`, 'Profit %']}
                    contentStyle={{
                      backgroundColor: colors.white,
                      border: `1px solid ${colors.dark}20`,
                      borderRadius: 8
                    }}
                  />
                  <Bar
                    dataKey="profitPercent"
                    radius={[4, 4, 0, 0]}
                    // Use a function to set color per bar
                    fill={(entry) => entry.color || colors.blue}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Comparison Table */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: '0 0 16px 0', color: colors.dark }}>Detailed Comparison</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: `${colors.dark}10` }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: `1px solid ${colors.dark}20` }}>Symbol</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: `1px solid ${colors.dark}20` }}>Profit %</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: `1px solid ${colors.dark}20` }}>Volatility</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: `1px solid ${colors.dark}20` }}>Avg Volume</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: `1px solid ${colors.dark}20` }}>Start Price</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: `1px solid ${colors.dark}20` }}>End Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.comparison?.map((stock, index) => (
                      <tr key={stock.symbol} style={{ backgroundColor: index % 2 === 0 ? colors.white : `${colors.dark}05` }}>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, fontWeight: 600, color: chartColors[index % chartColors.length] }}>
                          {stock.symbol}
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, textAlign: 'right', fontWeight: 700, color: stock.profitPercent > 0 ? colors.green : colors.red }}>
                          {stock.profitPercent?.toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, textAlign: 'right' }}>
                          {stock.volatility?.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, textAlign: 'right' }}>
                          {stock.avgVolume?.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, textAlign: 'right' }}>
                          ₹{stock.startPrice?.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.dark}15`, textAlign: 'right' }}>
                          ₹{stock.endPrice?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ padding: 16, backgroundColor: `${colors.green}10`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Best Performer</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: colors.green }}>
                  {comparisonData.comparison?.[0]?.symbol}
                </div>
                <div style={{ fontSize: 16, color: colors.green }}>
                  {comparisonData.comparison?.[0]?.profitPercent?.toFixed(2)}%
                </div>
              </div>
              
              <div style={{ padding: 16, backgroundColor: `${colors.red}10`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Worst Performer</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: colors.red }}>
                  {comparisonData.comparison?.[comparisonData.comparison.length - 1]?.symbol}
                </div>
                <div style={{ fontSize: 16, color: colors.red }}>
                  {comparisonData.comparison?.[comparisonData.comparison.length - 1]?.profitPercent?.toFixed(2)}%
                </div>
              </div>
              
              <div style={{ padding: 16, backgroundColor: `${colors.blue}10`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Average Performance</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: colors.blue }}>
                  {(comparisonData.comparison?.reduce((sum, s) => sum + s.profitPercent, 0) / comparisonData.comparison?.length)?.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
