import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ---------------------------------------------------------------------------
// Configuracion general
// ---------------------------------------------------------------------------
// Estos switches permiten bajar el costo grafico de la escena sin cambiar el
// flujo principal: utiles para probar rapido o correr en equipos modestos.
const LOW_QUALITY              = true
const USE_NORMAL_MAPS          = false
const USE_EXTRA_MAPS           = false
const ENABLE_SHADOWS           = false
const ENABLE_XMAS_POINT_LIGHTS = true
// ---------------------------------------------------------------------------
// Escena, camara y renderer
// ---------------------------------------------------------------------------
// Base minima de Three.js: escena, camara y renderer pegado al contenedor #app.

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020006)

const app = document.querySelector('#app')

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.02,
  180
)
camera.position.set(0, 1.4, 5.5)

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
  precision: LOW_QUALITY ? 'mediump' : 'highp',
})
renderer.setPixelRatio(1)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = ENABLE_SHADOWS
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.5
app.appendChild(renderer.domElement)

// ---------------------------------------------------------------------------
// Pantalla de carga
// ---------------------------------------------------------------------------
// Se oculta solo cuando el manager termino de cargar assets y la sala ya fue
// posicionada; asi evitamos mostrar un frame incompleto.
const loadingScreen = document.createElement('div')
loadingScreen.style.cssText = `
  position:fixed;inset:0;background:#020006;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  z-index:9999;color:#ff7a2b;font-family:Georgia,serif;
`
loadingScreen.innerHTML = `
  <div style="font-size:2rem;margin-bottom:1rem;letter-spacing:4px;">STRANGER THINGS</div>
  <div style="width:300px;height:4px;background:#1a0a00;border-radius:2px;overflow:hidden;">
    <div id="loading-bar" style="height:100%;width:0%;background:#ff7a2b;transition:width 0.2s;"></div>
  </div>
  <div id="loading-text" style="margin-top:0.75rem;font-size:0.9rem;opacity:0.7;">Cargando...</div>
`
document.body.appendChild(loadingScreen)
const loadingBar  = loadingScreen.querySelector('#loading-bar')
const loadingText = loadingScreen.querySelector('#loading-text')

let initialAssetsLoaded = false
let mainSceneReady      = false
let loadingScreenHidden = false

function hideLoadingScreenWhenReady() {
  if (loadingScreenHidden || !initialAssetsLoaded || !mainSceneReady) return
  loadingScreenHidden = true
  loadingBar.style.width = '100%'
  loadingText.textContent = 'Listo'
  setTimeout(() => {
    loadingScreen.style.opacity = '0'
    loadingScreen.style.transition = 'opacity 0.5s'
    setTimeout(() => loadingScreen.remove(), 500)
  }, 300)
}

const loadingManager = new THREE.LoadingManager(
  () => {
    initialAssetsLoaded = true
    hideLoadingScreenWhenReady()
  },
  (url, loaded, total) => {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
    loadingBar.style.width = pct + '%'
    loadingText.textContent = `Cargando... ${pct}%`
  },
  (url) => { loadingText.textContent = `Error: ${url}` }
)

const helpText = document.createElement('div')
helpText.style.cssText = `
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
  color:#ff7a2b;font-family:Georgia,serif;font-size:0.85rem;
  background:rgba(0,0,0,0.5);padding:6px 14px;border-radius:6px;
  pointer-events:none;z-index:100;
`
helpText.textContent = 'Cargando escena...'
document.body.appendChild(helpText)

// ---------------------------------------------------------------------------
// Estado compartido de navegacion
// ---------------------------------------------------------------------------
let minCameraY          = -5.0
let maxCameraY          =  5.0
let startPosition       = new THREE.Vector3(0, 0, 0)
let startLookTarget     = new THREE.Vector3(0, 0, -1)
let roomCollisionBounds = null

// ---------------------------------------------------------------------------
// Reloj
// ---------------------------------------------------------------------------
// Fuente de tiempo para movimiento estable y animaciones independientes del FPS.
const clock = new THREE.Clock()

// ---------------------------------------------------------------------------
// Iluminacion principal
// ---------------------------------------------------------------------------
// Combina una base calida tenue con luces puntuales rojas/naranjas para lograr
// el ambiente oscuro de Stranger Things sin depender de sombras costosas.
const ambientLight = new THREE.AmbientLight(0xffb178, 0.45)
scene.add(ambientLight)

