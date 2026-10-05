import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { seed } from './seed';
import { join } from 'path';

/** Aplica migraciones y datos iniciales. Idempotente: se puede correr en cada despliegue. */
export async function runMigrations(url = process.env.DATABASE_URL!) {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: join(__dirname, 'migrations') });
  await seed(db);
  await pool.end();
}

if (require.main === module) {
  runMigrations().then(() => { console.log('Migraciones aplicadas'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
