
import path from 'path';
import { readManifestRows, buildStockCsvPath, streamCsvRows, coerceNumber, coerceDate } from './csvUtils.js';
import { 
  computeRSI, 
  computeMACD, 
  computeBollingerBands, 
  computeMovingAverages, 
  computeVolumeAnalysis 
} from './technicalIndicators.js';

// In-memory cache for stock timeseries
const stockTimeseriesCache = new Map();

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
  if (stockTimeseriesCache.has(stockName)) {
    return stockTimeseriesCache.get(stockName);
  }
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
  stockTimeseriesCache.set(stockName, rows);
  // Optionally, limit cache size or implement LRU if needed
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
  const concurrency = 12;
  // Cache for first 750 stocks
  const firstBatch = manifestSymbols.slice(0, 750);
  const loadedFirst = [];
  for (let i = 0; i < firstBatch.length; i += concurrency) {
    const batch = firstBatch.slice(i, i + concurrency);
    const part = await Promise.all(batch.map(async (s) => {
      const ts = await readStockTimeseries(s.symbol);
      return { s, ts };
    }));
    loadedFirst.push(...part);
  }

  // Load next 750 stocks
  const secondBatch = manifestSymbols.slice(750, 1500);
  const loadedSecond = [];
  for (let i = 0; i < secondBatch.length; i += concurrency) {
    const batch = secondBatch.slice(i, i + concurrency);
    const part = await Promise.all(batch.map(async (s) => {
      const ts = await readStockTimeseries(s.symbol);
      return { s, ts };
    }));
    loadedSecond.push(...part);
  }

  // Merge both batches
  const loaded = [...loadedFirst, ...loadedSecond];

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

  // Calculate 30-day profit percent for each stock
  const thirtyDayResults = loaded.map(({ s, ts }) => {
    if (!ts || ts.length < 2) return null;
    const last30 = ts.slice(-30);
    if (last30.length < 2) return null;
    const first = last30[0];
    const last = last30[last30.length - 1];
    if (first.close == null || last.close == null) return null;
    const profitPercent = ((last.close - first.close) / first.close) * 100;
    return { symbol: s.symbol, name: s.name, profitPercent };
  }).filter(Boolean);

  const thirtyDayGainers = [...thirtyDayResults]
    .sort((a, b) => (b.profitPercent ?? -Infinity) - (a.profitPercent ?? -Infinity))
    .slice(0, 5);
  const thirtyDayLosers = [...thirtyDayResults]
    .sort((a, b) => (a.profitPercent ?? Infinity) - (b.profitPercent ?? Infinity))
    .slice(0, 5);

  return {
    sectorPerformance,
    volumeVolatility: volVol,
    sentimentEffect,
    fundamentals,
    thirtyDayGainers,
    thirtyDayLosers
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

// New technical indicator endpoints
export async function getStockTechnicalIndicators(symbol) {
  try {
    const [rsi, macdRaw, bbRaw, maRaw, volume] = await Promise.all([
      computeRSI(symbol),
      computeMACD(symbol),
      computeBollingerBands(symbol),
      computeMovingAverages(symbol),
      computeVolumeAnalysis(symbol)
    ]);

    // MACD values array for plotting
    let macd = null;
    if (macdRaw && macdRaw.macdLine && macdRaw.signalLine) {
      macd = {
        ...macdRaw,
        values: macdRaw.macdLine.map((macdVal, i) => ({
          macd: macdVal,
          signal: macdRaw.signalLine[i],
          histogram: macdRaw.histogram[i],
          date: i // No date info, so use index
        }))
      };
    }

    // Bollinger Bands values array for plotting
    let bollingerBands = null;
    if (bbRaw && bbRaw.bands) {
      bollingerBands = {
        ...bbRaw,
        values: bbRaw.bands.map(b => ({
          upper: b.upperBand,
          middle: b.sma,
          lower: b.lowerBand,
          bandwidth: b.bandwidth,
          date: b.date // This is actually the close price, but no real date available
        }))
      };
    }

    // Moving Averages values array for plotting
    let movingAverages = null;
    if (maRaw && maRaw.movingAverages) {
      // Compose a values array with all available periods (e.g., 20, 50, 200)
      const periods = Object.keys(maRaw.movingAverages).map(Number).sort((a, b) => a - b);
      // Use the longest period's ema array as the base for length
      const basePeriod = periods[periods.length - 1];
      const baseArr = maRaw.movingAverages[basePeriod]?.ema || [];
      const values = baseArr.map((_, i) => {
        const entry = { date: i };
        periods.forEach(p => {
          entry[`ma${p}`] = maRaw.movingAverages[p]?.ema[i] ?? null;
        });
        return entry;
      });
      movingAverages = {
        ...maRaw,
        values
      };
    }

    return {
      symbol,
      rsi,
      macd,
      bollingerBands,
      movingAverages,
      volumeAnalysis: volume
    };
  } catch (error) {
    console.error(`Error computing technical indicators for ${symbol}:`, error);
    return null;
  }
}

export async function getSectorHeatmap(manifestSymbols) {
  const sample = manifestSymbols.slice(0, 100);
  const concurrency = 12;
  const sectorData = new Map();

  for (let i = 0; i < sample.length; i += concurrency) {
    const batch = sample.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(async (s) => {
      try {
        const [ts, rsi] = await Promise.all([
          readStockTimeseries(s.symbol),
          computeRSI(s.symbol)
        ]);
        
        const profitPercent = computeProfitPercent(ts);
        const volatility = computeVolatility(ts);
        
        return {
          symbol: s.symbol,
          sector: s.sector || 'Unknown',
          profitPercent,
          volatility,
          rsi: rsi?.current
        };
      } catch (error) {
        return null;
      }
    }));

    for (const result of batchResults.filter(Boolean)) {
      const sector = result.sector;
      if (!sectorData.has(sector)) {
        sectorData.set(sector, {
          sector,
          stocks: [],
          avgProfitPercent: 0,
          avgVolatility: 0,
          avgRSI: 0,
          count: 0
        });
      }

      const sectorInfo = sectorData.get(sector);
      sectorInfo.stocks.push(result);
      sectorInfo.count++;
    }
  }

  // Calculate averages for each sector
  for (const sectorInfo of sectorData.values()) {
    const validStocks = sectorInfo.stocks.filter(s => 
      s.profitPercent != null && s.volatility != null && s.rsi != null
    );

    if (validStocks.length > 0) {
      sectorInfo.avgProfitPercent = validStocks.reduce((sum, s) => sum + s.profitPercent, 0) / validStocks.length;
      sectorInfo.avgVolatility = validStocks.reduce((sum, s) => sum + s.volatility, 0) / validStocks.length;
      sectorInfo.avgRSI = validStocks.reduce((sum, s) => sum + s.rsi, 0) / validStocks.length;
    }
  }

  return Array.from(sectorData.values())
    .filter(s => s.count > 0)
    .sort((a, b) => b.avgProfitPercent - a.avgProfitPercent);
}

