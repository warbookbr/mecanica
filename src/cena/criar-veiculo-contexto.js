/* criar-veiculo-contexto.js — carroceria proporcional de leitura espacial; não é um modelo salvo nem uma fonte de identidade. */
import * as THREE from 'three';

function material(cor, propriedades = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.52, metalness: 0.22, ...propriedades });
}

function caixa(tamanho, posicao, usa, grupo) {
  const malha = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), usa);
  malha.position.set(...posicao);
  malha.castShadow = true;
  malha.receiveShadow = true;
  grupo.add(malha);
  return malha;
}

function criarRoda(posicao, usa) {
  const roda = new THREE.Group();
  const pneu = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 14, 32), usa);
  pneu.rotation.y = Math.PI / 2;
  pneu.castShadow = true;
  pneu.receiveShadow = true;
  roda.add(pneu);

  const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 24), material('#8c9aa0', { roughness: 0.32, metalness: 0.72 }));
  aro.rotation.z = Math.PI / 2;
  aro.castShadow = true;
  roda.add(aro);
  roda.position.set(...posicao);
  return roda;
}

/** Cria contexto suficiente para orientar o sistema, sem simular engenharia da carroceria. */
export function criarVeiculoContexto() {
  const raiz = new THREE.Group();
  raiz.name = 'veiculo-contexto';
  /* Tudo que não é o sistema selecionado fica neste grupo: o controlador pode
     torná-lo fantasma sem conhecer UUIDs, nomes de malha ou detalhes do Three. */
  const contexto = new THREE.Group();
  contexto.name = 'contexto-visual';
  raiz.add(contexto);
  const carroceria = new THREE.Group();
  carroceria.name = 'carroceria-de-contexto';
  contexto.add(carroceria);

  const pintura = material('#285f55', { roughness: 0.36, metalness: 0.48 });
  const vidro = material('#385c62', { roughness: 0.16, metalness: 0.2, transparent: true, opacity: 0.82 });
  const pneu = material('#111514', { roughness: 0.88, metalness: 0.04 });
  const farol = material('#ffd98a', { emissive: '#d98b28', emissiveIntensity: 0.36, roughness: 0.3 });
  const paraChoque = material('#172321', { roughness: 0.5, metalness: 0.42 });

  caixa([2.14, 0.52, 4.42], [0, 0.76, 0], pintura, carroceria);
  caixa([1.86, 0.62, 2.05], [0, 1.29, 0.34], pintura, carroceria);
  caixa([1.7, 0.48, 0.92], [0, 1.35, -0.72], vidro, carroceria);
  caixa([1.96, 0.2, 0.2], [0, 0.62, -2.24], paraChoque, carroceria);
  caixa([0.5, 0.13, 0.08], [-0.55, 0.83, -2.23], farol, carroceria);
  caixa([0.5, 0.13, 0.08], [0.55, 0.83, -2.23], farol, carroceria);

  const pontos = {};
  for (const [lado, x] of [['esquerda', -1.1], ['direita', 1.1]]) {
    for (const [eixo, z] of [['dianteira', -1.42], ['traseira', 1.42]]) {
      const id = `${eixo}${lado[0].toUpperCase()}${lado.slice(1)}`;
      const posicao = new THREE.Vector3(x, 0.46, z);
      /* A dianteira direita é a primeira roda revisada na bancada. Ela entra
         por `main.js` a partir da autoria procedural; as outras permanecem
         simples até terem seus próprios ativos, sem fingir que são a mesma. */
      if (id !== 'dianteiraDireita') contexto.add(criarRoda(posicao, pneu));
      pontos[id] = posicao.clone();
    }
  }

  return { raiz, contexto, carroceria, pontos: Object.freeze(pontos) };
}