const cameraLight = new THREE.PointLight(0xff7a2b, 0.65, 18, 1.6)
scene.add(cameraLight)

const redLight = new THREE.PointLight(0xff2a12, 2.2, 22, 1.7)
redLight.position.set(-12, 8, 4)
scene.add(redLight)

const orangeLight = new THREE.PointLight(0xff6a18, 1.7, 20, 1.7)
orangeLight.position.set(10, 6, -10)
scene.add(orangeLight)

const dimFillLight = new THREE.HemisphereLight(0x08060d, 0x160703, 0.08)
scene.add(dimFillLight)

// ---------------------------------------------------------------------------
// Luces navidenas intermitentes
// ---------------------------------------------------------------------------
const xmasColors  = [0xff2200,0x22ff22,0x2244ff,0xffee00,0xff6600,0xaa00ff,0x00eeff,0xffffff]
const xmasOffsets = [-1.8,-1.3,-0.8,-0.3,0.2,0.7,1.2,1.7]

const xmasLights = ENABLE_XMAS_POINT_LIGHTS
  ? xmasColors.map((color, i) => {
      const light = new THREE.PointLight(color, 0, 1.6, 2.0)
      light.position.set(xmasOffsets[i], 0, 0)
      light.userData.baseIntensity = 0.75
      light.userData.phase = Math.random() * Math.PI * 2
      light.userData.active = false
      scene.add(light)
      return light
    })
  : []

// ---------------------------------------------------------------------------
// Texturas
// ---------------------------------------------------------------------------
// Todas las texturas pasan por el mismo ajuste para mantener color correcto y
// mipmaps suaves cuando la camara se acerca o se aleja de las superficies.
const textureLoader = new THREE.TextureLoader(loadingManager)

function loadTex(path, rx = 1, ry = 1) {
  const t = textureLoader.load(path)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  return t
}

const ceilingTexture = loadTex('/models/stranger_things_room/textures/wood-planks_baseColor.jpeg', 4, 3)
const letterTexture  = createLetterTexture()
letterTexture.colorSpace = THREE.SRGBColorSpace
letterTexture.generateMipmaps = true
letterTexture.minFilter = THREE.LinearMipmapLinearFilter
letterTexture.magFilter = THREE.LinearFilter

function createLetterTexture() {
  // Dibuja en canvas el alfabeto y la guirnalda para reemplazar el material
  // original de las letras con una textura ligera generada en runtime.
  const canvas = document.createElement('canvas')
  const ctx    = canvas.getContext('2d')
  canvas.width = 1024; canvas.height = 512

  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 1024, 512)

  ctx.strokeStyle = 'rgba(35, 18, 8, 0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(70, 90)
  for (let i = 0; i < 18; i++) ctx.lineTo(70 + i * 52, 95 + Math.sin(i * 0.9) * 18)
  ctx.stroke()

  const bc = ['#ff3535','#ffe14a','#4bc9ff']
  for (let i = 0; i < 18; i++) {
    const bx = 70 + i * 52, by = 118 + Math.sin(i * 0.9) * 18, col = bc[i % 3]
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, 20)
    g.addColorStop(0, col + 'bb'); g.addColorStop(1, 'transparent')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(bx-3, by-3, 3, 0, Math.PI*2); ctx.fill()
  }

  ctx.fillStyle = 'rgba(62, 34, 14, 0.78)'; ctx.font = 'bold 72px Georgia,serif'; ctx.textAlign = 'center'
  'ABCDEFGHI'.split('').forEach((l,i) => ctx.fillText(l, 120+i*90,  240+Math.sin(i)*10))
  'JKLMNOPQ'.split('').forEach((l,i)  => ctx.fillText(l, 150+i*95,  355+Math.cos(i)*10))
  'RSTUVWXYZ'.split('').forEach((l,i) => ctx.fillText(l, 110+i*90,  465+Math.sin(i*0.6)*8))

  return new THREE.CanvasTexture(canvas)
}

// ---------------------------------------------------------------------------
// Materiales
// ---------------------------------------------------------------------------
function getMaterialName(m) {
  return Array.isArray(m) ? m[0]?.name : m?.name
}

function isRoomSurfaceMaterial(n) {
  return ['ceiling','floor_wood','wall_texture','wood-separator','wood-planks','plank','letters'].includes(n)
}

