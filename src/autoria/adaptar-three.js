/* adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido. */
import * as THREE from 'three';

const COR_PADRAO = '#77817d';

function materialDaFace(face, materiais) {
  const definicao = face.material ? materiais[face.material] ?? {} : {};
  const cor = definicao.cor ?? face.cor ?? COR_PADRAO;
  const transparente = definicao.mistura === 'transparente';
  return {
    chave: JSON.stringify([
      cor,
      definicao.aspereza ?? 0.68,
      definicao.metalicidade ?? 0.12,
      definicao.emissivo ?? 0,
      transparente,
      definicao.opacidade ?? (transparente ? 0.58 : 1),
    ]),
    cor,
    aspereza: definicao.aspereza ?? 0.68,
    metalicidade: definicao.metalicidade ?? 0.12,
    emissivo: definicao.emissivo ?? 0,
    transparente,
    opacidade: definicao.opacidade ?? (transparente ? 0.58 : 1),
  };
}

function criarMaterial(info) {
  const emissivo = new THREE.Color(info.cor).multiplyScalar(Math.max(0, info.emissivo));
  return new THREE.MeshStandardMaterial({
    color: info.cor,
    roughness: info.aspereza,
    metalness: info.metalicidade,
    emissive: emissivo,
    emissiveIntensity: info.emissivo > 0 ? 1 : 0,
    transparent: info.transparente,
    opacity: info.opacidade,
    side: THREE.DoubleSide,
  });
}

/* normal do triângulo (a,b,c), NÃO normalizada: o módulo é o dobro da área, e é
   ele que dá o peso por área quando as normais se somam. Mesma convenção de
   winding do `normalDaFace` (Newell) do núcleo: (b−a) × (c−a). */
function normalDoTriangulo(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

function normalizar(n) {
  const m = Math.hypot(n[0], n[1], n[2]);
  return m > 1e-12 ? [n[0] / m, n[1] / m, n[2] / m] : null;
}

function pontosDaFace(face, vertices) {
  if (!Array.isArray(face.vs) || face.vs.length < 3) {
    throw new Error(`adaptarThree: face ${face.id} precisa de pelo menos 3 vértices`);
  }
  return face.vs.map((id) => {
    const ponto = vertices.get(id);
    if (!ponto) throw new Error(`adaptarThree: face ${face.id} referencia vértice ausente ${id}`);
    return ponto;
  });
}

/* normal do POLÍGONO por Newell — a mesma conta do `normalDaFace` do núcleo.
   Robusta para n-gon torto e para n-gon CÔNCAVO, onde a normal de um triângulo
   qualquer da face pode apontar para o lado errado. */
function normalDePoligono(pontos) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalizar([x, y, z]);
}

const cruz2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function dentroDoTriangulo(a, b, c, p) {
  const d1 = cruz2(a, b, p), d2 = cruz2(b, c, p), d3 = cruz2(c, a, p);
  return d1 >= 0 && d2 >= 0 && d3 >= 0;
}

/**
 * Triangulação de uma face por ORELHAS, no plano dela.
 *
 * POR QUE NÃO O LEQUE. O adaptador triangulava todo n-gon em leque a partir do
 * vértice 0. Leque só é válido em polígono CONVEXO. A borda do furo não é:
 * medido numa placa com um furo de 12 lados, 4 das 12 faces da borda são quads
 * CÔNCAVOS, e o leque produzia neles um triângulo de área NEGATIVA — normal
 * invertida, no plano da própria face. Com material `DoubleSide` isso não some,
 * vira uma cunha iluminada pelo lado errado encostada no contorno do furo. Era
 * metade da serrilha que se via na bancada, e não era problema de sombreado:
 * o leque também cobria área FORA do polígono e deixava o reflexo descoberto.
 *
 * Falha alto. Polígono que não fecha em orelhas (auto-interseção, contorno
 * degenerado) para a conversão com diagnóstico; nunca vira face faltando em
 * silêncio.
 */
