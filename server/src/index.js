import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createApiRouter } from './routes/api.js';
import { createStaticRouter } from './routes/static.js';

// Load .env from the current directory (server)
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', createApiRouter());
app.use('/', createStaticRouter());

// Async 404 handler
app.use(async (req, res) => {
  res.status(404).json({ error: { message: 'Not Found', path: req.path } });
});

// Async error handler
// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ error: { message: err.message || 'Internal Server Error' } });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


