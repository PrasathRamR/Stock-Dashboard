import React, { useState } from 'react';

export const metricDescriptions = {
  profit: 'The percentage gain or loss in stock price over the last 50 days.',
  volatility: 'A measure of how much the stock price fluctuates over the last 50 days.',
  futurePotential: 'An estimate of the stock\'s growth potential based on technical and historical data.',
  rsi: 'Relative Strength Index: Indicates if a stock is overbought or oversold.',
  macd: 'Moving Average Convergence Divergence: Shows trend direction and momentum.',
  bollinger: 'Bollinger Bands: Shows price volatility and potential overbought/oversold conditions.',
  movingAvg: 'Moving Averages: Shows average price over a period to identify trends.',
};

export function MetricInfo({ description }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#eee',
          color: '#333',
          fontSize: 12,
          textAlign: 'center',
          lineHeight: '16px',
          cursor: 'pointer',
          border: '1px solid #ccc',
          fontWeight: 700,
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        tabIndex={0}
        aria-label="Info"
      >i</span>
      {show && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 0,
            background: '#fff',
            color: '#222',
            border: '1px solid #aaa',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            zIndex: 100,
            minWidth: 180,
            boxShadow: '0 2px 8px #0002',
            whiteSpace: 'normal',
          }}
        >
          {description}
        </div>
      )}
    </span>
  );
}
