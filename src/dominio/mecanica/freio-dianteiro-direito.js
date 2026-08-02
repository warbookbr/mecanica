/* freio-dianteiro-direito.js — registro declarativo do primeiro sistema da apresentação, sem dependência de Three.js. */

const PARTES = Object.freeze([
  'disco',
  'cubo',
  'pastilhaInterna',
  'pastilhaExterna',
  'pinca',
  'pistao',
  'suporte',
  'flexivel',
]);

/**
 * A identidade é de domínio; posições e vetores são apenas instruções visuais
 * descartáveis para a apresentação, nunca identificadores do runtime.
 */
export const FREIO_DIANTEIRO_DIREITO = Object.freeze({
  id: 'freioDianteiroDireito',
  nome: 'Freio dianteiro direito',
  descricao: 'Conjunto que transforma a pressão hidráulica em atrito no disco da roda dianteira direita.',
  posicaoNoVeiculo: Object.freeze({ roda: 'dianteiraDireita', escala: 2.45 }),
  partes: PARTES,
  explosao: Object.freeze({
    cubo: Object.freeze([-0.08, 0, 0]),
    disco: Object.freeze([0.04, 0, 0]),
    pastilhaInterna: Object.freeze([-0.12, 0.02, 0]),
    pastilhaExterna: Object.freeze([0.12, 0.02, 0]),
    pinca: Object.freeze([0, 0.13, 0]),
    pistao: Object.freeze([-0.16, 0.02, 0]),
    suporte: Object.freeze([-0.19, 0, -0.03]),
    flexivel: Object.freeze([-0.08, 0.12, 0.09]),
  }),
});

export const SISTEMAS = Object.freeze([FREIO_DIANTEIRO_DIREITO]);

export function sistemaPorId(id) {
  return SISTEMAS.find((sistema) => sistema.id === id) ?? null;
}
