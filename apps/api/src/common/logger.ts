import type { Params } from 'nestjs-pino';

/** Logs JSON en producción; legibles (pino-pretty) solo si se pide con LOG_PRETTY=true en desarrollo. */
export function loggerParams(): Params {
  const pretty = process.env.LOG_PRETTY === 'true' && process.env.NODE_ENV !== 'production';
  return { pinoHttp: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transport: pretty ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    autoLogging: { ignore: (req) => req.url === '/api/health' },
  } };
}
