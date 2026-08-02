/* controlar-apresentacao.js — modos temporários de leitura do sistema no carro, sem escrever na autoria. */
import * as THREE from 'three';

function registrarMateriais(raiz) {
  const bases = new Map();
  raiz.traverse((objeto) => {
    if (!objeto.isMesh || !objeto.material) return;
    bases.set(objeto, {
      opacity: objeto.material.opacity,
      transparent: objeto.material.transparent,
      depthWrite: objeto.material.depthWrite,
      emissive: objeto.material.emissive?.clone() ?? null,
      emissiveIntensity: objeto.material.emissiveIntensity,
    });
  });
  return bases;
}

function restaurarMateriais(bases) {
  for (const [objeto, base] of bases) {
    objeto.material.opacity = base.opacity;
    objeto.material.transparent = base.transparent;
    objeto.material.depthWrite = base.depthWrite;
    if (base.emissive) objeto.material.emissive.copy(base.emissive);
    objeto.material.emissiveIntensity = base.emissiveIntensity;
  }
}

function realcarSistema(raiz, ligado) {
  raiz.traverse((objeto) => {
    if (!objeto.isMesh || !objeto.material?.emissive) return;
    if (ligado) {
      objeto.material.emissive.lerp(new THREE.Color('#32b879'), 0.65);
      objeto.material.emissiveIntensity = Math.max(objeto.material.emissiveIntensity, 0.45);
    }
  });
}

export function criarControladorApresentacao({ ambiente, carroceria, sistema, partes, aoMudar, aoExplodir }) {
  const basesCarro = registrarMateriais(carroceria);
  const basesSistema = registrarMateriais(sistema.raiz);
  const basesPartes = new Map();
  for (const [nome, grupo] of partes) basesPartes.set(nome, grupo.position.clone());
  let modo = 'carro';
  let explosao = 0;
  let alvoExplosao = 0;
  let quadroExplosao = null;

  function aplicar(proximo) {
    modo = proximo;
    carroceria.visible = proximo !== 'isolar';
    restaurarMateriais(basesCarro);
    restaurarMateriais(basesSistema);

    if (proximo === 'contexto') {
      for (const [objeto] of basesCarro) {
        objeto.material.transparent = true;
        objeto.material.opacity = 0.13;
        objeto.material.depthWrite = false;
      }
      realcarSistema(sistema.raiz, true);
    }
    if (proximo === 'isolar') realcarSistema(sistema.raiz, true);

    aoMudar?.(modo);
  }

  function enquadrar(alvo = sistema.raiz) {
    ambiente.enquadrar(alvo, { margem: alvo === sistema.raiz ? 1.65 : 1.28 });
  }

  function aplicarExplosao(valor) {
    explosao = valor;
    for (const [nome, posicaoBase] of basesPartes) {
      const vetor = sistema.definicao.explosao[nome] ?? [0, 0, 0];
      partes.get(nome).position.copy(posicaoBase).addScaledVector(new THREE.Vector3(...vetor), valor);
    }
  }

  function animarExplosao() {
    const proximo = THREE.MathUtils.damp(explosao, alvoExplosao, 10, 1 / 60);
    aplicarExplosao(proximo);
    if (Math.abs(proximo - alvoExplosao) > 0.002) {
      quadroExplosao = requestAnimationFrame(animarExplosao);
      return;
    }
    aplicarExplosao(alvoExplosao);
    quadroExplosao = null;
    enquadrar();
  }

  function alternarExplosao() {
    // A explosão é leitura de montagem; no carro ela pareceria uma peça solta.
    if (modo === 'carro') aplicar('isolar');
    alvoExplosao = alvoExplosao > 0 ? 0 : 1;
    if (!quadroExplosao) quadroExplosao = requestAnimationFrame(animarExplosao);
    aoExplodir?.(alvoExplosao > 0);
  }

  aplicar(modo);
  return {
    aplicar,
    enquadrar,
    alternarExplosao,
    get explodido() { return alvoExplosao > 0; },
    get modo() { return modo; },
  };
}
