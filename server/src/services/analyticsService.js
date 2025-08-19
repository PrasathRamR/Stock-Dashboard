import path from 'path';
import { readManifestRows, buildStockCsvPath, streamCsvRows, coerceNumber, coerceDate } from './csvUtils.js';

export async function loadManifestSymbols() {
  const rows = await readManifestRows();
  console.log('Manifest rows:', rows.slice(0, 5), '... total:', rows.length);
  // Normalize possible column names: symbol, name, sector
  const mapped = rows.map((r) => ({
    symbol: (r.symbol || r.SYMBOL || r.ticker || r.Ticker || r.code || '').toString().trim(),
    name: (r.name || r.NAME || r.company || r.Company || r.description || '').toString().trim(),
    sector: (r.sector || r.SECTOR || r.industry || r.Industry || '').toString().trim(),
  })).filter(r => r.symbol);
  console.log('Mapped manifest symbols:', mapped.slice(0, 5), '... total:', mapped.length);
  return mapped;
}

export async function fuzzySearch(manifestSymbols, query) {
  const q = query.toLowerCase();
  return manifestSymbols
    .filter(s => s.symbol.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q)))
    .slice(0, 25);
}

async function readStockTimeseries(stockName) {
  const filePath = buildStockCsvPath(stockName);
  const rows = [];
  await streamCsvRows(filePath, (row) => {
    const date = coerceDate(row.date || row.DATE || row.timestamp || row.Timestamp);
    const open = coerceNumber(row.open || row.OPEN || row.Open);
    const high = coerceNumber(row.high || row.HIGH || row.High);
    const low = coerceNumber(row.low || row.LOW || row.Low);
    const close = coerceNumber(row.close || row.CLOSE || row.Close);
    const prevClose = coerceNumber(row.prev_close || row.PREVCLOSE || row.PrevClose || row["Prev Close"]);
    const volume = coerceNumber(row.volume || row.VOLUME || row.Volume);
    const sector = (row.sector || row.SECTOR || '').toString();
    const name = (row.name || row.NAME || row.Company || '').toString();
    const news = row.news || row.sentiment || row.SENTIMENT || null;
    if (date && close != null) {
      rows.push({ date, open, high, low, close, prevClose, volume, sector, name, news });
    }
  });
  rows.sort((a, b) => a.date - b.date);
  console.log(`Stock: ${stockName}, file: ${filePath}, rows:`, rows.slice(0, 3), '... total:', rows.length);
  return rows;
}

function computeProfitPercent(timeSeries) {
  if (!timeSeries || timeSeries.length < 2) return null;
  const first = timeSeries[0];
  const last = timeSeries[timeSeries.length - 1];
  if (first.close == null || last.close == null) return null;
  return ((last.close - first.close) / first.close) * 100;
}

function computeVolatility(timeSeries) {
  const closes = timeSeries.map(r => r.close).filter(v => v != null);
  if (closes.length < 2) return null;
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance = closes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (closes.length - 1);
  return Math.sqrt(variance);
}

function computeAverageVolume(timeSeries) {
  const vols = timeSeries.map(r => r.volume).filter(v => v != null);
  if (!vols.length) return null;
  return vols.reduce((a, b) => a + b, 0) / vols.length;
}

function computeSentimentSignal(timeSeries) {
  // crude sentiment positivity ratio if present
  const vals = timeSeries.map(r => r.news).filter(Boolean).map(String);
  if (!vals.length) return null;
  let pos = 0; let neg = 0;
  for (const v of vals) {
    const t = v.toLowerCase();
    if (t.includes('positive') || t.includes('bull') || t.includes('buy')) pos++;
    if (t.includes('negative') || t.includes('bear') || t.includes('sell')) neg++;
  }
  if (pos + neg === 0) return null;
  return (pos - neg) / (pos + neg);
}

