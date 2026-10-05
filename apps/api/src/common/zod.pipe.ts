import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Valida el cuerpo con el esquema compartido y devuelve el primer error en lenguaje claro. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (r.success) return r.data;
    const f = r.error.issues[0];
    throw new BadRequestException(`Revisa ${f.path.join('.') || 'los datos'}: ${f.message}`);
  }
}
