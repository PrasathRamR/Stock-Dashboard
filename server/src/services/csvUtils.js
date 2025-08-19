import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import csv from 'csv-parser';


function getRootPath() {
  return "c:\\Prasath\\Interview_project\\Datasets\\SCRIP";
}

console.log(process.env.ROOT_PATH);

function getManifestPath() {
  return "c:\\Prasath\\Interview_project\\Datasets\\manifest.csv";
}

function logEnv() {
  console.log('ROOT_PATH:',getRootPath(), 'MANIFEST_PATH:', getManifestPath());
}
logEnv();

export function validateEnv() {
  const ROOT_PATH = getRootPath();
  const MANIFEST_PATH = getManifestPath();
  if (!ROOT_PATH || !MANIFEST_PATH) {
    const e = new Error('ROOT_PATH and MANIFEST_PATH must be set via .env');
    e.statusCode = 500;
    throw e;
  }
}

export async function readManifestRows() {
  validateEnv();
  const MANIFEST_PATH = getManifestPath();
  // Debug: print first bytes of manifest file
  const raw = fs.readFileSync(MANIFEST_PATH);
  console.log('First bytes of manifest:', raw.slice(0, 40));
  const results = [];
  const readStream = fs.createReadStream(MANIFEST_PATH);
  const parser = csv();
  parser.on('data', (row) => {
    results.push(row);
  });
  await pipeline(readStream, parser);
  return results;
}

export function buildStockCsvPath(stockNameFromManifest) {
  validateEnv();
  const ROOT_PATH = getRootPath();
  // Ensure Windows-style path as requested
  return path.join(ROOT_PATH, `${stockNameFromManifest}.csv`);
}

export async function streamCsvRows(filePath, onRow) {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath);
    const parser = csv();
    let first = true;
    parser.on('data', (row) => {
      // Normalize keys: lowercase, remove spaces
      const normRow = {};
      for (const k in row) {
        normRow[k.toLowerCase().replace(/\s+/g, '')] = row[k];
      }
      if (first) {
        console.log('First row in', filePath, ':', normRow);
        first = false;
      }
      try {
        onRow(normRow);
      } catch (err) {
        // swallow row-level errors but continue
      }
    });
    parser.on('end', () => resolve());
    parser.on('error', (err) => resolve()); // resolve to be tolerant of bad files
    stream.on('error', (err) => resolve()); // tolerate missing files
    stream.pipe(parser);
  });
}

export function coerceNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function coerceDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}


