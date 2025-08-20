import React, { useState, useEffect } from 'react';
import { MetricInfo, metricDescriptions } from './components/MetricInfo';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const colors = {
  orange: '#FF9F43',
  green: '#00B894',
  blue: '#0984E3',
  dark: '#2D3436',
  white: '#FFFFFF',
  red: '#E74C3C',
  purple: '#9B59B6'
};

export default function StockAnalyticsDetails({ stockAnalytics }) {
  const [technicalData, setTechnicalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stockAnalytics?.symbol) {
      fetchTechnicalData(stockAnalytics.symbol);
    }
  }, [stockAnalytics?.symbol]);

  async function fetchTechnicalData(symbol) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stock/${symbol}/indicators`);
      if (!response.ok) throw new Error('Failed to fetch technical data');
      const data = await response.json();
      setTechnicalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!stockAnalytics) return null;

  const { symbol, name, metrics, futurePotential, timeseries } = stockAnalytics;

  // Prepare chart data from timeseries
  const chartData = timeseries?.slice(-50).map((point, index) => ({
    index,
    date: new Date(point.date).toLocaleDateString(),
    close: point.close,
    volume: point.volume
  })) || [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Stock Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ padding: 16, border: `1px solid ${colors.dark}20`, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Symbol</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.blue }}>{symbol}</div>
        </div>
        <div style={{ padding: 16, border: `1px solid ${colors.dark}20`, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Profit % <MetricInfo description={metricDescriptions.profit} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: metrics.profitPercent > 0 ? colors.green : colors.red }}>
            {metrics.profitPercent?.toFixed(2)}%
          </div>
        </div>
        <div style={{ padding: 16, border: `1px solid ${colors.dark}20`, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Volatility <MetricInfo description={metricDescriptions.volatility} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.orange }}>
            {metrics.volatility?.toFixed(2)}
          </div>
        </div>
        <div style={{ padding: 16, border: `1px solid ${colors.dark}20`, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Future Potential <MetricInfo description={metricDescriptions.futurePotential} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: futurePotential ? colors.green : colors.red }}>
            {futurePotential ? 'High' : 'Low'}
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 10, padding: 16 }}>
        <h3 style={{ margin: '0 0 16px 0', color: colors.dark }}>Price Chart (Last 50 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${colors.dark}20`} />
            <XAxis dataKey="date" stroke={colors.dark} />
            <YAxis stroke={colors.dark} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: colors.white, 
                border: `1px solid ${colors.dark}20`,
                borderRadius: 8
              }}
            />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke={colors.blue} 
              strokeWidth={2}
              dot={{ fill: colors.blue, strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Technical Indicators */}
      <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 10, padding: 16 }}>
        <h3 style={{ margin: '0 0 16px 0', color: colors.dark }}>Technical Indicators</h3>
        
        {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading technical indicators...</div>}
        {error && <div style={{ color: colors.red, textAlign: 'center', padding: 20 }}>Error: {error}</div>}
        
        {technicalData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* RSI */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 12px 0', color: colors.blue }}>
                RSI (14) <MetricInfo description={metricDescriptions.rsi} />
              </h4>
              {technicalData.rsi && (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.orange }}>
                    {technicalData.rsi.current?.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    Overbought: {technicalData.rsi.overbought} | Oversold: {technicalData.rsi.oversold}
                  </div>
                  {technicalData.rsi.values && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={technicalData.rsi.values.slice(-20)}>
                        <Line type="monotone" dataKey="value" stroke={colors.orange} strokeWidth={2} />
                        <Line type="monotone" dataKey={() => 70} stroke={colors.red} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey={() => 30} stroke={colors.green} strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* MACD */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 12px 0', color: colors.purple }}>
                MACD <MetricInfo description={metricDescriptions.macd} />
              </h4>
              {technicalData.macd && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>MACD Line</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.blue }}>
                        {technicalData.macd.current.macd?.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Signal Line</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.orange }}>
                        {technicalData.macd.current.signal?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  {technicalData.macd.values && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={technicalData.macd.values.slice(-30)}>
                        <Line type="monotone" dataKey="macd" stroke={colors.blue} strokeWidth={2} dot={false} name="MACD" />
                        <Line type="monotone" dataKey="signal" stroke={colors.orange} strokeWidth={2} dot={false} name="Signal" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {technicalData.macd.crossover && (
                    <div style={{ 
                      padding: 8, 
                      borderRadius: 6, 
                      backgroundColor: technicalData.macd.crossover.type === 'bullish' ? `${colors.green}20` : `${colors.red}20`,
                      color: technicalData.macd.crossover.type === 'bullish' ? colors.green : colors.red,
                      fontSize: 14,
                      fontWeight: 600
                    }}>
                      {technicalData.macd.crossover.type === 'bullish' ? '🟢 Bullish' : '🔴 Bearish'} Crossover
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bollinger Bands */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 12px 0', color: colors.green }}>
                Bollinger Bands (20) <MetricInfo description={metricDescriptions.bollinger} />
              </h4>
              {technicalData.bollingerBands && (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.green }}>
                    {technicalData.bollingerBands.current?.bandwidth?.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    Squeeze: {technicalData.bollingerBands.squeeze} | Avg Bandwidth: {technicalData.bollingerBands.avgBandwidth?.toFixed(4)}
                  </div>
                  {technicalData.bollingerBands.values && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={technicalData.bollingerBands.values.slice(-30)}>
                        <Line type="monotone" dataKey="upper" stroke={colors.red} strokeWidth={2} dot={false} name="Upper Band" />
                        <Line type="monotone" dataKey="middle" stroke={colors.blue} strokeWidth={2} dot={false} name="Middle Band" />
                        <Line type="monotone" dataKey="lower" stroke={colors.green} strokeWidth={2} dot={false} name="Lower Band" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* Moving Averages */}
            <div style={{ border: `1px solid ${colors.dark}15`, borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 12px 0', color: colors.dark }}>
                Moving Averages <MetricInfo description={metricDescriptions.movingAvg} />
              </h4>
              {technicalData.movingAverages && (
                <div>
                  {technicalData.movingAverages.values && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={technicalData.movingAverages.values.slice(-30)}>
                        {technicalData.movingAverages.values[0]?.ma20 && (
                          <Line type="monotone" dataKey="ma20" stroke={colors.blue} strokeWidth={2} dot={false} name="MA 20" />
                        )}
                        {technicalData.movingAverages.values[0]?.ma50 && (
                          <Line type="monotone" dataKey="ma50" stroke={colors.orange} strokeWidth={2} dot={false} name="MA 50" />
                        )}
                        {technicalData.movingAverages.values[0]?.ma200 && (
                          <Line type="monotone" dataKey="ma200" stroke={colors.purple} strokeWidth={2} dot={false} name="MA 200" />
                        )}
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {technicalData.movingAverages.goldenCross && (
                    <div style={{ 
                      padding: 8, 
                      borderRadius: 6, 
                      backgroundColor: `${colors.green}20`,
                      color: colors.green,
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8
                    }}>
                      🟢 Golden Cross Detected
                    </div>
                  )}
                  {technicalData.movingAverages.deathCross && (
                    <div style={{ 
                      padding: 8, 
                      borderRadius: 6, 
                      backgroundColor: `${colors.red}20`,
                      color: colors.red,
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8
                    }}>
                      🔴 Death Cross Detected
                    </div>
                  )}
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    Crossovers: {technicalData.movingAverages.crossovers?.length || 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Volume Analysis */}
      {technicalData?.volumeAnalysis && (
        <div style={{ border: `1px solid ${colors.dark}20`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', color: colors.dark }}>Volume Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Volume Spikes</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: colors.orange }}>
                {technicalData.volumeAnalysis.volumeSpikes}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Avg Correlation</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: colors.blue }}>
                {technicalData.volumeAnalysis.avgCorrelation?.toFixed(3)}
              </div>
            </div>
          </div>
          
          {technicalData.volumeAnalysis.analysis && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={technicalData.volumeAnalysis.analysis.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${colors.dark}20`} />
                <XAxis dataKey="date" stroke={colors.dark} />
                <YAxis stroke={colors.dark} />
                <Tooltip />
                <Bar dataKey="volume" fill={colors.blue} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
