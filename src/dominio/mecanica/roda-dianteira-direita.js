/* roda-dianteira-direita.js — identidade de domínio da roda que compõe com o freio, sem depender de Three.js. */

export const RODA_DIANTEIRA_DIREITA = Object.freeze({
  id: 'rodaDianteiraDireita',
  partes: Object.freeze(['pneu', 'aro', 'tampaCentral']),
  posicaoNoVeiculo: Object.freeze({ roda: 'dianteiraDireita', escala: 1.6 }),
  compoeCom: Object.freeze(['freioDianteiroDireito']),
});
