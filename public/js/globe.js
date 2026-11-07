/**
 * GLOBO 3D INTERATIVO (THREE.JS)
 * Inspirado na implementação do TodoCNPJ com pulso das empresas recém-abertas no Brasil
 */

(function () {
  const stage = document.getElementById('globeContainer');
  const canvas = document.getElementById('globeCanvas');
  if (!stage || !canvas) return;

  let scene, camera, renderer, globeGroup, particlesGroup;
  let isDragging = false, prevMouseX = 0, prevMouseY = 0;
  let targetRotationY = 0, targetRotationX = 0.25;

  // Coordenadas das principais capitais e polos empresariais do Brasil
  const CIDADES_BR = [
    { nome: 'São Paulo', uf: 'SP', lat: -23.55, lng: -46.63 },
    { nome: 'Rio de Janeiro', uf: 'RJ', lat: -22.91, lng: -43.20 },
    { nome: 'Belo Horizonte', uf: 'MG', lat: -19.92, lng: -43.94 },
    { nome: 'Londrina', uf: 'PR', lat: -23.31, lng: -51.16 },
    { nome: 'Curitiba', uf: 'PR', lat: -25.43, lng: -49.27 },
    { nome: 'Porto Alegre', uf: 'RS', lat: -30.03, lng: -51.23 },
    { nome: 'Florianópolis', uf: 'SC', lat: -27.60, lng: -48.55 },
    { nome: 'Brasília', uf: 'DF', lat: -15.79, lng: -47.88 },
    { nome: 'Goiânia', uf: 'GO', lat: -16.68, lng: -49.25 },
    { nome: 'Salvador', uf: 'BA', lat: -12.97, lng: -38.50 },
    { nome: 'Recife', uf: 'PE', lat: -8.05, lng: -34.88 },
    { nome: 'Fortaleza', uf: 'CE', lat: -3.73, lng: -38.54 },
    { nome: 'Manaus', uf: 'AM', lat: -3.12, lng: -60.02 },
    { nome: 'Belém', uf: 'PA', lat: -1.46, lng: -48.50 }
  ];

  function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function initGlobe() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js não carregado ainda.');
      return;
    }

    const width = stage.clientWidth || 500;
    const height = stage.clientHeight || 500;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.z = 3.6;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Ajusta inclinação e rotação inicial para focar na América do Sul / Brasil
    // Longitude aproximada do Brasil: ~ -52°
    globeGroup.rotation.y = 1.35;
    globeGroup.rotation.x = 0.22;

    // 1. Esfera Base do Planeta
    const sphereRadius = 1.0;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);

    // Canvas procedural para textura de grade e mapa estelar
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d');

    // Gradiente oceânico Dark Navy
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#03175A');
    grad.addColorStop(0.5, '#020E38');
    grad.addColorStop(1, '#010A2A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Linhas sutis de latitude e longitude
    ctx.strokeStyle = 'rgba(127, 196, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 32; y < 512; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    for (let x = 32; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    const globeTexture = new THREE.CanvasTexture(textureCanvas);
    const sphereMat = new THREE.MeshPhongMaterial({
      map: globeTexture,
      shininess: 25,
      specular: new THREE.Color(0x2F72F5),
      emissive: new THREE.Color(0x020E38),
      emissiveIntensity: 0.6
    });

    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // 2. Camada de Pontos / Grade de Partículas Terrestres
    const dotsCount = 1800;
    const dotPositions = [];
    for (let i = 0; i < dotsCount; i++) {
      const lat = (Math.random() - 0.5) * 160;
      const lng = (Math.random() - 0.5) * 360;
      const v = latLngToVector3(lat, lng, 1.006);
      dotPositions.push(v.x, v.y, v.z);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0x7FC4FF,
      size: 0.012,
      transparent: true,
      opacity: 0.35
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dots);

    // 3. Atmosfera Externa Luminosa (Glow)
    const atmosGeo = new THREE.SphereGeometry(1.14, 32, 32);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.18, 0.45, 0.96, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    // 4. Marcadores Pulsantes do Brasil
    particlesGroup = new THREE.Group();
    globeGroup.add(particlesGroup);

    CIDADES_BR.forEach((cid, index) => {
      const pos = latLngToVector3(cid.lat, cid.lng, 1.012);

      // Ponto luminoso (verde néon)
      const pinGeo = new THREE.SphereGeometry(0.015, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x25D07E });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      particlesGroup.add(pinMesh);

      // Anel expansivo (onda de pulso de abertura de CNPJ)
      const ringGeo = new THREE.RingGeometry(0.018, 0.024, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x25D07E,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      ringMesh.userData = {
        baseScale: 1,
        progress: (index * 0.2) % 1.0
      };
      particlesGroup.add(ringMesh);
    });

    // Luzes
    const ambientLight = new THREE.AmbientLight(0x7FC4FF, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    dirLight.position.set(3, 2, 4);
    scene.add(dirLight);

    // Controles de Arraste do Mouse / Touch
    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onWindowResize);

    animate();
  }

  function onPointerDown(e) {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;

    targetRotationY += deltaX * 0.005;
    targetRotationX = Math.max(-0.6, Math.min(0.6, targetRotationX + deltaY * 0.005));

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }

  function onPointerUp() {
    isDragging = false;
  }

  function onWindowResize() {
    if (!camera || !renderer || !stage) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    // Rotação suave constante + inércia
    if (!isDragging) {
      globeGroup.rotation.y += 0.0015;
    } else {
      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.1;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.1;
    }

    // Animação de pulso dos anéis no Brasil
    if (particlesGroup) {
      particlesGroup.children.forEach(child => {
        if (child.userData && child.userData.progress !== undefined) {
          child.userData.progress += delta * 0.65;
          if (child.userData.progress > 1.0) child.userData.progress = 0;

          const p = child.userData.progress;
          const scale = 1.0 + p * 3.5;
          child.scale.set(scale, scale, 1);
          child.material.opacity = Math.max(0, 0.9 * (1.0 - p));
        }
      });
    }

    renderer.render(scene, camera);
  }

  // Efeito de rajada quando um novo CNPJ entra no feed
  window.triggerGlobePulse = function () {
    if (!particlesGroup) return;
    particlesGroup.children.forEach(child => {
      if (child.userData && child.userData.progress !== undefined) {
        child.userData.progress = Math.random() * 0.3;
      }
    });
  };

  // Inicializa quando o DOM e Three.js estiverem prontos
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
  } else {
    initGlobe();
  }
})();
