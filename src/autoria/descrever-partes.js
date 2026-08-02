/* descrever-partes.js — mede uma peça da Oficina POR NOME de parte, sem Three.js:
   caixa alinhada aos eixos, centro, dimensões e faces de cada parte, e a folga
   ou a interpenetração entre pares de partes. É o lado headless da conferência
   que a foto não dá — foto não tem escala nem gnômon de eixo (ATRITOS-AUTORIA
   A-13), e a resposta certa para "o eixo está em X?" é um número.

   Consome só o estado neutro de `nucleo()` (`V`, `F`, `face.parte`): não conhece
   Three.js, freio, carro nem interface. A caixa do `adaptarThree` é por MALHA e
   depende de Three — esta é por PARTE SEMÂNTICA e roda em qualquer lugar.

   Consumidores: o CLI `tools/mecanifica/descrever-peca.mjs` (`npm run descrever`)
   e o painel de diagnóstico da bancada — uma verdade só sobre a mesma medida.

   ESCOPO: caixa, dimensão e componentes conexos são observações geométricas
   gerais. Já os rótulos `folga`, `encosta` e `interpenetra` formam uma régua de
   MONTAGEM RÍGIDA, calibrada no freio a disco: um par só pode ser reprovado se
   sua relação funcional esperada estiver declarada. Não é gate universal para
   objetos orgânicos, deformáveis ou propositalmente sobrepostos (pele, folhas,
   pelos, roupas, músculos). Nesses casos a caixa ainda orienta inspeção, mas
   contato exige regra própria de topologia, superfície, silhueta ou pose.

   UMA medida só de relação, medida entre CORPOS. Um corpo é um componente
   conexo da parte (faces ligadas por vértice compartilhado): o `disco` tem dois
   corpos — a pista e o chapéu que recua para dentro —, a `pinca` tem três — a
   ponte e as duas garras. A caixa de cada corpo é comparada com a de cada corpo
   da outra parte, e vence o par que decide: se algum par se invade, a relação é
   `interpenetra` pelo par MAIS invadido; senão, se algum encosta, `encosta`;
   senão `folga`, pelo par mais próximo.

   Por que corpo e não envelope da parte inteira: o envelope mente em peça oca —
   a caixa do `disco` engloba pista e chapéu e acusaria a pastilha interna como
   se estivesse dentro do disco. Por que corpo e não par de FACES: face plana
   alinhada ao eixo tem espessura ZERO na sua normal, então o vão naquele eixo
   nunca é negativo e `interpenetra` fica INALCANÇÁVEL — a medida por face dava
   `encosta` para dois cubos 50% sobrepostos e `folga` para um cubo inteiramente
   engolido por outro. Uma régua que dá o mesmo número para a montagem certa e
   para a errada não é régua. Por isso a medida por par de faces foi removida em
   vez de virar segunda coluna: duas verdades sobre a mesma pergunta é o defeito,
   não a cura.

   A medida é conservadora, e sempre para o MESMO lado: a caixa de um corpo é
   maior ou igual ao corpo, então `folga` é limite inferior da folga real e
   `interpenetra` pode ser das caixas sem que os sólidos se cruzem. A garantia
   que importa é a inversa: `folga` e `encosta` NUNCA escondem invasão real —
   se as caixas estão separadas, os sólidos também estão. Ela responde
   "encosta? tem vão? se invadem? de quanto?", não substitui interseção de
   sólidos.

   Determinismo: nomes ordenados por ponto de código (nunca `localeCompare`, que
   depende do ICU do sistema), faces varridas em ordem de id, pares em ordem
   estável, `Math.sqrt` no lugar de `Math.hypot` (aproximação definida pela
   implementação) e número em precisão fixa na formatação. Nenhuma referência é
   resolvida por índice ou posição; nome inválido, vazio, repetido ou de tipo
   errado FALHA com diagnóstico, nunca vira no-op. */