function triangularPoligono(pontos, normal, rotulo) {
  const n = pontos.length;
  if (n === 3) return [[0, 1, 2]];
  /* quadro 2D com (u, w, normal) destro: assim o contorno, que já é CCW em
     torno da normal, sai CCW em (u,w) e a área assinada é positiva. */
  const eixo = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalizar([
    eixo[1] * normal[2] - eixo[2] * normal[1],
    eixo[2] * normal[0] - eixo[0] * normal[2],
    eixo[0] * normal[1] - eixo[1] * normal[0],
  ]);
  if (!u) throw new Error(`adaptarThree: ${rotulo} não tem plano — a normal degenerou`);
  const w = [
    normal[1] * u[2] - normal[2] * u[1],
    normal[2] * u[0] - normal[0] * u[2],
    normal[0] * u[1] - normal[1] * u[0],
  ];
  const uv = pontos.map((p) => [p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]]);

  const restantes = uv.map((_, i) => i);
  const tris = [];
  let guarda = 2 * n;
  while (restantes.length > 3 && guarda-- > 0) {
    let cortou = false;
    for (let k = 0; k < restantes.length; k++) {
      const ia = restantes[(k + restantes.length - 1) % restantes.length];
      const ib = restantes[k];
      const ic = restantes[(k + 1) % restantes.length];
      const area = cruz2(uv[ia], uv[ib], uv[ic]);
      if (!(area > 1e-18)) continue;                       // reflexo ou colinear: não é orelha
      let livre = true;
      for (const j of restantes) {
        if (j === ia || j === ib || j === ic) continue;
        if (dentroDoTriangulo(uv[ia], uv[ib], uv[ic], uv[j])) { livre = false; break; }
      }
      if (!livre) continue;
      tris.push([ia, ib, ic]);
      restantes.splice(k, 1);
      cortou = true;
      break;
    }
    if (!cortou) {
      throw new Error(`adaptarThree: ${rotulo} não fecha em orelhas (${n} cantos): contorno auto-interseccionado ou degenerado`);
    }
  }
  if (restantes.length === 3) tris.push([restantes[0], restantes[1], restantes[2]]);
  return tris;
}

/** pontos + normal do plano + triangulação de cada face, calculados uma vez só. */
function prepararFaces(neutro) {
  const preparo = new Map();
  for (const face of neutro.F.values()) {
    const pontos = pontosDaFace(face, neutro.V);
    const normal = normalDePoligono(pontos);
    if (!normal) throw new Error(`adaptarThree: face ${face.id} é degenerada — os ${pontos.length} cantos não definem um plano`);
    preparo.set(face.id, { pontos, normal, tris: triangularPoligono(pontos, normal, `face ${face.id}`) });
  }
  return preparo;
}

/**
 * O mapa de normais SUAVES: uma normal por VÉRTICE do núcleo, somada por área
 * apenas sobre as faces marcadas `liso`.
 *
 * A regra tem duas metades e as duas importam. A primeira: `liso` é a única
 * fonte de suavização — face sem a marca continua chapada, byte por byte como
 * antes. A segunda: face chapada NÃO ENTRA na soma. É isso que impede a tampa
 * de um cilindro de entortar a normal da lateral, e é isso que dá à borda do
 * furo (chapada, coplanar com a face de entrada) uma quina limpa contra a
 * parede do furo (lisa) em vez de um borrão.
 *
 * A soma é do estado NEUTRO inteiro, antes do adaptador partir a peça em malhas
 * por parte e material: uma superfície lisa cortada por uma troca de material
 * continua lisa, sem costura na divisa.
 */
function normaisSuaves(neutro, preparo) {
  const soma = new Map();
  for (const face of neutro.F.values()) {
    if (!face.liso) continue;
    const { pontos, tris } = preparo.get(face.id);
    for (const [ia, ib, ic] of tris) {
      const n = normalDoTriangulo(pontos[ia], pontos[ib], pontos[ic]);
      for (const k of [ia, ib, ic]) {
        const id = face.vs[k];
        const acc = soma.get(id);
        if (acc) { acc[0] += n[0]; acc[1] += n[1]; acc[2] += n[2]; } else soma.set(id, [n[0], n[1], n[2]]);
      }
    }
  }
  const suaves = new Map();
  for (const [id, acc] of soma) {
    const n = normalizar(acc);
    /* soma degenerada (normais opostas se cancelando) não vira normal nula
       silenciosa: o vértice fica de fora e cai na normal chapada da face. */
    if (n) suaves.set(id, n);
  }
  return suaves;
}

