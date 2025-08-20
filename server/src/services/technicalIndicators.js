import { streamCsvRows, buildStockCsvPath, coerceNumber, coerceDate } from './csvUtils.js';

// Cache for intermediate calculations to avoid recomputation
const indicatorCache = new Map();

function getCacheKey(symbol, indicator, params = '') {
  return `${symbol}_${indicator}_${params}`;
}

function clearCache(symbol) {
  for (const key of indicatorCache.keys()) {
    if (key.startsWith(symbol + '_')) {
      indicatorCache.delete(key);
    }
  }
}

export async function computeRSI(symbol, period = 14) {
  const cacheKey = getCacheKey(symbol, 'RSI', period);
  if (indicatorCache.has(cacheKey)) {
    return indicatorCache.get(cacheKey);
  }

  const filePath = buildStockCsvPath(symbol);
  const closes = [];
  
  await streamCsvRows(filePath, (row) => {
    const close = coerceNumber(row.close);
    if (close != null) {
      closes.push(close);
    }
  });

  if (closes.length < period + 1) {
    return null;
  }

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Calculate initial averages
  let gainSum = 0;
  let lossSum = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gainSum += changes[i];
    else lossSum += Math.abs(changes[i]);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rsiValues = [];
  
  // Calculate RSI for each period
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    let gain = 0;
    let loss = 0;
    
    if (change > 0) gain = change;
    else loss = Math.abs(change);

    // Exponential smoothing
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiValues.push({
      date: closes[i],
      value: rsi,
      avgGain,
      avgLoss
    });
  }

  const result = {
    values: rsiValues,
    current: rsiValues[rsiValues.length - 1]?.value || null,
    overbought: rsiValues.filter(v => v.value > 70).length,
    oversold: rsiValues.filter(v => v.value < 30).length
  };

  indicatorCache.set(cacheKey, result);
  return result;
}

export async function computeMACD(symbol, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const cacheKey = getCacheKey(symbol, 'MACD', `${fastPeriod}_${slowPeriod}_${signalPeriod}`);
  if (indicatorCache.has(cacheKey)) {
    return indicatorCache.get(cacheKey);
  }

  const filePath = buildStockCsvPath(symbol);
  const closes = [];
  
  await streamCsvRows(filePath, (row) => {
    const close = coerceNumber(row.close);
    if (close != null) {
      closes.push(close);
    }
  });

  if (closes.length < slowPeriod + signalPeriod) {
    return null;
  }

  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // Calculate MACD line
  const macdLine = [];
  for (let i = 0; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  // Calculate Signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate Histogram
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  const result = {
    macdLine: macdLine.slice(-30), // Last 30 values
    signalLine: signalLine.slice(-30),
    histogram: histogram.slice(-30),
    current: {
      macd: macdLine[macdLine.length - 1] || null,
      signal: signalLine[signalLine.length - 1] || null,
      histogram: histogram[histogram.length - 1] || null
    },
    crossover: detectCrossover(macdLine, signalLine)
  };

  indicatorCache.set(cacheKey, result);
  return result;
}

export async function computeBollingerBands(symbol, period = 20, stdDev = 2) {
  const cacheKey = getCacheKey(symbol, 'BB', `${period}_${stdDev}`);
  if (indicatorCache.has(cacheKey)) {
    return indicatorCache.get(cacheKey);
  }

  const filePath = buildStockCsvPath(symbol);
  const closes = [];
  
  await streamCsvRows(filePath, (row) => {
    const close = coerceNumber(row.close);
    if (close != null) {
      closes.push(close);
    }
  });

  if (closes.length < period) {
    return null;
  }

  const bands = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upperBand = sma + (stdDev * standardDeviation);
    const lowerBand = sma - (stdDev * standardDeviation);
    
    bands.push({
      date: closes[i],
      sma,
      upperBand,
      lowerBand,
      standardDeviation,
      bandwidth: (upperBand - lowerBand) / sma,
      squeeze: standardDeviation < (sma * 0.02) // 2% threshold for squeeze
    });
  }

  const result = {
    bands: bands.slice(-50), // Last 50 values
    current: bands[bands.length - 1] || null,
    squeeze: bands.filter(b => b.squeeze).length,
    avgBandwidth: bands.reduce((sum, b) => sum + b.bandwidth, 0) / bands.length
  };

  indicatorCache.set(cacheKey, result);
  return result;
}

