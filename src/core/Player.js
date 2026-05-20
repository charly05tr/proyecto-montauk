import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(scene, physicsWorld) {
        // 1. CÁMARA (Mundo Visual)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        
        // 2. CUERPO FÍSICO (Mundo Físico) - Una esfera de 1.5m de altura
        const radius = 0.5;
        this.body = new CANNON.Body({
            mass: 75, // Peso del jugador
            shape: new CANNON.Sphere(radius),
            position: new CANNON.Vec3(0, 2, 0), // Empezar un poco arriba del suelo
            linearDamping: 0.9 // Simular roce del aire/suelo para que frene al soltar la tecla
        });
        // Evitar que la esfera ruede (queremos que se deslice)
        this.body.angularFactor.set(0, 0, 0); 
        physicsWorld.world.addBody(this.body);

        // 3. CONTROLES DE VISIÓN (Mouse)
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Para activar el modo "primera persona" al hacer clic
        document.body.addEventListener('click', () => {
            this.controls.lock();
        });

        // 4. MOVIMIENTO (Teclado)
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.keys = { w: false, a: false, s: false, d: false, space: false };

        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update() {
        if (!this.controls.isLocked) return;

        // 1. WASD
        const x = Number(this.keys.d) - Number(this.keys.a);
        const z = Number(this.keys.s) - Number(this.keys.w);

        const moveDir = new THREE.Vector3(x, 0, z);
        moveDir.normalize();

        // 2. Extraer SOLO la rotación horizontal (Y) de la cámara
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);

        // 3. Alinear el movimiento con hacia dónde mira la cámara
        // Rotamos el vector de movimiento usando solo el ángulo horizontal
        moveDir.applyEuler(new THREE.Euler(0, euler.y, 0));

        const speed = 5.0; // Velocidad de caminata

        // 4. Aplicar la velocidad física
        if (moveDir.lengthSq() > 0) {
            this.body.velocity.x = moveDir.x * speed;
            this.body.velocity.z = moveDir.z * speed;
        }

        // Salto básico
        if (this.keys.space && Math.abs(this.body.velocity.y) < 0.1) {
            this.body.velocity.y = 5;
            this.keys.space = false;
        }

        // 5. Sincronización visual
        this.camera.position.copy(this.body.position);
        this.camera.position.y += 0.5; // Altura de los ojos
    }
}