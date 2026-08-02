/* ler-peca-resolvida.js — a metade LEITORA do formato `mecanifica.peca-resolvida`.

   POR QUE ESTE ARQUIVO EXISTE SEPARADO. O escritor mora em
   `tools/mecanifica/exportar-peca.mjs` e importa `node:fs`, `node:path` e
   `node:crypto`: ele grava arquivo, e isso é trabalho de bancada. O leitor roda
   no NAVEGADOR do cliente e não pode arrastar nada disso junto.

   Então o formato tem duas pontas em arquivos diferentes, e essa separação é
   uma dívida que precisa de disciplina: quem mudar o formato tem de mexer nos
   dois. O que segura isso é o teste de ida-e-volta em
   `tools/mecanifica/exportar-peca.test.ts`, que escreve com um e lê com o
   outro, e compara o triângulo desenhado no fim.

   ESTE MÓDULO É PURO. Sem `node:`, sem Three.js, sem DOM. É o que permite ele
   ser copiado para o repositório do produto sem levar a oficina junto. */

export const FORMATO = 'mecanifica.peca-resolvida';
export const VERSAO = 1;

/* a face guarda a parte na CAUDA opcional da linha canônica: os seis primeiros
   campos são fixos (id, vs, cor, material, liso, solido) e depois vêm os
   opcionais. `tinta` é array e `parte` é string — tipos disjuntos, então varrer
   de trás para frente atrás de uma string acha a parte sem ambiguidade.
   Uma pergunta só, num lugar só: o escritor, o leitor e o gate não podem
   discordar sobre o que conta como parte. */
export function parteDaFace(linha) {
  for (let k = linha.length - 1; k >= 6; k--) {
    if (typeof linha[k] === 'string') return linha[k];
  }
  return null;
}

/* devolve a forma que `adaptarThree` aceita: Mapas, e faces com id, vs e parte.
   Recusa formato ou versão desconhecidos com diagnóstico — um arquivo que este
   código não entende não pode virar peça pela metade na tela. */
export function lerPecaResolvida(dado) {
  if (dado?.formato !== FORMATO) {
    throw new Error(`ler-peca: formato desconhecido '${dado?.formato}' (esperado '${FORMATO}')`);
  }
  if (dado.versao !== VERSAO) {
    throw new Error(`ler-peca: versão ${dado.versao} não suportada (esta ferramenta lê a ${VERSAO})`);
  }

  const V = new Map();
  for (const linha of dado.V) V.set(linha[0], [linha[1], linha[2], linha[3]]);

  const F = new Map();
  for (const linha of dado.F) {
    const face = {
      id: linha[0],
      vs: linha[1].slice(),
      cor: linha[2] ?? null,
      material: linha[3] ?? null,
      liso: !!linha[4],
      solido: !!linha[5],
    };
    const parte = parteDaFace(linha);
    if (parte) face.parte = parte;
    F.set(face.id, face);
  }

  /* `orfaos` vazio não é otimismo: o escritor RECUSA gravar peça com órfão,
     então todo arquivo que chega aqui já passou por aquela guarda. */
  return { V, F, orfaos: [], merges: [], partes: {}, materiais: dado.materiais ?? {} };
}