export async function computeTopFive(manifestSymbols) {
  const bounded = manifestSymbols.slice(0, 200);
  const concurrency = 12;
  const results = [];
  for (let i = 0; i < bounded.length; i += concurrency) {
    const batch = bounded.slice(i, i + concurrency);
    const batchRes = await Promise.all(batch.map(async (s) => {
      const ts = await readStockTimeseries(s.symbol);
      const profitPercent = computeProfitPercent(ts);
      return profitPercent == null ? null : { symbol: s.symbol, name: s.name, profitPercent };
    }));
    results.push(...batchRes.filter(Boolean));
  }
  results.sort((a, b) => (b.profitPercent ?? -Infinity) - (a.profitPercent ?? -Infinity));
  return results.slice(0, 5);
}

export async function computeAnalyticsGrid(manifestSymbols) {
  const sample = manifestSymbols.slice(0, 120);
  const concurrency = 12;
  const loaded = [];
  for (let i = 0; i < sample.length; i += concurrency) {
    const batch = sample.slice(i, i + concurrency);
    const part = await Promise.all(batch.map(async (s) => {
      const ts = await readStockTimeseries(s.symbol);
      return { s, ts };
    }));
    loaded.push(...part);
  }

  const sectorPerf = new Map();
  for (const { s, ts } of loaded) {
    const profit = computeProfitPercent(ts);
    if (profit == null) continue;
    const sector = s.sector || (ts.find(r => r.sector)?.sector) || 'Unknown';
    const cur = sectorPerf.get(sector) || { sector, total: 0, count: 0 };
    cur.total += profit; cur.count += 1; sectorPerf.set(sector, cur);
  }
  const sectorPerformance = Array.from(sectorPerf.values()).map(x => ({ sector: x.sector, avgProfitPercent: x.total / x.count }))
    .sort((a, b) => (b.avgProfitPercent ?? -Infinity) - (a.avgProfitPercent ?? -Infinity))
    .slice(0, 10);

  const volVol = loaded.map(({ s, ts }) => ({
    symbol: s.symbol,
    avgVolume: computeAverageVolume(ts),
    volatility: computeVolatility(ts)
  })).filter(v => v.avgVolume != null && v.volatility != null)
    .sort((a, b) => (b.avgVolume * b.volatility) - (a.avgVolume * a.volatility))
    .slice(0, 10);

  const sentimentEffect = loaded.map(({ s, ts }) => ({
    symbol: s.symbol,
    sentimentSignal: computeSentimentSignal(ts),
    profitPercent: computeProfitPercent(ts)
  })).filter(v => v.sentimentSignal != null && v.profitPercent != null)
    .sort((a, b) => (b.sentimentSignal * b.profitPercent) - (a.sentimentSignal * a.profitPercent))
    .slice(0, 10);

  const fundamentals = loaded.map(({ s, ts }) => ({
    symbol: s.symbol,
    dividendYield: null,
    peRatio: null,
    profitPercent: computeProfitPercent(ts)
  })).filter(v => v.profitPercent != null)
    .sort((a, b) => b.profitPercent - a.profitPercent)
    .slice(0, 10);

  return {
    sectorPerformance,
    volumeVolatility: volVol,
    sentimentEffect,
    fundamentals
  };
}

export async function loadStockAnalytics(manifestSymbols, symbol) {
  const meta = manifestSymbols.find(m => m.symbol.toLowerCase() === symbol.toLowerCase());
  if (!meta) return null;
  const ts = await readStockTimeseries(meta.symbol);
  const profitPercent = computeProfitPercent(ts);
  const volatility = computeVolatility(ts);
  const avgVolume = computeAverageVolume(ts);
  const sentimentSignal = computeSentimentSignal(ts);

  const futurePotential = profitPercent != null && profitPercent > 50 && (sentimentSignal == null || sentimentSignal >= 0);

  return {
    symbol: meta.symbol,
    name: meta.name,
    sector: meta.sector || (ts.find(r => r.sector)?.sector) || 'Unknown',
    metrics: {
      profitPercent,
      volatility,
      avgVolume,
      sentimentSignal
    },
    futurePotential,
    sample: ts.slice(-30),
    timeseries: ts // full time series for charting
  };
}


