import express from 'express';
import { getPool } from './db.js';
const app = express();
app.use(express.json());
app.get('/health', (_req,res)=>res.json({ok:true}));
app.get('/files', async (_req,res)=>{
  try {
    const pool = await getPool();
    const q = await pool.query('SELECT id, filename, s3_key, size, created_at FROM files ORDER BY created_at DESC');
    res.json(q.rows);
  } catch(e){ console.error(e); res.status(500).json({error:'db_error'}); }
});
app.post('/notify', async (req,res)=>{
  const { key, filename, size } = req.body || {};
  if(!key || !filename) return res.status(400).json({ error: 'missing' });
  try{
    const pool = await getPool();
    const ins = await pool.query('INSERT INTO files(filename, s3_key, size) VALUES($1,$2,$3) RETURNING id, created_at', [filename, key, size || 0]);
    res.json({ ok:true, id: ins.rows[0].id, created_at: ins.rows[0].created_at });
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});
const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('listening', port));
