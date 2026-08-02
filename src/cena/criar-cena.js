/* criar-cena.js — cena industrial e infraestrutura Three.js da primeira prova da Mecanifica. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function caixa({ tamanho, posicao, material, sombra = true }) {
  const objeto = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), material);
  objeto.position.set(...posicao);
  objeto.castShadow = sombra;
  objeto.receiveShadow = true;
  return objeto;
}

function montarGalpao(scene) {
  const concreto = new THREE.MeshStandardMaterial({ color: '#28322f', roughness: 0.92, metalness: 0.04 });
  const metal = new THREE.MeshStandardMaterial({ color: '#263c36', roughness: 0.42, metalness: 0.62 });
  const detalhe = new THREE.MeshStandardMaterial({ color: '#d7992e', roughness: 0.5, metalness: 0.35 });

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), concreto);
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  scene.add(piso);

  const grade = new THREE.GridHelper(24, 24, '#52665e', '#24342f');
  grade.position.y = 0.003;
  grade.material.opacity = 0.23;
  grade.material.transparent = true;
  scene.add(grade);

  const fundo = caixa({ tamanho: [18, 7, 0.22], posicao: [0, 3.5, -6], material: concreto });
  scene.add(fundo);

  for (const x of [-7.8, -3.9, 0, 3.9, 7.8]) {
    scene.add(caixa({ tamanho: [0.16, 7.4, 0.32], posicao: [x, 3.7, -5.78], material: metal }));
  }
  for (const y of [1.2, 3.6, 6]) {
    scene.add(caixa({ tamanho: [16.2, 0.11, 0.3], posicao: [0, y, -5.76], material: metal }));
  }

  const faixa = caixa({ tamanho: [2.6, 0.055, 5.4], posicao: [0, 0.036, 0], material: detalhe, sombra: false });
  faixa.material = detalhe.clone();
  faixa.material.opacity = 0.12;
  faixa.material.transparent = true;
  scene.add(faixa);

  for (const x of [-2.8, 2.8]) {
    scene.add(caixa({ tamanho: [0.2, 5.6, 0.2], posicao: [x, 2.8, 0], material: metal }));
  }
  scene.add(caixa({ tamanho: [5.8, 0.18, 0.24], posicao: [0, 5.55, 0], material: metal }));

  return { centro: new THREE.Vector3(0, 1.05, 0) };
}

export function criarCena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07110f');
  scene.fog = new THREE.Fog('#07110f', 10, 25);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.05, 80);
  camera.position.set(5.9, 3.7, 7.1);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.4;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 1.05, 0);

  scene.add(new THREE.HemisphereLight('#b7d7ce', '#17231f', 1.65));
  const principal = new THREE.DirectionalLight('#fff1cf', 4.2);
  principal.position.set(4, 8, 5);
  principal.castShadow = true;
  principal.shadow.mapSize.set(2048, 2048);
  principal.shadow.camera.left = -7;
  principal.shadow.camera.right = 7;
  principal.shadow.camera.top = 7;
  principal.shadow.camera.bottom = -7;
  principal.shadow.bias = -0.0004;
  scene.add(principal);

  const recorte = new THREE.PointLight('#5ac7a0', 18, 12, 2);
  recorte.position.set(-3, 3.2, -2.5);
  scene.add(recorte);

  const galpao = montarGalpao(scene);

  function redimensionar() {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(canvas);
  redimensionar();

  let ativo = true;
  function quadro() {
    if (!ativo) return;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  function enquadrar(alvo, { margem = 1.35 } = {}) {
    const caixaAlvo = new THREE.Box3();
    for (const objeto of (Array.isArray(alvo) ? alvo : [alvo])) caixaAlvo.expandByObject(objeto);
    if (caixaAlvo.isEmpty()) return;
    const centro = caixaAlvo.getCenter(new THREE.Vector3());
    const tamanho = caixaAlvo.getSize(new THREE.Vector3());
    const raio = Math.max(tamanho.x, tamanho.y, tamanho.z, 0.5) * 0.5;
    const direcao = camera.position.clone().sub(controls.target).normalize();
    const distancia = Math.max(controls.minDistance, (raio * margem) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
    controls.target.copy(centro);
    camera.position.copy(centro).addScaledVector(direcao, distancia);
    camera.updateProjectionMatrix();
    controls.update();
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    galpao,
    enquadrar,
    destruir() {
      ativo = false;
      observador.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}

export function posicionarNaBancada(objeto, centro) {
  objeto.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(objeto);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const escala = Math.min(2.55 / Math.max(tamanho.x, tamanho.z), 1.75 / Math.max(tamanho.y, 0.01));
  objeto.scale.setScalar(escala);
  objeto.updateMatrixWorld(true);

  caixa.setFromObject(objeto);
  const meio = caixa.getCenter(new THREE.Vector3());
  objeto.position.x += centro.x - meio.x;
  objeto.position.z += centro.z - meio.z;
  objeto.position.y += 0.38 - caixa.min.y;
}
