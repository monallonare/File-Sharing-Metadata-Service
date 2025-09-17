import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { getPool } from './db.js';

const app = express();

// CORS setup
app.use(cors({
  origin: 'https://d1d4skzmg8ctcd.cloudfront.net',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Handle preflight requests for /notify
app.options('/notify', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://d1d4skzmg8ctcd.cloudfront.net');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.sendStatus(200);
});

app.use(express.json());

// Health check routes
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// GET /files - list uploaded files
app.get('/files', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, filename, s3_key, size, created_at FROM files ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error('DB error on /files:', e);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /notify - record file upload metadata
app.post('/notify', async (req, res) => {
  const { key, filename, size } = req.body || {};
  if (!key || !filename) {
    return res.status(400).json({ error: 'missing' });
  }

  try {
    const pool = await getPool();
    
    // Insert file metadata
    const [result] = await pool.query(
      'INSERT INTO files(filename, s3_key, size) VALUES(?, ?, ?)',
      [filename, key, size || 0]
    );

    const insertedId = result.insertId;

    // Fetch the inserted row to get created_at
    const [rows] = await pool.query(
      'SELECT id, created_at FROM files WHERE id = ?',
      [insertedId]
    );

    const inserted = rows[0];
    res.json({ ok: true, id: inserted.id, created_at: inserted.created_at });
  } catch (e) {
    console.error('DB error on /notify:', e);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /get-upload-url - get a signed S3 upload URL
app.post('/get-upload-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType required' });
    }

    const apiKey = 'xpHi8vDadb5Ed0WiwqN1s4bYNpTW5jxO7frgOZ3h';
    const apiGatewayUrl = 'https://uf0tva8iri.execute-api.ap-south-1.amazonaws.com/dev/upload';

    const apiResponse = await fetch(apiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ filename, contentType })
    });

    const data = await apiResponse.json();

    if (apiResponse.ok) {
      const bodyParsed = JSON.parse(data.body);
      res.json({ url: bodyParsed.url, key: bodyParsed.key });
    } else {
      res.status(apiResponse.status).json({ error: 'Failed to get presigned URL', details: data });
    }
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('✅ App listening on port', port));