export async function computeMovingAverages(symbol, periods = [5, 10, 20, 50]) {
  const cacheKey = getCacheKey(symbol, 'MA', periods.join('_'));
  if (indicatorCache.has(cacheKey)) {
    return indicatorCache.get(cacheKey);
  }

  const filePath = buildStockCsvPath(symbol);
  const closes = [];
  
  await streamCsvRows(filePath, (row) => {
    const close = coerceNumber(row.close);
    if (close != null) {
      closes.push(close);
    }
  });

  const movingAverages = {};
  const crossovers = [];

  for (const period of periods) {
    if (closes.length >= period) {
      const sma = calculateSMA(closes, period);
      const ema = calculateEMA(closes, period);
      
      movingAverages[period] = {
        sma: sma.slice(-30), // Last 30 values
        ema: ema.slice(-30),
        current: {
          sma: sma[sma.length - 1] || null,
          ema: ema[ema.length - 1] || null
        }
      };
    }
  }

  // Detect crossovers between different periods
  if (periods.length >= 2) {
    for (let i = 0; i < periods.length - 1; i++) {
      const shortPeriod = periods[i];
      const longPeriod = periods[i + 1];
      
      if (movingAverages[shortPeriod] && movingAverages[longPeriod]) {
        const shortEMA = movingAverages[shortPeriod].ema;
        const longEMA = movingAverages[longPeriod].ema;
        
        const crossover = detectCrossover(shortEMA, longEMA);
        if (crossover) {
          crossovers.push({
            shortPeriod,
            longPeriod,
            type: crossover.type,
            date: crossover.date
          });
        }
      }
    }
  }

  const result = {
    movingAverages,
    crossovers,
    goldenCross: crossovers.find(c => c.type === 'bullish'),
    deathCross: crossovers.find(c => c.type === 'bearish')
  };

  indicatorCache.set(cacheKey, result);
  return result;
}

export async function computeVolumeAnalysis(symbol, period = 20) {
  const cacheKey = getCacheKey(symbol, 'Volume', period);
  if (indicatorCache.has(cacheKey)) {
    return indicatorCache.get(cacheKey);
  }

  const filePath = buildStockCsvPath(symbol);
  const data = [];
  
  await streamCsvRows(filePath, (row) => {
    const close = coerceNumber(row.close);
    const volume = coerceNumber(row.volume);
    if (close != null && volume != null) {
      data.push({ close, volume });
    }
  });

  if (data.length < period) {
    return null;
  }

  const volumeAnalysis = [];
  let volumeSum = 0;
  let priceSum = 0;
  let volumePriceSum = 0;
  let volumeSquaredSum = 0;
  let priceSquaredSum = 0;

  for (let i = 0; i < data.length; i++) {
    const { close, volume } = data[i];
    
    volumeSum += volume;
    priceSum += close;
    volumePriceSum += volume * close;
    volumeSquaredSum += volume * volume;
    priceSquaredSum += close * close;

    if (i >= period - 1) {
      const avgVolume = volumeSum / period;
      const avgPrice = priceSum / period;
      
      // Calculate correlation coefficient
      const numerator = (period * volumePriceSum) - (volumeSum * priceSum);
      const denominator = Math.sqrt(
        ((period * volumeSquaredSum) - (volumeSum * volumeSum)) *
        ((period * priceSquaredSum) - (priceSum * priceSum))
      );
      
      const correlation = denominator !== 0 ? numerator / denominator : 0;
      
      // Detect volume spikes (2x average)
      const isVolumeSpike = volume > (avgVolume * 2);
      
      volumeAnalysis.push({
        date: close,
        volume,
        avgVolume,
        isVolumeSpike,
        correlation,
        volumePriceRatio: volume / close
      });

      // Remove oldest values for rolling calculation
      const oldest = data[i - period + 1];
      volumeSum -= oldest.volume;
      priceSum -= oldest.close;
      volumePriceSum -= oldest.volume * oldest.close;
      volumeSquaredSum -= oldest.volume * oldest.volume;
      priceSquaredSum -= oldest.close * oldest.close;
    }
  }

  const result = {
    analysis: volumeAnalysis.slice(-50), // Last 50 values
    current: volumeAnalysis[volumeAnalysis.length - 1] || null,
    volumeSpikes: volumeAnalysis.filter(v => v.isVolumeSpike).length,
    avgCorrelation: volumeAnalysis.reduce((sum, v) => sum + v.correlation, 0) / volumeAnalysis.length
  };

  indicatorCache.set(cacheKey, result);
  return result;
}

// Helper functions
function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);
  
  // Calculate EMA for remaining data
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }
  
  return ema;
}

function calculateSMA(data, period) {
  const sma = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  
  return sma;
}

function detectCrossover(line1, line2) {
  if (line1.length < 2 || line2.length < 2) return null;
  
  const prev1 = line1[line1.length - 2];
  const curr1 = line1[line1.length - 1];
  const prev2 = line2[line2.length - 2];
  const curr2 = line2[line2.length - 1];
  
  // Bullish crossover: line1 crosses above line2
  if (prev1 <= prev2 && curr1 > curr2) {
    return { type: 'bullish', date: curr1 };
  }
  
  // Bearish crossover: line1 crosses below line2
  if (prev1 >= prev2 && curr1 < curr2) {
    return { type: 'bearish', date: curr1 };
  }
  
  return null;
}

export function clearAllCache() {
  indicatorCache.clear();
}

export function getCacheStats() {
  return {
    size: indicatorCache.size,
    keys: Array.from(indicatorCache.keys())
  };
}
