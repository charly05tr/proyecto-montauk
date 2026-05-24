import * as THREE from 'three'
import { initLoadingScreen } from './ui/Loading/index.js'
import { initOverlay } from './ui/Overlay/index.js'
import { initRenderer } from './core/Renderer.js'
import { initGlobalLights, updateGlobalLights } from './core/Lights.js'
import { initSceneManager, getScene, updateCurrentScene } from './core/SceneManager.js'
import { PhysicsWorld } from './physics/PhysicsWorld.js'
import { Player } from './core/Player.js'

const app = document.querySelector('#app')

// 1. Inicializar UI
initLoadingScreen()
initOverlay()

// 2. Físicas
const physicsWorld = new PhysicsWorld()

// 3. Crear escena global primero
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020006)

// 4. Inicializar Jugador (con la escena)
const player = new Player(scene, physicsWorld)

// 5. Inicializar Core
const renderer = initRenderer(app)

// 6. Cargar la habitación inyectando el jugador y las físicas
import { loadRoom } from './scenes/Scene1/index.js'
loadRoom(scene, physicsWorld, player)

// 7. Inicializar Luces Globales
initGlobalLights(scene)

// 8. Reloj y Loop de Animación
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  // Avanzar simulación física
  physicsWorld.step(dt)

  // Actualizar controles y cámara del jugador
  player.update()

  // Sincronizar luz con la posición de la cámara
  updateGlobalLights(player.camera.position)

  // Actualizar lógica de la escena actual
  updateCurrentScene(clock.elapsedTime);

  // Renderizar frame
  renderer.render(scene, player.camera)

}

animate()
