import React, { useState, useEffect } from 'react';

const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF',
  red: '#E74C3C'
};

export default function SectorHeatmap() {
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSectorHeatmap();
  }, []);

  async function fetchSectorHeatmap() {
    try {
      const response = await fetch('/api/sector-heatmap');
      if (!response.ok) throw new Error('Failed to fetch sector data');
      const data = await response.json();
      setHeatmapData(data.sectors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getColorIntensity(value, min, max) {
    if (value === null || value === undefined) return colors.dark;
    
    const normalized = (value - min) / (max - min);
    const intensity = Math.max(0.1, Math.min(0.9, normalized));
    
    if (value >= 0) {
      // Green for positive values
      return `rgba(0, 184, 148, ${intensity})`;
    } else {
      // Red for negative values
      return `rgba(231, 76, 60, ${intensity})`;
    }
  }

  function getRSIColor(rsi) {
    if (rsi === null || rsi === undefined) return colors.dark;
    if (rsi > 70) return colors.red;
    if (rsi < 30) return colors.green;
    return colors.orange;
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 20 }}>Loading sector heatmap...</div>;
  if (error) return <div style={{ color: colors.red, textAlign: 'center', padding: 20 }}>Error: {error}</div>;
  if (!heatmapData || heatmapData.length === 0) return <div style={{ textAlign: 'center', padding: 20 }}>No sector data available</div>;

  const profitValues = heatmapData.map(s => s.avgProfitPercent).filter(v => v != null);
  const minProfit = Math.min(...profitValues);
  const maxProfit = Math.max(...profitValues);

  const volatilityValues = heatmapData.map(s => s.avgVolatility).filter(v => v != null);
  const minVolatility = Math.min(...volatilityValues);
  const maxVolatility = Math.max(...volatilityValues);

  return (
    <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: `${colors.dark}12`, fontWeight: 700 }}>Sector Performance Heatmap</div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {heatmapData.map((sector, index) => (
            <div 
              key={sector.sector}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 10,
                border: `1px solid ${colors.dark}15`,
                background: index % 2 === 0 ? `${colors.white}` : `${colors.dark}05`,
                alignItems: 'center'
              }}
            >
              {/* Sector Name */}
              <div style={{ fontWeight: 600, color: colors.dark }}>
                {sector.sector}
              </div>
              
              {/* Profit % */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Avg Profit %</div>
                <div 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    color: sector.avgProfitPercent > 0 ? colors.green : colors.red,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: getColorIntensity(sector.avgProfitPercent, minProfit, maxProfit),
                    color: colors.white
                  }}
                >
                  {sector.avgProfitPercent?.toFixed(2)}%
                </div>
              </div>
              
              {/* Volatility */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Avg Volatility</div>
                <div 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    color: colors.orange,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: getColorIntensity(sector.avgVolatility, minVolatility, maxVolatility),
                    color: colors.white
                  }}
                >
                  {sector.avgVolatility?.toFixed(2)}
                </div>
              </div>
              
              {/* RSI */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Avg RSI</div>
                <div 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    color: getRSIColor(sector.avgRSI),
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: `${getRSIColor(sector.avgRSI)}20`,
                    border: `1px solid ${getRSIColor(sector.avgRSI)}`
                  }}
                >
                  {sector.avgRSI?.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div style={{ marginTop: 20, padding: 16, backgroundColor: `${colors.dark}05`, borderRadius: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: colors.dark }}>Legend</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Profit % Colors</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, backgroundColor: colors.red, borderRadius: 4 }}></div>
                <span style={{ fontSize: 12 }}>Negative</span>
                <div style={{ width: 20, height: 20, backgroundColor: colors.green, borderRadius: 4 }}></div>
                <span style={{ fontSize: 12 }}>Positive</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>RSI Levels</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, backgroundColor: colors.red, borderRadius: 4 }}></div>
                <span style={{ fontSize: 12 }}>Overbought (&gt;70)</span>
                <div style={{ width: 20, height: 20, backgroundColor: colors.green, borderRadius: 4 }}></div>
                <span style={{ fontSize: 12 }}>Oversold (&lt;30)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
