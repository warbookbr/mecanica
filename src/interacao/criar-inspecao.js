/* criar-inspecao.js — seleção por raycast ligada à identidade semântica, nunca ao UUID do Three.js. */
import * as THREE from 'three';

function formatarNome(nome) {
  return nome
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replace(/^./, (letra) => letra.toUpperCase());
}

export function criarInspecao({ canvas, camera, raiz, partes, aoSelecionar }) {
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let atual = null;
  let inicio = null;

  function realcar(grupo, ligado) {
    grupo?.traverse((objeto) => {
      if (!objeto.isMesh || !objeto.material?.emissive) return;
      if (!objeto.userData.realceBase) {
        objeto.userData.realceBase = {
          cor: objeto.material.emissive.clone(),
          intensidade: objeto.material.emissiveIntensity,
        };
      }
      const base = objeto.userData.realceBase;
      objeto.material.emissive.copy(ligado ? new THREE.Color('#35c98a') : base.cor);
      objeto.material.emissiveIntensity = ligado ? 0.62 : base.intensidade;
    });
  }

  function selecionar(nome) {
    if (atual === nome) return;
    if (atual) realcar(partes.get(atual), false);
    atual = partes.has(nome) ? nome : null;
    if (atual) realcar(partes.get(atual), true);
    aoSelecionar?.(atual, atual ? formatarNome(atual) : null);
  }

  function nomeDoObjeto(objeto) {
    let cursor = objeto;
    while (cursor && cursor !== raiz.parent) {
      if (cursor.userData?.identidadeParte) return cursor.userData.identidadeParte;
      cursor = cursor.parent;
    }
    return null;
  }

  function apontar(evento, selecionarAgora) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
    const hit = raycaster.intersectObject(raiz, true).find((item) => nomeDoObjeto(item.object));
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    if (selecionarAgora) selecionar(hit ? nomeDoObjeto(hit.object) : null);
  }

  const aoPressionar = (evento) => { inicio = [evento.clientX, evento.clientY]; };
  const aoSoltar = (evento) => {
    if (!inicio || Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]) > 5) return;
    apontar(evento, true);
  };
  const aoMover = (evento) => apontar(evento, false);
  const aoTeclado = (evento) => { if (evento.key === 'Escape') selecionar(null); };

  canvas.addEventListener('pointerdown', aoPressionar);
  canvas.addEventListener('pointerup', aoSoltar);
  canvas.addEventListener('pointermove', aoMover);
  addEventListener('keydown', aoTeclado);

  return {
    selecionar,
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar);
      canvas.removeEventListener('pointerup', aoSoltar);
      canvas.removeEventListener('pointermove', aoMover);
      removeEventListener('keydown', aoTeclado);
    },
  };
}
