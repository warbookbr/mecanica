/* composicao.test.mjs — a roda e o freio cabem um no outro na cena.

   ESTE CASO VEIO DA OFICINA, e mudou de método na mudança de casa.

   Lá ele lia `roda.PARAMS.aroRaioInterno` e `freio.PARAMS.cuboRaio`, os números
   que o autor DECLAROU. Aqui não existe receita: existe a peça já resolvida.
   Então ele passou a MEDIR o raio interno do aro e o raio externo do cubo na
   geometria que o cliente de fato vê.

   A troca é ganho, não perda. Um parâmetro declarado e a malha construída
   podem divergir — é exatamente essa distância que a op `furo` e o `filete`
   já cobraram caro na oficina. Medir a malha responde a pergunta que importa:
   a roda passa pelo cubo ou raspa nele?

   Conferido na migração: medido e declarado dão o mesmo número, 0.08 para o
   aro e 0.052 para o cubo. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FREIO_DIANTEIRO_DIREITO } from '../src/dominio/mecanica/freio-dianteiro-direito.js';
import { RODA_DIANTEIRA_DIREITA } from '../src/dominio/mecanica/roda-dianteira-direita.js';
import { parteDaFace } from '../src/autoria/ler-peca-resolvida.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (nome) => JSON.parse(readFileSync(join(AQUI, '../pecas-resolvidas', `${nome}.json`), 'utf8'));

/* os vértices que pertencem a uma parte, pelo nome dela. O eixo do conjunto é
   o X, então o raio de um vértice é a distância no plano YZ. */
function verticesDaParte(dado, nome) {
  const ids = new Set();
  for (const face of dado.F) {
    if (parteDaFace(face) === nome) for (const v of face[1]) ids.add(v);
  }
  return dado.V.filter((linha) => ids.has(linha[0]));
}
const raio = (linha) => Math.hypot(linha[2], linha[3]);

describe('a roda e o freio cabem um no outro', () => {
  it('a abertura do aro é maior que o cubo, com a folga declarada', () => {
    const roda = ler('roda-dianteira');
    const freio = ler('freio-disco');

    const aro = verticesDaParte(roda, 'aro');
    const cubo = verticesDaParte(freio, 'cubo');
    expect(aro.length, 'sem vértices de aro não há o que medir').toBeGreaterThan(0);
    expect(cubo.length, 'sem vértices de cubo não há o que medir').toBeGreaterThan(0);

    const aberturaNaCena = Math.min(...aro.map(raio)) * RODA_DIANTEIRA_DIREITA.posicaoNoVeiculo.escala;
    const cuboNaCena = Math.max(...cubo.map(raio)) * FREIO_DIANTEIRO_DIREITO.posicaoNoVeiculo.escala;

    expect(RODA_DIANTEIRA_DIREITA.compoeCom).toEqual(['freioDianteiroDireito']);
    expect(aberturaNaCena, 'a roda raspa no cubo').toBeGreaterThan(cuboNaCena);
    expect(aberturaNaCena - cuboNaCena, 'a folga é declarada, não sobra de sorte').toBeCloseTo(0.0006, 8);
  });

  it('as partes que o produto precisa citar existem nos arquivos', () => {
    /* explodir e isolar dependem do NOME da parte. Se um arquivo chegar sem as
       partes que o registro de domínio cita, o produto fica com botão que não
       faz nada — e sem erro, porque não há o que quebrar. */
    const freio = ler('freio-disco');
    for (const parte of FREIO_DIANTEIRO_DIREITO.partes) {
      expect(freio.partes, `o registro cita '${parte}', e o arquivo não tem`).toContain(parte);
    }
  });
});