export async function getPerformanceComparison(symbols, timeframe = '30d') {
  const results = [];
  
  for (const symbol of symbols) {
    try {
      const ts = await readStockTimeseries(symbol);
      if (!ts || ts.length < 2) continue;

      let startIndex = 0;
      if (timeframe === '7d') startIndex = Math.max(0, ts.length - 7);
      else if (timeframe === '30d') startIndex = Math.max(0, ts.length - 30);
      else if (timeframe === '90d') startIndex = Math.max(0, ts.length - 90);

      const relevantData = ts.slice(startIndex);
      if (relevantData.length < 2) continue;

      const first = relevantData[0];
      const last = relevantData[relevantData.length - 1];
      const profitPercent = ((last.close - first.close) / first.close) * 100;
      const volatility = computeVolatility(relevantData);
      const avgVolume = computeAverageVolume(relevantData);

      results.push({
        symbol,
        profitPercent,
        volatility,
        avgVolume,
        startPrice: first.close,
        endPrice: last.close,
        dataPoints: relevantData.length
      });
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }

  return results.sort((a, b) => b.profitPercent - a.profitPercent);
}

export async function getOHLCData(symbol, startDate = null, endDate = null, limit = 100) {
  try {
    const ts = await readStockTimeseries(symbol);
    if (!ts || ts.length === 0) return null;

    let filteredData = ts;

    // Apply date filtering if provided
    if (startDate) {
      const start = new Date(startDate);
      filteredData = filteredData.filter(row => row.date >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredData = filteredData.filter(row => row.date <= end);
    }

    // Apply limit and return OHLC format
    const ohlcData = filteredData
      .slice(-limit)
      .map(row => ({
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume
      }));

    return {
      symbol,
      data: ohlcData,
      count: ohlcData.length,
      startDate: ohlcData[0]?.date,
      endDate: ohlcData[ohlcData.length - 1]?.date
    };
  } catch (error) {
    console.error(`Error getting OHLC data for ${symbol}:`, error);
    return null;
  }
}


