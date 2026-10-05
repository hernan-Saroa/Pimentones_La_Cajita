import { CanActivate, ExecutionContext, Inject, Injectable, Logger, OnModuleInit, SetMetadata, UnauthorizedException, ForbiddenException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { AdminRole } from '@lacajita/shared';
import { DB, type Db } from '../db/db.module';
import { adminUsers } from '../db/schema';
import { loadConfig } from '../config/config';

export interface AdminIdentity { id: number; email: string; name: string; role: AdminRole }
const RANK: Record<AdminRole, number> = { viewer: 0, ops: 1, admin: 2, owner: 3 };

/** Hash de contraseñas con scrypt (sin dependencias nativas). Formato: salt:hash. */
export const hashPassword = (pw: string) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`; };
export const verifyPassword = (pw: string, stored: string) => {
  const [salt, hash] = stored.split(':'); if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'), b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
};

@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly log = new Logger(AdminAuthService.name);
  constructor(private readonly jwt: JwtService, @Inject(DB) private readonly db: Db) {}

  /** Primer arranque: crea el propietario con las credenciales del entorno. Después, los usuarios viven en la base de datos. */
  async onModuleInit() {
    const [{ n }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(adminUsers);
    if (n > 0) return;
    const { email, password } = loadConfig().admin;
    await this.db.insert(adminUsers).values({ email, name: 'Propietario', passwordHash: hashPassword(password), role: 'owner' });
    this.log.log(`Usuario propietario creado: ${email}`);
  }

  async login(email: string, password: string): Promise<{ token: string; user: AdminIdentity }> {
    const [u] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase()));
    if (!u || !u.active || !verifyPassword(password, u.passwordHash)) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, u.id));
    const user: AdminIdentity = { id: u.id, email: u.email, name: u.name, role: u.role as AdminRole };
    return { token: this.jwt.sign({ sub: u.id, email: u.email, name: u.name, role: u.role }), user };
  }
}

export const ROLES_KEY = 'roles';
/** Rol mínimo para una ruta. Sin decorador: cualquier usuario autenticado (viewer solo lee). */
export const MinRole = (role: AdminRole) => SetMetadata(ROLES_KEY, role);
export const Actor = createParamDecorator((_: unknown, ctx: ExecutionContext): AdminIdentity => (ctx.switchToHttp().getRequest() as FastifyRequest & { user: AdminIdentity }).user);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: AdminIdentity }>();
    const h = req.headers.authorization ?? '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) throw new UnauthorizedException('Inicia sesión para continuar.');
    let p: { sub: number; email: string; name: string; role: AdminRole };
    try { p = this.jwt.verify(token); } catch { throw new UnauthorizedException('La sesión expiró. Inicia sesión de nuevo.'); }
    req.user = { id: p.sub, email: p.email, name: p.name, role: p.role };
    // Lectura para todos; escritura según rol mínimo (ops por defecto).
    const min = this.reflector.getAllAndOverride<AdminRole | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) ?? (req.method === 'GET' ? 'viewer' : 'ops');
    if (RANK[p.role] < RANK[min]) throw new ForbiddenException('Tu rol no permite esta acción.');
    return true;
  }
}
