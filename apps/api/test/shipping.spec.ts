import { shippingFor, newReference } from '../src/orders/shipping';

describe('shippingFor', () => {
  const s = { shipping_flat: '12000', shipping_local: '8000', shipping_local_city: 'Bogotá', shipping_free_from: '90000' };
  it('cobra tarifa nacional fuera de la ciudad local', () => expect(shippingFor(50000, 'Medellín', s)).toBe(12000));
  it('cobra tarifa local sin importar tildes ni mayúsculas', () => expect(shippingFor(50000, 'bogota', s)).toBe(8000));
  it('es gratis desde el monto configurado', () => expect(shippingFor(90000, 'Cali', s)).toBe(0));
  it('nunca es gratis si el umbral es 0', () => expect(shippingFor(500000, 'Cali', { ...s, shipping_free_from: '0' })).toBe(12000));
});

describe('newReference', () => {
  it('tiene formato LCaammdd-XXXXXX', () => expect(newReference(new Date(2026, 9, 5), 'ab12cd')).toBe('LC261005-AB12CD'));
});
