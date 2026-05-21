import * as THREE from 'three';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { Player } from './core/Player.js';
import { createStaticBox } from './physics/Collider.js';

// 1. Inicializar mundos
const scene = new THREE.Scene();
const physics = new PhysicsWorld();

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#webgl-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// 2. Inicializar Jugador
const player = new Player(scene, physics);
scene.add(player.camera); // Añadir la cámara que creamos en Player.js

// 3. Crear el entorno de prueba (Visual y Físico)
// - Visual (Three.js)
const floorGeo = new THREE.BoxGeometry(20, 1, 20);
const floorMat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true });
const visualFloor = new THREE.Mesh(floorGeo, floorMat);
visualFloor.position.y = -0.5;
scene.add(visualFloor);

// - Físico (Cannon.js) - Debe coincidir exactamente en tamaño y posición
createStaticBox(physics, 20, 1, 20, { x: 0, y: -0.5, z: 0 });

// 4. Bucle principal (Game Loop)
const clock = new THREE.Clock();

function tick() {
    const deltaTime = clock.getDelta();

    // A. Actualizar físicas
    physics.step(deltaTime);

    // B. Actualizar controles del jugador basándose en las físicas
    player.update();

    // C. Renderizar gráficos
    renderer.render(scene, player.camera);
    window.requestAnimationFrame(tick);
}

tick();