function triangularFace(face, preparo, destino, destinoNormais, suaves) {
  const { pontos, normal, tris } = preparo.get(face.id);
  for (const cantos of tris) {
    /* a normal chapada do TRIÂNGULO, e não a do plano da face, para que um
       n-gon torto continue com o mesmo relevo de sempre. Só quando ela degenera
       (triângulo de área nula) o plano da face assume.

       Aqui NÃO existe uma conferência de sentido contra a normal do plano, e
       isso é medido: com ela, a mutação que devolve a triangulação ao leque
       SOBREVIVIA — o sentido era corrigido, a normal virada sumia, e o triângulo
       continuava cobrindo área fora do polígono. Guarda que conserta a aparência
       de uma geometria errada é o defeito silencioso que este arquivo veio
       consertar. Quem garante o sentido é a orelha. */
    const chapada = normalizar(normalDoTriangulo(pontos[cantos[0]], pontos[cantos[1]], pontos[cantos[2]])) ?? normal;
    for (const k of cantos) destino.push(...pontos[k]);
    for (const k of cantos) {
      const suave = face.liso ? suaves.get(face.vs[k]) : null;
      destinoNormais.push(...(suave ?? chapada));
    }
  }
}

/**
 * Converte o estado neutro produzido por `nucleo()` em um grafo Three.js.
 * A identidade persistente vem de `face.parte`; UUIDs do Three.js nunca saem daqui.
 */
export function adaptarThree(neutro, { materiais = {}, nome = 'peca-procedural' } = {}) {
  if (!neutro?.V || !neutro?.F) throw new Error('adaptarThree: estado neutro inválido');
  if (neutro.orfaos?.length) {
    const resumo = neutro.orfaos.slice(0, 3).map((o) => `${o.op}: ${o.motivo}`).join('; ');
    throw new Error(`adaptarThree: peça contém ${neutro.orfaos.length} referência(s) inválida(s): ${resumo}`);
  }

  const raiz = new THREE.Group();
  raiz.name = nome;
  raiz.userData = { tipo: 'peca-procedural', nome };

  const preparo = prepararFaces(neutro);
  const suaves = normaisSuaves(neutro, preparo);
  const grupos = new Map();
  const facesSemParte = [];
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (!face.parte) facesSemParte.push(face.id);
    const parte = face.parte || 'estrutura-sem-nome';
    const material = materialDaFace(face, materiais);
    const chave = `${parte}\u0000${material.chave}`;
    let lote = grupos.get(chave);
    if (!lote) {
      lote = { parte, material, posicoes: [], normais: [], faces: [] };
      grupos.set(chave, lote);
    }
    triangularFace(face, preparo, lote.posicoes, lote.normais, suaves);
    lote.faces.push(face.id);
  }

  const partes = new Map();
  for (const lote of grupos.values()) {
    let grupoParte = partes.get(lote.parte);
    if (!grupoParte) {
      grupoParte = new THREE.Group();
      grupoParte.name = lote.parte;
      grupoParte.userData = {
        tipo: 'parte-semantica',
        identidadeParte: lote.parte,
        faces: [],
      };
      partes.set(lote.parte, grupoParte);
      raiz.add(grupoParte);
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(lote.posicoes, 3));
    /* as normais são POSTAS, não recalculadas: `computeVertexNormals()` numa
       geometria não indexada devolve sempre a normal chapada do triângulo, e era
       ela que jogava fora todo `liso` da peça. */
    geometria.setAttribute('normal', new THREE.Float32BufferAttribute(lote.normais, 3));
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();

    const malha = new THREE.Mesh(geometria, criarMaterial(lote.material));
    malha.name = `${lote.parte}:${grupoParte.children.length}`;
    malha.castShadow = true;
    malha.receiveShadow = true;
    malha.userData = {
      tipo: 'superficie',
      identidadeParte: lote.parte,
      faces: lote.faces.slice(),
    };
    grupoParte.userData.faces.push(...lote.faces);
    grupoParte.add(malha);
  }

  raiz.userData.partes = [...partes.keys()].sort();
  raiz.userData.diagnosticos = {
    facesSemParte: facesSemParte.slice(),
  };
  return {
    raiz,
    partes,
    diagnosticos: {
      facesSemParte,
      semanticaIntegra: facesSemParte.length === 0,
    },
    estatisticas: {
      verticesNeutros: neutro.V.size,
      facesNeutras: neutro.F.size,
      triangulos: [...grupos.values()].reduce((total, lote) => total + lote.posicoes.length / 9, 0),
      partes: partes.size,
      facesSemParte: facesSemParte.length,
    },
  };
}
