import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import mysql from 'mysql2/promise';

const sm = new SecretsManagerClient({});
let pool;

export async function getPool() {
  if (pool) return pool;

  const secretId = process.env.DB_SECRET_ID;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
  const s = JSON.parse(res.SecretString);

  pool = mysql.createPool({
    host: s.host,
    port: s.port,
    user: s.username,
    password: s.password,
    database: s.dbname,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}
