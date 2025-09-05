import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import pkg from 'pg';
const { Pool } = pkg;
const sm = new SecretsManagerClient({});
let pool;
export async function getPool() {
  if(pool) return pool;
  const secretId = process.env.DB_SECRET_ID;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
  const s = JSON.parse(res.SecretString);
  pool = new Pool({ host:s.host, port:s.port, user:s.username, password:s.password, database:s.dbname });
  return pool;
}