/* A-20 — PORTAS. `nucleo()` devolve `portas` (Map nome -> {nome, de, passo})
   desde o ciclo "Endereços semânticos v1", mas uma porta que só existe dentro
   do retorno do núcleo continua invisível para quem CONFERE: `npm run descrever`
   e a bancada listavam seis partes e nenhuma porta. O custo disso foi medido —
   para provar que `sel:{porta}` sobrevive a uma transformação,
   `jardineira-integridade.test.ts` teve que marcar cada porta com um material
   próprio e ler a marca de volta, afirmando sobre `f.material` em vez de sobre
   a porta.

   O que esta régua mostra é o que a porta DECLARA: nome, origem estrutural
   (`op:id` mais as chaves de recorte do contrato do gerador) e o passo que a
   publicou. NÃO mostra as faces resolvidas, e isso é decisão, não omissão: a
   resolução depende do momento da citação — a mesma porta resolve conjuntos
   diferentes conforme os passos que rodaram antes —, e o núcleo, de propósito,
   não congela o fim da lista. Nome que promete região e entrega primitiva é
   pior que nome nenhum; aqui a coluna se chama `origem` porque é exatamente
   uma origem, a mesma de `sel:{origem}` e de `origemId`. */

/** Vão abaixo do qual duas caixas são consideradas encostadas (erro de ponto flutuante). */
export const TOLERANCIA_CONTATO = 1e-9;

/** Ordem canônica dos eixos em toda saída deste módulo. */
export const EIXOS = ['x', 'y', 'z'];

/** Tipos possíveis de relação entre duas partes. */
export const TIPOS_DE_RELACAO = ['folga', 'encosta', 'interpenetra'];

