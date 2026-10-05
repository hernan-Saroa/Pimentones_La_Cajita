import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

/** Respuestas de error uniformes: { error: "mensaje" }. Los 500 se registran con detalle y se responden sin filtrar internos. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('HTTP');
  catch(ex: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<FastifyReply>();
    if (ex instanceof HttpException) {
      const body = ex.getResponse();
      const msg = typeof body === 'string' ? body : (body as any).message ?? ex.message;
      return res.status(ex.getStatus()).send({ error: Array.isArray(msg) ? msg[0] : msg });
    }
    this.log.error(ex instanceof Error ? ex.stack : String(ex));
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: 'Error interno. Intenta de nuevo en unos minutos.' });
  }
}
