import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush, Bar } from 'recharts';
const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF'
};

export default function StockAnalyticsDetails({ stockAnalytics }) {
  const [period, setPeriod] = React.useState('1Y');
  const periods = [
    { label: '1M', days: 22 },
    { label: '6M', days: 132 },
    { label: '1Y', days: 264 },
    { label: '3Y', days: 264 * 3 },
    { label: 'Max', days: null },
  ];
  const timeseries = stockAnalytics.timeseries || [];
  const filtered = React.useMemo(() => {
    if (!timeseries.length) return [];
    if (period === 'Max') return timeseries;
    return timeseries.slice(-periods.find(p => p.label === period).days);
  }, [timeseries, period]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div><b>Name:</b> {stockAnalytics.name}</div>
      <div><b>Sector:</b> {stockAnalytics.sector}</div>
      <div><b>Profit %:</b> {stockAnalytics.metrics.profitPercent?.toFixed(2)}</div>
      <div><b>Volatility:</b> {stockAnalytics.metrics.volatility?.toFixed(2)}</div>
      <div><b>Avg Volume:</b> {stockAnalytics.metrics.avgVolume?.toFixed(2)}</div>
      <div><b>Sentiment Signal:</b> {stockAnalytics.metrics.sentimentSignal?.toFixed(2)}</div>
      <div><b>Future Potential:</b> {stockAnalytics.futurePotential ? 'Yes' : 'No'}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Price & Volume Chart</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {periods.map(p => (
            <button key={p.label} onClick={() => setPeriod(p.label)} style={{
              padding: '4px 12px',
              borderRadius: 8,
              border: period === p.label ? `2px solid ${colors.blue}` : `1px solid #ccc`,
              background: period === p.label ? colors.blue : '#f8fafc',
              color: period === p.label ? colors.white : colors.dark,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 16, right: 40, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={d => d ? new Date(d).toLocaleDateString() : ''} minTickGap={32} />
            <YAxis yAxisId="left" orientation="left" dataKey="close" stroke={colors.blue} domain={['auto', 'auto']} tickFormatter={v => v?.toFixed(0)} />
            <YAxis yAxisId="right" orientation="right" dataKey="volume" stroke={colors.green} domain={[0, 'auto']} tickFormatter={v => v ? (v/1000).toFixed(0) + 'k' : ''} />
            <Tooltip labelFormatter={d => d ? new Date(d).toLocaleDateString() : ''} formatter={(v, n) => n === 'close' ? [`₹${v}`, 'Close'] : [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
            <Line yAxisId="left" type="monotone" dataKey="close" stroke={colors.blue} dot={false} strokeWidth={2} name="Close Price" />
            <Bar yAxisId="right" dataKey="volume" fill={colors.green} opacity={0.18} barSize={6} name="Volume" />
            <Brush dataKey="date" height={18} stroke={colors.blue} travellerWidth={8} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div><b>Recent 30 Days:</b>
        <div style={{ maxHeight: 260, overflow: 'auto', fontSize: 13, borderRadius: 10, boxShadow: '0 2px 8px #0001', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 500 }}>
            <thead>
              <tr style={{ background: colors.blue, color: colors.white, position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>Open</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>High</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>Low</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, background: colors.green, color: colors.white, borderRadius: '0 8px 8px 0' }}>Close</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {stockAnalytics.sample.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#e9f3ff', transition: 'background 0.2s' }}>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0' }}>{row.date ? new Date(row.date).toLocaleDateString() : ''}</td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{row.open}</td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{row.high}</td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{row.low}</td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700, color: colors.green }}>{row.close}</td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{row.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
