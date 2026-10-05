import { createHash } from 'crypto';
import { WompiService } from '../src/payments/wompi.service';

process.env.DATABASE_URL ??= 'postgres://x:y@localhost:5432/z';
process.env.JWT_SECRET ??= 'secreto-de-prueba-largo-123';
process.env.ADMIN_EMAIL ??= 'a@b.co';
process.env.ADMIN_PASSWORD ??= 'clave-de-prueba';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('WompiService', () => {
  const w = new WompiService();
  it('firma de integridad = SHA256(ref + centavos + COP + secreto)', () => {
    expect(w.integritySignature('LC1', 7200000, 'COP', 'sec')).toBe(sha('LC17200000COPsec'));
  });
  it('acepta un evento con checksum válido y rechaza uno alterado', () => {
    const data = { transaction: { id: 't1', status: 'APPROVED', reference: 'LC1', amount_in_cents: 7200000 } };
    const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
    const timestamp = 1700000000;
    const checksum = sha('t1APPROVED7200000' + timestamp + 'events');
    const ev = { event: 'transaction.updated', timestamp, data, signature: { properties, checksum } };
    expect(w.verifyEvent(ev, 'events')).toBe(true);
    expect(w.verifyEvent({ ...ev, data: { transaction: { ...data.transaction, amount_in_cents: 1 } } }, 'events')).toBe(false);
  });
});
