import { z } from 'zod';

/** Configuración validada al arrancar: si falta algo crítico, la API no levanta a medias. */
const Env = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD debe tener al menos 8 caracteres'),
  UPLOAD_DIR: z.string().default('./uploads'),
  WOMPI_PUBLIC_KEY: z.string().default(''),
  WOMPI_INTEGRITY_SECRET: z.string().default(''),
  WOMPI_EVENTS_SECRET: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('Pimentones La Cajita <pedidos@pimentoneslacajita.com>'),
  MAIL_NOTIFY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  PENDING_ORDER_TTL_MINUTES: z.coerce.number().default(120),
  NODE_ENV: z.string().default('development'),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const e = Env.parse(process.env);
  return {
    port: e.PORT,
    env: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    publicUrl: e.PUBLIC_URL,
    corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()),
    jwtSecret: e.JWT_SECRET,
    uploadDir: e.UPLOAD_DIR,
    admin: { email: e.ADMIN_EMAIL.toLowerCase(), password: e.ADMIN_PASSWORD },
    wompi: {
      publicKey: e.WOMPI_PUBLIC_KEY, integritySecret: e.WOMPI_INTEGRITY_SECRET, eventsSecret: e.WOMPI_EVENTS_SECRET,
      enabled: Boolean(e.WOMPI_PUBLIC_KEY && e.WOMPI_INTEGRITY_SECRET),
      apiBase: e.WOMPI_PUBLIC_KEY.startsWith('pub_prod_') ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1',
    },
    smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.MAIL_FROM, notify: e.MAIL_NOTIFY },
    anthropic: { apiKey: e.ANTHROPIC_API_KEY, model: e.ANTHROPIC_MODEL },
    pendingOrderTtlMinutes: e.PENDING_ORDER_TTL_MINUTES,
  };
}
