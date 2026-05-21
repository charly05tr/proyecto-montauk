import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Configuracion
const LOW_QUALITY              = true
const USE_NORMAL_MAPS          = false
const USE_EXTRA_MAPS           = false
const ENABLE_SHADOWS           = false
const ENABLE_XMAS_POINT_LIGHTS = true
// Escena

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

// Carga
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

// Estado
let minCameraY          = -5.0
let maxCameraY          =  5.0
let startPosition       = new THREE.Vector3(0, 0, 0)
let startLookTarget     = new THREE.Vector3(0, 0, -1)
let roomCollisionBounds = null

// Reloj
const clock = new THREE.Clock()

// Luces
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

// Luces navidenas
const xmasBulbMaterialNames = ['red_lamp', 'blue_lamp', 'yellow_lamp']
const xmasBulbs = []
const xmasLights = []

// Texturas
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

// Materiales
function getMaterialName(m) {
  return Array.isArray(m) ? m[0]?.name : m?.name
}

function isRoomSurfaceMaterial(n) {
  return ['ceiling','floor_wood','wall_texture','wood-separator','wood-planks','plank','letters','garland_wire'].includes(n)
}

function getBulbColor(name) {
  if (name === 'red_lamp') return new THREE.Color(0xff2514)
  if (name === 'blue_lamp') return new THREE.Color(0x20c7ff)
  if (name === 'yellow_lamp') return new THREE.Color(0xffe05a)
  return new THREE.Color(0xffffff)
}

function optimizeMaterial(m) {
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
  if (!material) return material
  const src = material.clone()

  if (src.name === 'letters') {
    optimizeMaterial(src)
    return new THREE.MeshBasicMaterial({
      map: src.map,
      color: 0x5a2a14,
      transparent: true,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      name: 'letters',
    })
  }

  if (xmasBulbMaterialNames.includes(src.name)) {
    const color = getBulbColor(src.name)
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
      name: src.name,
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

// Colision
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

// Camara
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

// Carga sala
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

      // Luces navidenas
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

// Input
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

// Movimiento
const _forward   = new THREE.Vector3()
const _right     = new THREE.Vector3()
const _direction = new THREE.Vector3()

function moveCamera(delta) {
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

// Loop
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
