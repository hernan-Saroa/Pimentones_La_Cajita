import { Global, Module, OnApplicationShutdown, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { loadConfig } from '../config/config';

export const DB = Symbol('DB');
export type Db = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    { provide: Pool, useFactory: () => new Pool({ connectionString: loadConfig().databaseUrl, max: 10 }) },
    { provide: DB, inject: [Pool], useFactory: (pool: Pool) => drizzle(pool, { schema }) },
  ],
  exports: [DB, Pool],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(Pool) private readonly pool: Pool) {}
  onApplicationShutdown() { return this.pool.end(); }
}