function compararTexto(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function pareceMapa(valor) {
  return Boolean(valor)
    && typeof valor.get === 'function'
    && typeof valor.values === 'function'
    && typeof valor.size === 'number';
}

function exigirNeutro(neutro, quem) {
  if (!pareceMapa(neutro?.V) || !pareceMapa(neutro?.F)) {
    throw new Error(
      `${quem}: estado neutro inválido — esperava o objeto devolvido por nucleo(), `
      + 'com V e F como Map.',
    );
  }
}

function exigirNome(nome, quem) {
  if (typeof nome !== 'string' || nome.trim() === '') {
    throw new Error(
      `${quem}: nome de parte precisa ser texto não vazio, recebi ${JSON.stringify(nome)}.`,
    );
  }
}

function exigirTolerancia(tolerancia, quem) {
  if (!Number.isFinite(tolerancia) || tolerancia < 0) {
    throw new Error(
      `${quem}: tolerância precisa ser um número >= 0, recebi ${JSON.stringify(tolerancia)}.`,
    );
  }
}

function exigirCaixa(caixa, quem) {
  if (!caixa || !Array.isArray(caixa.min) || !Array.isArray(caixa.max)
    || caixa.min.length !== 3 || caixa.max.length !== 3
    || caixa.min.some((v) => !Number.isFinite(v)) || caixa.max.some((v) => !Number.isFinite(v))) {
    throw new Error(`${quem}: esperava caixa com min e max de 3 números finitos.`);
  }
}

/* Vão eixo a eixo entre duas caixas: positivo é folga, negativo é sobreposição. */
function vaosEntre(a, b) {
  return [0, 1, 2].map((k) => Math.max(a.min[k], b.min[k]) - Math.min(a.max[k], b.max[k]));
}

/* Distância euclidiana entre duas caixas a partir do trio de vãos: só os vãos
   POSITIVOS separam. `Math.sqrt` em vez de `Math.hypot` — determinismo. */
function distanciaDe(porEixo) {
  const positivos = porEixo.map((v) => Math.max(v, 0));
  return Math.sqrt(positivos.reduce((soma, v) => soma + v * v, 0));
}

/* Classifica um trio de vãos. O eixo relatado é sempre o do MAIOR vão: em
   `folga` é o que separa as caixas, em `interpenetra` é o de menor profundidade
   — o eixo pelo qual custa menos separá-las. */
function classificar(porEixo, tolerancia) {
  const maior = Math.max(porEixo[0], porEixo[1], porEixo[2]);
  const eixo = EIXOS[porEixo.indexOf(maior)];
  if (maior > tolerancia) {
    return { tipo: 'folga', distancia: distanciaDe(porEixo), eixo, porEixo };
  }
  if (maior < -tolerancia) return { tipo: 'interpenetra', distancia: -maior, eixo, porEixo };
  return { tipo: 'encosta', distancia: 0, eixo, porEixo };
}

/* Corpos de uma parte: componentes conexos por VÉRTICE COMPARTILHADO, via
   union-find. Cada primitiva do núcleo abre um bloco de ids próprio e não
   compartilha vértice com outra, então um corpo é uma primitiva — ou um grupo
   delas costurado de propósito por `unir`/`solda`.

   Determinismo: as faces chegam em ordem de id, a união sempre adota como raiz
   o MENOR índice, e os corpos saem em ordem do menor id de face que os compõe.
   Nada aqui depende da ordem de iteração de Map nem de índice de array como
   referência persistida — o índice existe só dentro desta função. */
function corposDe(faces) {
  const pai = faces.map((_, i) => i);
  const raiz = (i) => {
    let atual = i;
    while (pai[atual] !== atual) { pai[atual] = pai[pai[atual]]; atual = pai[atual]; }
    return atual;
  };
  const unir = (i, j) => {
    const a = raiz(i);
    const b = raiz(j);
    if (a === b) return;
    if (a < b) pai[b] = a; else pai[a] = b;
  };
  const primeiraFaceDoVertice = new Map();
  faces.forEach((face, i) => {
    for (const idVertice of face.vs) {
      const outra = primeiraFaceDoVertice.get(idVertice);
      if (outra === undefined) primeiraFaceDoVertice.set(idVertice, i);
      else unir(i, outra);
    }
  });

  const porRaiz = new Map();
  faces.forEach((face, i) => {
    const r = raiz(i);
    let corpo = porRaiz.get(r);
    if (!corpo) {
      corpo = { faces: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      porRaiz.set(r, corpo);
    }
    corpo.faces++;
    for (let k = 0; k < 3; k++) {
      if (face.min[k] < corpo.min[k]) corpo.min[k] = face.min[k];
      if (face.max[k] > corpo.max[k]) corpo.max[k] = face.max[k];
    }
  });
  /* ordem estável: raiz é o menor índice do corpo, e o índice segue o id da face */
  return [...porRaiz.keys()].sort((a, b) => a - b).map((r) => porRaiz.get(r));
}

/* Uma passada pelo estado neutro: envelope e caixa de cada face, por parte. */
function medirPartes(neutro, quem) {
  exigirNeutro(neutro, quem);
  const acumulado = new Map();
  const facesSemParte = [];

  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (face.parte === undefined || face.parte === null || face.parte === '') {
      facesSemParte.push(face.id);
      continue;
    }
    if (typeof face.parte !== 'string') {
      throw new Error(
        `${quem}: face ${face.id} tem parte de tipo ${typeof face.parte} `
        + `(${JSON.stringify(face.parte)}); identidade de parte precisa ser texto.`,
      );
    }
    let parte = acumulado.get(face.parte);
    if (!parte) {
      parte = {
        nome: face.parte,
        faces: 0,
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
        facesMedidas: [],
      };
      acumulado.set(face.parte, parte);
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const idVertice of face.vs) {
      const ponto = neutro.V.get(idVertice);
      if (!ponto) {
        throw new Error(
          `${quem}: face ${face.id} da parte '${face.parte}' referencia o vértice `
          + `ausente ${idVertice}.`,
        );
      }
      for (let k = 0; k < 3; k++) {
        if (ponto[k] < min[k]) min[k] = ponto[k];
        if (ponto[k] > max[k]) max[k] = ponto[k];
      }
    }
    if (min.some((v) => !Number.isFinite(v))) {
      throw new Error(
        `${quem}: face ${face.id} da parte '${face.parte}' não tem nenhum vértice medível.`,
      );
    }

    parte.faces++;
    parte.facesMedidas.push({ vs: face.vs, min, max });
    for (let k = 0; k < 3; k++) {
      if (min[k] < parte.min[k]) parte.min[k] = min[k];
      if (max[k] > parte.max[k]) parte.max[k] = max[k];
    }
  }

  const partes = new Map();
  for (const nome of [...acumulado.keys()].sort()) {
    const parte = acumulado.get(nome);
    parte.corpos = corposDe(parte.facesMedidas);
    partes.set(nome, parte);
  }
  return { partes, facesSemParte };
}

function projetarCaixa(parte) {
  return {
    nome: parte.nome,
    faces: parte.faces,
    corpos: parte.corpos.length,
    min: parte.min.slice(),
    max: parte.max.slice(),
    centro: parte.min.map((v, k) => (v + parte.max[k]) / 2),
    dimensoes: parte.max.map((v, k) => v - parte.min[k]),
  };
}

/* Serializa o resto do contrato da origem (tudo além de `op` e `id`) em ordem
   de chave — `tampa=fundo`, `faixa=0`. Ordem por ponto de código, como o resto
   do módulo: o relatório é determinístico e pode virar teste. */
function recorteDe(de) {
  return Object.keys(de)
    .filter((chave) => chave !== 'op' && chave !== 'id')
    .sort()
    .map((chave) => `${chave}=${typeof de[chave] === 'string' ? de[chave] : JSON.stringify(de[chave])}`)
    .join(' ');
}

/**
 * As portas publicadas pela peça, em ordem de nome: `[{ nome, op, id, recorte,
 * origem, passo }]`, onde `origem` é o texto `op:id` mais o recorte do contrato
 * e `passo` é o índice do `publicarPorta` que a declarou.
 *
 * Peça que não publica porta nenhuma devolve lista vazia. `portas` ausente no
 * estado neutro também: é o caso de um neutro montado à mão em teste, não um
 * erro. Já `portas` presente com forma errada FALHA com diagnóstico — o módulo
 * não adivinha formato de contrato.
 */
export function portasPublicadas(neutro) {
  const quem = 'portasPublicadas';
  exigirNeutro(neutro, quem);
  const portas = neutro.portas;
  if (portas === undefined || portas === null) return [];
  if (!pareceMapa(portas)) {
    throw new Error(`${quem}: 'portas' precisa ser o Map devolvido por nucleo(), recebi ${typeof portas}.`);
  }
  return [...portas.values()].map((porta) => {
    if (typeof porta?.nome !== 'string' || !porta.nome
      || typeof porta.de !== 'object' || porta.de === null || Array.isArray(porta.de)
      || typeof porta.de.op !== 'string' || porta.de.id === undefined) {
      throw new Error(
        `${quem}: porta ${JSON.stringify(porta?.nome ?? null)} sem contrato {nome, de:{op,id}, passo}.`,
      );
    }
    const recorte = recorteDe(porta.de);
    return {
      nome: porta.nome,
      op: porta.de.op,
      id: porta.de.id,
      recorte,
      origem: `${porta.de.op}:${porta.de.id}${recorte ? ` ${recorte}` : ''}`,
      passo: porta.passo,
    };
  });
}

/**
 * Caixa alinhada aos eixos de TODAS as partes da peça, por nome.
 * Devolve `{ caixas, facesSemParte }`: `caixas` é um Map em ordem de nome (ponto
 * de código) de `{ nome, faces, corpos, min, max, centro, dimensoes }`, onde
 * `corpos` é quantos componentes conexos a parte tem; faces sem `parte` não
 * entram em nenhuma caixa e saem em `facesSemParte`, por id.
 */
export function caixasPorParte(neutro) {
  const quem = 'caixasPorParte';
  const { partes, facesSemParte } = medirPartes(neutro, quem);
  const caixas = new Map();
  for (const [nome, parte] of partes) caixas.set(nome, projetarCaixa(parte));
  return { caixas, facesSemParte };
}

/**
 * Caixa de UMA parte, pelo nome semântico.
 * Nome ausente, vazio ou inexistente falha nomeando as partes disponíveis.
 */
export function caixaDaParte(neutro, nome) {
  const quem = 'caixaDaParte';
  exigirNeutro(neutro, quem);
  exigirNome(nome, quem);
  const { caixas } = caixasPorParte(neutro);
  const caixa = caixas.get(nome);
  if (!caixa) {
    throw new Error(
      `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
      + `${[...caixas.keys()].join(', ') || '(nenhuma)'}.`,
    );
  }
  return caixa;
}

/**
 * Caixa de cada CORPO de uma parte — os componentes conexos que a relação entre
 * partes compara, em ordem estável (menor id de face primeiro). É a medida que
 * explica o número: `disco` tem dois corpos (pista e chapéu) e é por isso que a
 * pastilha interna aparece com folga em vez de dentro do disco.
 * Nome ausente, vazio ou inexistente falha nomeando as partes disponíveis.
 */
export function corposDaParte(neutro, nome) {
  const quem = 'corposDaParte';
  exigirNeutro(neutro, quem);
  exigirNome(nome, quem);
  const { partes } = medirPartes(neutro, quem);
  const parte = partes.get(nome);
  if (!parte) {
    throw new Error(
      `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
      + `${[...partes.keys()].join(', ') || '(nenhuma)'}.`,
    );
  }
  return parte.corpos.map((corpo) => ({
    faces: corpo.faces,
    min: corpo.min.slice(),
    max: corpo.max.slice(),
  }));
}

/**
 * Relação entre DUAS CAIXAS, eixo a eixo.
 * `porEixo[k]` é o vão no eixo: positivo é folga, negativo é sobreposição.
 * `tipo` é `folga` (separadas; `distancia` é a distância entre as caixas),
 * `encosta` (tocam-se dentro da tolerância) ou `interpenetra` (`distancia` é a
 * MENOR profundidade que separa as duas).
 */
export function relacaoEntreCaixas(a, b, { tolerancia = TOLERANCIA_CONTATO } = {}) {
  const quem = 'relacaoEntreCaixas';
  exigirCaixa(a, quem);
  exigirCaixa(b, quem);
  exigirTolerancia(tolerancia, quem);
  return { a: a.nome ?? null, b: b.nome ?? null, ...classificar(vaosEntre(a, b), tolerancia) };
}

/* Relação entre duas partes, medida CORPO A CORPO (componente conexo contra
   componente conexo) com o MESMO `classificar` de `relacaoEntreCaixas` — uma
   verdade só sobre a mesma pergunta.

   O par que decide: contato (`maior <= tolerância`) vence folga sempre, porque
   invasão em qualquer par de corpos é invasão entre as partes; entre os de
   contato vence o de menor `maior`, isto é, o MAIS interpenetrado; entre os de
   folga vence o mais próximo. Empate é resolvido pela ordem dos corpos (o
   primeiro vence, por comparação estrita), e essa ordem vem do menor id de
   face — a saída não depende da ordem de iteração. */
function relacaoEntrePartes(a, b, tolerancia) {
  let contato = null;
  let folga = null;
  for (const corpoA of a.corpos) {
    for (const corpoB of b.corpos) {
      const porEixo = vaosEntre(corpoA, corpoB);
      const maior = Math.max(porEixo[0], porEixo[1], porEixo[2]);
      if (maior <= tolerancia) {
        if (!contato || maior < contato[0]) contato = [maior, porEixo];
      } else {
        const distancia = distanciaDe(porEixo);
        if (!folga || distancia < folga[0]) folga = [distancia, porEixo];
      }
    }
  }
  const vencedor = contato ?? folga;
  if (!vencedor) {
    throw new Error(
      `relacaoEntrePartes: '${a.nome}' ou '${b.nome}' não tem nenhum corpo para comparar.`,
    );
  }
  return { a: a.nome, b: b.nome, ...classificar(vencedor[1], tolerancia) };
}

function selecionarNomes(partes, filtro, quem) {
  if (filtro === undefined || filtro === null) return [...partes.keys()];
  if (!Array.isArray(filtro)) {
    throw new Error(`${quem}: 'partes' precisa ser uma lista de nomes, recebi ${typeof filtro}.`);
  }
  if (filtro.length === 0) {
    throw new Error(`${quem}: lista de partes vazia — peça as partes pelo nome ou omita o filtro.`);
  }
  const vistos = new Set();
  for (const nome of filtro) {
    exigirNome(nome, quem);
    if (vistos.has(nome)) throw new Error(`${quem}: a parte '${nome}' foi pedida mais de uma vez.`);
    if (!partes.has(nome)) {
      throw new Error(
        `${quem}: a peça não tem parte '${nome}'. Partes disponíveis: `
        + `${[...partes.keys()].join(', ') || '(nenhuma)'}.`,
      );
    }
    vistos.add(nome);
  }
  /* a ordem da saída é a da peça, não a que o autor digitou: relatório estável. */
  return [...partes.keys()].filter((nome) => vistos.has(nome));
}

const PROPRIEDADES_DE_MATERIAL = ['cor', 'emissivo', 'aspereza', 'semLuz', 'contorno', 'mistura', 'opacidade'];

/* A revisão não precisa nem pode guardar uma face por id. Ela guarda a
   DISTRIBUIÇÃO de acabamentos dentro de cada parte semântica: material
   efetivamente aplicado, cor de pincel, sombreamento e pintura livre. Assim
   duas execuções com outra ordem interna de faces dão a mesma descrição, mas
   trocar só a aspereza, uma cor ou um dab continua sendo uma alteração visível
   e rastreável. */
function pinturaDaFace(face, quem) {
  if (!Array.isArray(face.tinta)) return [];
  return face.tinta.map((pintura) => {
    if (!pintura || typeof pintura !== 'object' || Array.isArray(pintura)
      || !Number.isFinite(pintura.a) || !Number.isFinite(pintura.b)
      || !Number.isFinite(pintura.raio) || !Number.isFinite(pintura.dureza)
      || (pintura.cor !== null && pintura.cor !== undefined && typeof pintura.cor !== 'string')) {
      throw new Error(`${quem}: pintura da face não tem estado persistível.`);
    }
    return {
      a: Object.is(pintura.a, -0) ? 0 : pintura.a,
      b: Object.is(pintura.b, -0) ? 0 : pintura.b,
      cor: pintura.cor ?? null,
      raio: Object.is(pintura.raio, -0) ? 0 : pintura.raio,
      dureza: Object.is(pintura.dureza, -0) ? 0 : pintura.dureza,
    };
  });
}

function propriedadesPersistiveisDoMaterial(material, nome, quem) {
  if (!material || typeof material !== 'object' || Array.isArray(material)) {
    throw new Error(`${quem}: material '${nome}' efetivamente usado não tem declaração persistível.`);
  }
  const propriedades = {};
  for (const chave of PROPRIEDADES_DE_MATERIAL) {
    if (!Object.hasOwn(material, chave)) continue;
    const valor = material[chave];
    if (chave === 'cor' || chave === 'mistura') {
      if (typeof valor !== 'string' || valor === '') throw new Error(`${quem}: material '${nome}.${chave}' precisa ser texto não vazio.`);
      propriedades[chave] = valor;
    } else if (chave === 'semLuz') {
      if (typeof valor !== 'boolean') throw new Error(`${quem}: material '${nome}.semLuz' precisa ser booleano.`);
      propriedades[chave] = valor;
    } else {
      if (!Number.isFinite(valor)) throw new Error(`${quem}: material '${nome}.${chave}' precisa ser número finito.`);
      propriedades[chave] = Object.is(valor, -0) ? 0 : valor;
    }
  }
  return propriedades;
}

function aparenciaSemantica(neutro, nomes, quem) {
  const catalogo = neutro.materiais ?? {};
  if (!catalogo || typeof catalogo !== 'object' || Array.isArray(catalogo)) {
    throw new Error(`${quem}: materiais do estado neutro precisam ser um dicionário.`);
  }
  const escolhidas = new Set(nomes);
  const porParte = new Map(nomes.map((nome) => [nome, new Map()]));
  const materiaisUsados = new Set();
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (!escolhidas.has(face.parte)) continue;
    const material = face.material ?? null;
    if (material !== null && (typeof material !== 'string' || material === '' || !Object.hasOwn(catalogo, material))) {
      throw new Error(`${quem}: face da parte '${face.parte}' cita material sem declaração persistível.`);
    }
    if (face.cor !== null && face.cor !== undefined && typeof face.cor !== 'string') {
      throw new Error(`${quem}: cor da face da parte '${face.parte}' não é persistível.`);
    }
    const acabamento = {
      material,
      cor: face.cor ?? null,
      liso: Boolean(face.liso),
      pinturas: pinturaDaFace(face, quem),
    };
    const chave = JSON.stringify(acabamento);
    const mapa = porParte.get(face.parte);
    const anterior = mapa.get(chave);
    mapa.set(chave, anterior ? { ...anterior, faces: anterior.faces + 1 } : { ...acabamento, faces: 1 });
    if (material !== null) materiaisUsados.add(material);
  }
  return {
    materiais: [...materiaisUsados].sort(compararTexto).map((nome) => ({
      nome,
      propriedades: propriedadesPersistiveisDoMaterial(catalogo[nome], nome, quem),
    })),
    partes: nomes.map((nome) => ({
      nome,
      coberturas: [...porParte.get(nome).values()].sort((a, b) => compararTexto(JSON.stringify(a), JSON.stringify(b))),
    })),
  };
}

