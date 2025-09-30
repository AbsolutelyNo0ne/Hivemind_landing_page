import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

class ParticleSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('particle-canvas'),
            antialias: true,
            alpha: true
        });
        
        this.particles = [];
        this.particleCount = 2000;
        this.attractorType = 0;
        this.morphProgress = 0;
        this.autoRotation = { x: 0.0005, y: 0.0005 };
        this.isUserInteracting = false;
        
        this.colorPalette = {
            slow: new THREE.Color(0x2596be),
            fast: new THREE.Color(0xfda852),
            fastest: new THREE.Color(0xdf4d0d)
        };
        
        this.init();
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Setup camera
        this.camera.position.z = 50;
        
        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = false;
        
        // Track user interaction
        this.controls.addEventListener('start', () => {
            this.isUserInteracting = true;
        });
        
        this.controls.addEventListener('end', () => {
            this.isUserInteracting = false;
        });
        
        // Setup post-processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,
            0.4,
            0.85
        );
        this.composer.addPass(bloomPass);
        this.composer.addPass(new OutputPass());
        
        // Create particles
        this.createParticles();
        
        // Start animation
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
        
        // Attractor morphing
        setInterval(() => {
            this.attractorType = (this.attractorType + 1) % 5;
        }, 8000);
    }
    
    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Random initial positions
            positions[i3] = (Math.random() - 0.5) * 50;
            positions[i3 + 1] = (Math.random() - 0.5) * 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 50;
            
            // Initial colors
            colors[i3] = this.colorPalette.slow.r;
            colors[i3 + 1] = this.colorPalette.slow.g;
            colors[i3 + 2] = this.colorPalette.slow.b;
            
            sizes[i] = Math.random() * 2 + 0.5;
            
            // Store particle data
            this.particles.push({
                x: positions[i3],
                y: positions[i3 + 1],
                z: positions[i3 + 2],
                vx: 0,
                vy: 0,
                vz: 0
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.0, 0.5, r);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }
    
    updateParticles(deltaTime) {
        const positions = this.particleSystem.geometry.attributes.position.array;
        const colors = this.particleSystem.geometry.attributes.color.array;
        const dt = Math.min(deltaTime, 0.02);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const i3 = i * 3;
            
            // Calculate attractor forces
            let force = this.getAttractorForce(p.x, p.y, p.z);
            
            // Update velocity
            p.vx += force.x * dt;
            p.vy += force.y * dt;
            p.vz += force.z * dt;
            
            // Apply damping
            const damping = 0.98;
            p.vx *= damping;
            p.vy *= damping;
            p.vz *= damping;
            
            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            
            // Keep particles centered
            const maxDist = 50;
            const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
            if (dist > maxDist) {
                const scale = maxDist / dist;
                p.x *= scale;
                p.y *= scale;
                p.z *= scale;
            }
            
            // Update buffer
            positions[i3] = p.x;
            positions[i3 + 1] = p.y;
            positions[i3 + 2] = p.z;
            
            // Color based on speed (exponential)
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
            const speedNorm = Math.min(Math.pow(speed / 10, 2), 1);
            
            if (speedNorm < 0.5) {
                const t = speedNorm * 2;
                colors[i3] = this.colorPalette.slow.r * (1 - t) + this.colorPalette.fast.r * t;
                colors[i3 + 1] = this.colorPalette.slow.g * (1 - t) + this.colorPalette.fast.g * t;
                colors[i3 + 2] = this.colorPalette.slow.b * (1 - t) + this.colorPalette.fast.b * t;
            } else {
                const t = (speedNorm - 0.5) * 2;
                colors[i3] = this.colorPalette.fast.r * (1 - t) + this.colorPalette.fastest.r * t;
                colors[i3 + 1] = this.colorPalette.fast.g * (1 - t) + this.colorPalette.fastest.g * t;
                colors[i3 + 2] = this.colorPalette.fast.b * (1 - t) + this.colorPalette.fastest.b * t;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }
    
    getAttractorForce(x, y, z) {
        const scale = 0.01;
        this.morphProgress += 0.01;
        const t = (Math.sin(this.morphProgress) + 1) / 2;
        
        switch (this.attractorType) {
            case 0: // Lorenz
                return {
                    x: 10 * (y - x) * scale,
                    y: (x * (28 - z) - y) * scale,
                    z: (x * y - 8/3 * z) * scale
                };
            
            case 1: // Aizawa
                const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
                return {
                    x: ((z - b) * x - d * y) * scale,
                    y: (d * x + (z - b) * y) * scale,
                    z: (c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x) * scale
                };
            
            case 2: // Rossler
                const a2 = 0.2, b2 = 0.2, c2 = 5.7;
                return {
                    x: (-y - z) * scale,
                    y: (x + a2 * y) * scale,
                    z: (b2 + z * (x - c2)) * scale
                };
            
            case 3: // Chen
                const a3 = 35, b3 = 3, c3 = 28;
                return {
                    x: (a3 * (y - x)) * scale,
                    y: ((c3 - a3) * x - x * z + c3 * y) * scale,
                    z: (x * y - b3 * z) * scale
                };
            
            case 4: // Thomas
                const b4 = 0.208186;
                return {
                    x: (Math.sin(y) - b4 * x) * scale * 2,
                    y: (Math.sin(z) - b4 * y) * scale * 2,
                    z: (Math.sin(x) - b4 * z) * scale * 2
                };
            
            default:
                return { x: 0, y: 0, z: 0 };
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = 0.016;
        this.updateParticles(deltaTime);
        
        // Auto-rotation when not interacting
        if (!this.isUserInteracting) {
            this.particleSystem.rotation.x += this.autoRotation.x;
            this.particleSystem.rotation.y += this.autoRotation.y;
        }
        
        this.controls.update();
        this.composer.render();
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Initialize particle system
new ParticleSystem();