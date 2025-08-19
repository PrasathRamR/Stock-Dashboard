import { Router } from 'express';
import path from 'path';
import fs from 'fs';

export function createStaticRouter() {
  const router = Router();
  const distDir = path.resolve(process.cwd(), 'client-dist');
  router.get('/', async (req, res) => {
    const indexPath = path.join(distDir, 'index.html');
    fs.createReadStream(indexPath).on('error', () => res.status(404).end()).pipe(res);
  });
  router.use((req, res, next) => {
    const filePath = path.join(distDir, req.path);
    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) return next();
      fs.createReadStream(filePath).pipe(res);
    });
  });
  return router;
}


