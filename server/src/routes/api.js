import { Router } from 'express';
import {
  loadManifestSymbols,
  fuzzySearch,
  computeTopFive,
  computeAnalyticsGrid,
  loadStockAnalytics,
  getStockTechnicalIndicators,
  getSectorHeatmap,
  getPerformanceComparison,
  getOHLCData
} from '../services/analyticsService.js';

export function createApiRouter() {
  const router = Router();

  router.get('/health', async (req, res, next) => {
    res.json({ ok: true });
  });

  router.get('/search', async (req, res, next) => {
    try {
      const query = (req.query.query || '').toString();
      if (!query) return res.json({ results: [] });
      const manifest = await loadManifestSymbols();
      const results = await fuzzySearch(manifest, query);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  router.get('/top-five', async (req, res, next) => {
    try {
      const manifest = await loadManifestSymbols();
      const results = await computeTopFive(manifest);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  router.get('/analytics', async (req, res, next) => {
    try {
      const manifest = await loadManifestSymbols();
      const results = await computeAnalyticsGrid(manifest);
      res.json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get('/stock/:symbol', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      const manifest = await loadManifestSymbols();
      const result = await loadStockAnalytics(manifest, symbol);
      if (!result) return res.status(404).json({ error: { message: 'Stock not found' } });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // New technical indicator endpoints
  router.get('/stock/:symbol/indicators', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      
      const indicators = await getStockTechnicalIndicators(symbol);
      if (!indicators) return res.status(404).json({ error: { message: 'Stock not found or no data available' } });
      
      res.json(indicators);
    } catch (err) {
      next(err);
    }
  });

  router.get('/sector-heatmap', async (req, res, next) => {
    try {
      const manifest = await loadManifestSymbols();
      const heatmap = await getSectorHeatmap(manifest);
      res.json({ sectors: heatmap });
    } catch (err) {
      next(err);
    }
  });

  router.get('/performance-comparison', async (req, res, next) => {
    try {
      const symbols = (req.query.symbols || '').toString().split(',').filter(s => s.trim());
      const timeframe = (req.query.timeframe || '30d').toString();
      
      if (symbols.length === 0) {
        return res.status(400).json({ error: { message: 'At least one symbol required' } });
      }
      
      if (symbols.length > 10) {
        return res.status(400).json({ error: { message: 'Maximum 10 symbols allowed' } });
      }
      
      const comparison = await getPerformanceComparison(symbols, timeframe);
      res.json({ comparison, timeframe, symbols });
    } catch (err) {
      next(err);
    }
  });

  router.get('/stock/:symbol/ohlc', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const limit = parseInt(req.query.limit) || 100;
      
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      if (limit > 500) return res.status(400).json({ error: { message: 'Maximum limit is 500' } });
      
      const ohlcData = await getOHLCData(symbol, startDate, endDate, limit);
      if (!ohlcData) return res.status(404).json({ error: { message: 'Stock not found or no data available' } });
      
      res.json(ohlcData);
    } catch (err) {
      next(err);
    }
  });

  // Technical indicator specific endpoints
  router.get('/stock/:symbol/rsi', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      const period = parseInt(req.query.period) || 14;
      
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      if (period < 5 || period > 50) return res.status(400).json({ error: { message: 'Period must be between 5 and 50' } });
      
      const { computeRSI } = await import('../services/technicalIndicators.js');
      const rsi = await computeRSI(symbol, period);
      
      if (!rsi) return res.status(404).json({ error: { message: 'Stock not found or insufficient data' } });
      
      res.json({ symbol, period, rsi });
    } catch (err) {
      next(err);
    }
  });

  router.get('/stock/:symbol/macd', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      const fastPeriod = parseInt(req.query.fastPeriod) || 12;
      const slowPeriod = parseInt(req.query.slowPeriod) || 26;
      const signalPeriod = parseInt(req.query.signalPeriod) || 9;
      
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      
      const { computeMACD } = await import('../services/technicalIndicators.js');
      const macd = await computeMACD(symbol, fastPeriod, slowPeriod, signalPeriod);
      
      if (!macd) return res.status(404).json({ error: { message: 'Stock not found or insufficient data' } });
      
      res.json({ symbol, fastPeriod, slowPeriod, signalPeriod, macd });
    } catch (err) {
      next(err);
    }
  });

  router.get('/stock/:symbol/bollinger-bands', async (req, res, next) => {
    try {
      const symbol = (req.params.symbol || '').toString();
      const period = parseInt(req.query.period) || 20;
      const stdDev = parseFloat(req.query.stdDev) || 2;
      
      if (!symbol) return res.status(400).json({ error: { message: 'symbol required' } });
      if (period < 10 || period > 100) return res.status(400).json({ error: { message: 'Period must be between 10 and 100' } });
      if (stdDev < 0.5 || stdDev > 5) return res.status(400).json({ error: { message: 'Standard deviation must be between 0.5 and 5' } });
      
      const { computeBollingerBands } = await import('../services/technicalIndicators.js');
      const bb = await computeBollingerBands(symbol, period, stdDev);
      
      if (!bb) return res.status(404).json({ error: { message: 'Stock not found or insufficient data' } });
      
      res.json({ symbol, period, stdDev, bollingerBands: bb });
    } catch (err) {
      next(err);
    }
  });

  return router;
}


