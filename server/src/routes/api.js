import { Router } from 'express';
import {
  loadManifestSymbols,
  fuzzySearch,
  computeTopFive,
  computeAnalyticsGrid,
  loadStockAnalytics
} from '../services/analyticsService.js';

export function createApiRouter() {
  const router = Router();

  router.get('/health', async (req, res) => {
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

  return router;
}


