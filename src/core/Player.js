import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { setHelpTextVisible } from '../ui/Overlay/index.js';

export class Player {
    constructor(scene, physicsWorld) {
        this.scene = scene; // Guardamos la escena

        // 1. CÁMARA (Mundo Visual)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.02, 180);
        if (this.scene) {
            this.scene.add(this.camera); // Añadimos la cámara a la escena
        }

        // 2. CUERPO FÍSICO (Mundo Físico)
        // Reducimos muchísimo el radio porque el modelo GLTF tiene scale(0.04) y la sala es minúscula
        const radius = 0.04;
        this.body = new CANNON.Body({
            mass: 75,
            shape: new CANNON.Sphere(radius),
            position: new CANNON.Vec3(0, 0.1, 0),
            fixedRotation: true // Evita que la esfera ruede y mueva la cámara a los lados
        });

        // Material para que no rebote como pelota
        const physicsMaterial = new CANNON.Material('playerMaterial');
        this.body.material = physicsMaterial;
        physicsWorld.world.addBody(this.body);

        // Contact material para evitar rebotes exagerados con el suelo
        const playerContactMat = new CANNON.ContactMaterial(
            physicsWorld.world.defaultMaterial,
            physicsMaterial,
            { friction: 0.0, restitution: 0.0 }
        );
        physicsWorld.world.addContactMaterial(playerContactMat);

        // 3. CONTROLES DE VISIÓN (Mouse)
        this.controls = new PointerLockControls(this.camera, document.body);

        document.body.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                // Atrapamos el error si el usuario hace click demasiado rápido después de salir
                this.controls.lock();
            }
        });

        this.controls.addEventListener('lock', () => {
            setHelpTextVisible(false);
        });

        this.controls.addEventListener('unlock', () => {
            setHelpTextVisible(true);
        });

        // 4. MOVIMIENTO (Teclado)
        this.keys = { w: false, a: false, s: false, d: false };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });

        // 5. RESIZE DE LA CÁMARA
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    setPosition(x, y, z) {
        this.body.position.set(x, y, z);
        this.body.velocity.set(0, 0, 0);
        this.camera.position.set(x, y + 0.005, z); // Sincronización inicial
        this.camera.lookAt(x, y + 0.005, z - 1); // Mirar hacia el frente
    }

    update() {
        // 1. SIEMPRE sincronizar visualmente la cámara con el cuerpo físico (incluso si no está bloqueado)
        // Altura de los ojos (bajamos un poco más la cámara a petición)
        this.camera.position.set(this.body.position.x, this.body.position.y + 0.005, this.body.position.z);

        // Si no está bloqueado el ratón, el jugador no puede moverse, pero la gravedad sigue afectándolo
        if (!this.controls.isLocked) return;

        // 2. WASD
        const x = Number(this.keys.d) - Number(this.keys.a);
        const z = Number(this.keys.s) - Number(this.keys.w);

        const moveDir = new THREE.Vector3(x, 0, z);
        if (moveDir.lengthSq() > 0) moveDir.normalize();

        // 3. Extraer rotación horizontal de la cámara
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);

        // 4. Alinear el movimiento
        moveDir.applyEuler(new THREE.Euler(0, euler.y, 0));

        const speed = 1; // Velocidad de caminata ajustada

        // 5. Aplicar la velocidad física
        if (moveDir.lengthSq() > 0) {
            // Reemplaza la velocidad X y Z, pero conserva la Y (gravedad)
            this.body.velocity.x = moveDir.x * speed;
            this.body.velocity.z = moveDir.z * speed;
        } else {
            // Fricción manual en X y Z cuando no pulsas teclas (para resbalar un poco y parar)
            this.body.velocity.x *= 0.8;
            this.body.velocity.z *= 0.8;
        }
    }
}