/**
 * Descrição mensurável e determinística de uma peça: totais, caixa por parte
 * (em ordem de nome) e a relação de cada par de partes (em ordem estável).
 * `partes` filtra o relatório por nome; nome desconhecido, repetido ou vazio
 * falha com diagnóstico.
 */
export function descreverPeca(neutro, { partes = null, tolerancia = TOLERANCIA_CONTATO } = {}) {
  const quem = 'descreverPeca';
  exigirTolerancia(tolerancia, quem);
  const medido = medirPartes(neutro, quem);
  const nomes = selecionarNomes(medido.partes, partes, quem);
  const escolhidas = nomes.map((nome) => medido.partes.get(nome));

  const relacoes = [];
  for (let i = 0; i < escolhidas.length; i++) {
    for (let j = i + 1; j < escolhidas.length; j++) {
      relacoes.push(relacaoEntrePartes(escolhidas[i], escolhidas[j], tolerancia));
    }
  }

  const orfaos = Array.isArray(neutro.orfaos) ? neutro.orfaos : [];
  /* as portas NÃO são filtradas por `partes`: elas endereçam origem estrutural,
     não parte semântica, e esconder uma porta porque o autor filtrou o
     relatório por outra parte faria a régua mentir sobre o contrato da peça. */
  const portas = portasPublicadas(neutro);
  /* Material também é uma propriedade semântica do estado neutro. A contagem
     mede nomes efetivamente usados por faces (não o dicionário de possibilidades
     do arquivo), para que um orçamento de revisão confira o que a peça entrega. */
  const materiais = new Set(
    [...neutro.F.values()]
      .map((face) => face.material)
      .filter((material) => typeof material === 'string' && material !== ''),
  );
  const aparencia = aparenciaSemantica(neutro, nomes, quem);
  return {
    totais: {
      partes: escolhidas.length,
      partesNaPeca: medido.partes.size,
      faces: neutro.F.size,
      vertices: neutro.V.size,
      facesSemParte: medido.facesSemParte.length,
      orfaos: orfaos.length,
      portas: portas.length,
      materiais: materiais.size,
    },
    filtrado: partes !== null && partes !== undefined,
    facesSemParte: medido.facesSemParte.slice(),
    partes: escolhidas.map(projetarCaixa),
    relacoes,
    portas,
    aparencia,
  };
}