function optimizeMaterial(m) {
  // Recorta mapas caros cuando la escena corre en modo liviano, pero conserva
  // la textura base para que el modelo siga teniendo identidad visual.
  if (!m) return m
  if (m.map) {
    m.map.generateMipmaps = true
    m.map.minFilter = THREE.LinearMipmapLinearFilter
    m.map.magFilter = THREE.LinearFilter
    m.map.colorSpace = THREE.SRGBColorSpace
  }
  if (!USE_NORMAL_MAPS && m.normalMap)    m.normalMap = null
  if (!USE_EXTRA_MAPS  && m.roughnessMap) m.roughnessMap = null
  if (!USE_EXTRA_MAPS  && m.metalnessMap) m.metalnessMap = null
  m.needsUpdate = true
  return m
}

function tuneRoomMaterial(material) {
  // Clonamos antes de modificar para no alterar materiales compartidos por el
  // GLTF original de forma accidental.
  if (!material) return material
  const src = material.clone()

  if (src.name === 'letters') {
    return new THREE.MeshBasicMaterial({
      map: letterTexture,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      name: 'letters',
    })
  }

  if (src.color)    src.color.multiplyScalar(0.62)
  if (src.emissive) src.emissive.multiplyScalar(0.2)
  if (src.name === 'ceiling') { src.map = ceilingTexture; src.color.set(0x4a3325) }

  if (LOW_QUALITY) {
    return optimizeMaterial(new THREE.MeshLambertMaterial({
      color:    src.color?.clone()    || new THREE.Color(0xffffff),
      map:      src.map               || null,
      emissive: src.emissive?.clone() || new THREE.Color(0x000000),
      side:     THREE.FrontSide,
      name:     src.name             || '',
    }))
  }
  src.side = isRoomSurfaceMaterial(src.name) ? THREE.DoubleSide : THREE.FrontSide
  optimizeMaterial(src)
  return src
}

// ---------------------------------------------------------------------------
// Colision simple de camara
// ---------------------------------------------------------------------------
// La navegacion se mantiene dentro del bounding box de la sala; no hay fisica,
// solo limites para impedir que la camara salga del escenario.
function clampCameraToRoom(pos) {
  if (!roomCollisionBounds) return pos
  pos.x = THREE.MathUtils.clamp(pos.x, roomCollisionBounds.min.x, roomCollisionBounds.max.x)
  pos.z = THREE.MathUtils.clamp(pos.z, roomCollisionBounds.min.z, roomCollisionBounds.max.z)
  return pos
}

function tryMoveCamera(dx, dz) {
  camera.position.x += dx
  camera.position.z += dz
  clampCameraToRoom(camera.position)
}

// ---------------------------------------------------------------------------
// Camara inicial
// ---------------------------------------------------------------------------
function applySceneCamera(roomBox, roomSize, roomCenter, heightFactor = 0.36) {
  minCameraY = roomBox.min.y + 0.05
  maxCameraY = roomBox.max.y - 0.1
  const margin = 0.02
  roomCollisionBounds = new THREE.Box3(
    new THREE.Vector3(roomBox.min.x + margin, roomBox.min.y, roomBox.min.z + margin),
    new THREE.Vector3(roomBox.max.x - margin, roomBox.max.y, roomBox.max.z - margin)
  )
  startPosition.set(roomCenter.x, roomBox.min.y + roomSize.y * heightFactor, roomCenter.z)
  startLookTarget.set(roomCenter.x, startPosition.y, roomCenter.z - 1)
  camera.position.copy(startPosition)
  camera.lookAt(startLookTarget)
  pitch = camera.rotation.x
  yaw   = camera.rotation.y
}

