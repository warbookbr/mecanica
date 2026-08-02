/* sistema-freio.test.mjs — contrato semântico do primeiro sistema apresentado no veículo. */
import { describe, expect, it } from 'vitest';
import { FREIO_DIANTEIRO_DIREITO, SISTEMAS, sistemaPorId } from '../src/dominio/mecanica/freio-dianteiro-direito.js';

describe('registro freio dianteiro direito', () => {
  it('usa identidade de domínio estável e partes semânticas únicas', () => {
    expect(FREIO_DIANTEIRO_DIREITO.id).toBe('freioDianteiroDireito');
    expect(new Set(FREIO_DIANTEIRO_DIREITO.partes).size).toBe(8);
    expect(FREIO_DIANTEIRO_DIREITO.partes).toEqual(expect.arrayContaining(['disco', 'pinca', 'pastilhaInterna', 'pastilhaExterna']));
    expect(sistemaPorId('freioDianteiroDireito')).toBe(FREIO_DIANTEIRO_DIREITO);
    expect(sistemaPorId('uuid-efemero')).toBeNull();
    expect(SISTEMAS).toHaveLength(1);
  });

  it('declara explosão por parte, sem depender da ordem da malha', () => {
    expect(Object.keys(FREIO_DIANTEIRO_DIREITO.explosao).sort()).toEqual([...FREIO_DIANTEIRO_DIREITO.partes].sort());
    for (const vetor of Object.values(FREIO_DIANTEIRO_DIREITO.explosao)) {
      expect(vetor).toHaveLength(3);
      expect(vetor.every(Number.isFinite)).toBe(true);
    }
  });
});