/** Número em precisão fixa, com `-0` normalizado — a mesma disciplina do gabarito. */
export function fixo(numero, casas = 6) {
  if (!Number.isFinite(numero)) return String(numero);
  const texto = numero.toFixed(casas);
  return /^-0(\.0*)?$/.test(texto) ? texto.slice(1) : texto;
}

function tabela(colunas, linhas) {
  const larguras = colunas.map((coluna, i) => Math.max(
    coluna.titulo.length,
    ...linhas.map((linha) => String(linha[i]).length),
  ));
  const montar = (celulas) => celulas
    .map((valor, i) => (colunas[i].direita
      ? String(valor).padStart(larguras[i])
      : String(valor).padEnd(larguras[i])))
    .join('  ')
    .trimEnd();
  return [montar(colunas.map((coluna) => coluna.titulo)), ...linhas.map(montar)];
}

/**
 * Relatório em texto, determinístico: a mesma descrição dá sempre a mesma
 * string, com precisão fixa e ordem estável — pode virar teste.
 */
export function formatarDescricao(descricao, { peca = null, casas = 6 } = {}) {
  const quem = 'formatarDescricao';
  if (!descricao?.totais || !Array.isArray(descricao.partes) || !Array.isArray(descricao.relacoes)) {
    throw new Error(`${quem}: esperava a descrição devolvida por descreverPeca().`);
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
    throw new Error(`${quem}: 'casas' precisa ser inteiro entre 0 e 12, recebi ${JSON.stringify(casas)}.`);
  }
  for (const relacao of descricao.relacoes) {
    if (!TIPOS_DE_RELACAO.includes(relacao.tipo)) {
      throw new Error(`${quem}: relação de tipo desconhecido ${JSON.stringify(relacao.tipo)}.`);
    }
  }
  const n = (valor) => fixo(valor, casas);
  const t = descricao.totais;

  const linhas = [];
  if (peca !== null) linhas.push(`peça: ${peca}`);
  linhas.push(
    `partes: ${t.partes}${descricao.filtrado ? ` de ${t.partesNaPeca}` : ''}`
    + `   faces: ${t.faces}   vértices: ${t.vertices}`
    + `   faces sem identidade: ${t.facesSemParte}   órfãos: ${t.orfaos}`
    + `   portas: ${t.portas ?? 0}`,
  );
  linhas.push(`unidades do modelo, ${casas} casa(s) decimal(is)`);
  linhas.push('');

  linhas.push('CAIXA POR PARTE — envelope da parte inteira, alinhado aos eixos');
  linhas.push('corpos: componentes conexos da parte — é corpo a corpo que a relação abaixo é medida.');
  const colunasCaixa = [
    { titulo: 'parte' },
    { titulo: 'faces', direita: true },
    { titulo: 'corpos', direita: true },
    { titulo: 'eixo', direita: true },
    { titulo: 'min', direita: true },
    { titulo: 'max', direita: true },
    { titulo: 'centro', direita: true },
    { titulo: 'dimensão', direita: true },
  ];
  const linhasCaixa = [];
  for (const parte of descricao.partes) {
    for (let k = 0; k < 3; k++) {
      linhasCaixa.push([
        parte.nome, parte.faces, parte.corpos, EIXOS[k],
        n(parte.min[k]), n(parte.max[k]), n(parte.centro[k]), n(parte.dimensoes[k]),
      ]);
    }
  }
  linhas.push(...(linhasCaixa.length ? tabela(colunasCaixa, linhasCaixa) : ['(nenhuma parte)']));
  linhas.push('');

  linhas.push('RELAÇÃO ENTRE PARTES — medida corpo a corpo, pelo par de corpos que decide');
  linhas.push(
    'vão por eixo: positivo é folga, negativo é sobreposição. distância: em '
    + '`folga` é a distância entre os corpos; em `interpenetra` é a menor '
    + 'profundidade que separa os dois. Medida por caixa de corpo: `folga` é '
    + 'limite inferior e `interpenetra` pode ser das caixas, não dos sólidos — '
    + 'mas `folga` e `encosta` nunca escondem invasão real.',
  );
  const colunasRelacao = [
    { titulo: 'a' },
    { titulo: 'b' },
    { titulo: 'relação' },
    { titulo: 'eixo', direita: true },
    { titulo: 'distância', direita: true },
    { titulo: 'vão x', direita: true },
    { titulo: 'vão y', direita: true },
    { titulo: 'vão z', direita: true },
  ];
  const linhasRelacao = descricao.relacoes.map((relacao) => [
    relacao.a, relacao.b, relacao.tipo, relacao.eixo, n(relacao.distancia),
    n(relacao.porEixo[0]), n(relacao.porEixo[1]), n(relacao.porEixo[2]),
  ]);
  linhas.push(...(linhasRelacao.length ? tabela(colunasRelacao, linhasRelacao) : ['(nenhum par)']));
  linhas.push('');

  /* A-20: a porta publicada aparece onde se confere. Sem esta seção, a única
     forma de saber que a peça publicou `peDoCaule` era ler o arquivo. */
  linhas.push('PORTAS PUBLICADAS — endereço semântico que a peça oferece a quem a cita');
  linhas.push(
    'origem: o que a porta DECLARA (op:id e o recorte do contrato do gerador), não as '
    + 'faces resolvidas — a resolução depende de quais passos já rodaram quando a porta é '
    + 'citada, então congelar o fim da lista faria a porta mentir sobre os passos anteriores.',
  );
  const portas = Array.isArray(descricao.portas) ? descricao.portas : [];
  const colunasPorta = [
    { titulo: 'porta' },
    { titulo: 'origem' },
    { titulo: 'passo', direita: true },
  ];
  const linhasPorta = portas.map((porta) => [porta.nome, porta.origem, porta.passo]);
  linhas.push(...(linhasPorta.length ? tabela(colunasPorta, linhasPorta) : ['(nenhuma porta publicada)']));

  return `${linhas.join('\n')}\n`;
}