// ---------------------------------------------------------------------------
// Carga y preparacion de la sala
// ---------------------------------------------------------------------------
function loadRoom() {
  const gltfLoader = new GLTFLoader(loadingManager)

  gltfLoader.load(
    '/models/stranger_things_room/scene.gltf',
    (gltf) => {
      const model = gltf.scene
      model.scale.setScalar(0.04)

      model.traverse((child) => {
        if (!child.isMesh) return
        const materialName = getMaterialName(child.material)
        child.material = Array.isArray(child.material)
          ? child.material.map(tuneRoomMaterial)
          : tuneRoomMaterial(child.material)
        child.frustumCulled = !isRoomSurfaceMaterial(materialName)
        child.castShadow    = ENABLE_SHADOWS
        child.receiveShadow = ENABLE_SHADOWS
        if (child.geometry && !child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals()
        }
      })

      const box    = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.x -= center.x
      model.position.z -= center.z
      model.position.y -= center.y

      scene.add(model)

      const roomBox    = new THREE.Box3().setFromObject(model)
      const roomSize   = roomBox.getSize(new THREE.Vector3())
      const roomCenter = roomBox.getCenter(new THREE.Vector3())

      // Alinea las luces navidenas con la pared frontal ya centrada.
      const wallZ  = roomBox.min.z + roomSize.z * 0.02
      const lightY = roomCenter.y + roomSize.y * 0.08
      xmasLights.forEach((light) => {
        light.position.y = lightY
        light.position.z = wallZ + 0.15
        light.userData.active = true
      })

      applySceneCamera(roomBox, roomSize, roomCenter, 0.36)
      mainSceneReady = true
      hideLoadingScreenWhenReady()

      helpText.textContent = 'Click para entrar | WASD moverte | R reiniciar | Esc salir'
    },
    undefined,
    (error) => {
      console.error(error)
      helpText.textContent = 'No se pudo cargar el modelo de la sala.'
    }
  )
}

loadRoom()

// ---------------------------------------------------------------------------
// Entrada de teclado y mouse
// ---------------------------------------------------------------------------
const keys = {}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true
  if (!mainSceneReady) return
  if (e.code === 'KeyR') {
    camera.position.copy(startPosition)
    camera.lookAt(startLookTarget)
    pitch = camera.rotation.x
    yaw   = camera.rotation.y
  }
})

window.addEventListener('keyup', (e) => { keys[e.code] = false })

let yaw = 0, pitch = 0, mouseLocked = false

document.body.addEventListener('click', () => {
  if (!mainSceneReady) return
  renderer.domElement.requestPointerLock()
})

document.addEventListener('pointerlockchange', () => {
  mouseLocked = document.pointerLockElement === renderer.domElement
  helpText.style.display = mouseLocked ? 'none' : 'block'
})

document.addEventListener('mousemove', (e) => {
  if (!mouseLocked) return
  yaw   -= e.movementX * 0.001
  pitch -= e.movementY * 0.001
  pitch  = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
  camera.rotation.order = 'YXZ'
  camera.rotation.y = yaw
  camera.rotation.x = pitch
})

// ---------------------------------------------------------------------------
// Movimiento y animaciones
// ---------------------------------------------------------------------------
const _forward   = new THREE.Vector3()
const _right     = new THREE.Vector3()
const _direction = new THREE.Vector3()

function moveCamera(delta) {
  // Movimiento relativo a la direccion horizontal de la camara; mirar arriba o
  // abajo no cambia la velocidad de avance sobre el piso.
  const step = 0.32 * delta

  _direction.set(0, 0, 0)
  if (keys['KeyW']) _direction.z -= 1
  if (keys['KeyS']) _direction.z += 1
  if (keys['KeyA']) _direction.x -= 1
  if (keys['KeyD']) _direction.x += 1
  if (keys['Space'])      _direction.y += 1
  if (keys['ControlLeft'] || keys['ControlRight'] || keys['ShiftLeft'] || keys['ShiftRight']) _direction.y -= 1
  _direction.normalize()

  camera.getWorldDirection(_forward)
  _forward.y = 0; _forward.normalize()
  _right.crossVectors(_forward, camera.up).normalize()

  tryMoveCamera(-_direction.z * _forward.x * step, -_direction.z * _forward.z * step)
  tryMoveCamera( _direction.x * _right.x   * step,  _direction.x * _right.z   * step)

  camera.position.y += _direction.y * step * 0.55
  camera.position.y  = Math.max(minCameraY, Math.min(maxCameraY, camera.position.y))
  clampCameraToRoom(camera.position)
}

function updateXmasLights(time) {
  xmasLights.forEach((light) => {
    if (!light.userData.active) return
    light.intensity = light.userData.baseIntensity * (0.75 + 0.25 * Math.sin(time * 3.5 + light.userData.phase))
  })
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  cameraLight.position.copy(camera.position)
  moveCamera(dt)
  updateXmasLights(clock.elapsedTime)
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(1)
  renderer.setSize(window.innerWidth, window.innerHeight)
})
