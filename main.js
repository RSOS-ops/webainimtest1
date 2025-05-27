import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';
import { FontLoader } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/jsm/geometries/TextGeometry.js';

// Initialize renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Initialize camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15; // Adjusted camera position for better text visibility

// Particle System Variables
const clock = new THREE.Clock();
let sourcePointsData = [];
let activeParticles = [];
const maxParticles = 5000;
const particlesPerFrame = 20; // Increased for denser effect
let particleSystem; // Will hold the THREE.Points object

// Text Animation State Variables
const TEXT_STATE_IDLE = 0;
const TEXT_STATE_FADING_IN = 1;
const TEXT_STATE_VISIBLE = 2;
const TEXT_STATE_FADING_OUT = 3;

let currentTextState = TEXT_STATE_IDLE;
let textAnimationTimer = 0;
const fadeInDuration = 1.0; // seconds
const visibleDuration = 3.0; // seconds
const fadeOutDuration = 1.0; // seconds
let textMeshesFullyVisible = false;
let animatedTextGroup; // To store the textGroup for animation

// Decorative Particle System Variables
let decoParticleSystem;
let decoPointsData = [];

// Font Loader
const fontLoader = new FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function (font) {
    const textChars = [
        { char: 'D', colorHSL: { h: 197 / 360, s: 1.0, l: 0.5 } },
        { char: 'E', colorHSL: { h: 0 / 360, s: 1.0, l: 0.5 } },
        { char: 'V', colorHSL: { h: 197 / 360, s: 1.0, l: 0.5 } },
        { char: 'I', colorHSL: { h: 197 / 360, s: 1.0, l: 0.5 } },
        { char: 'L', colorHSL: { h: 45 / 360, s: 1.0, l: 0.5 } }
    ];

    const textGroup = new THREE.Group(); // This is the 'DEVIL' text
    animatedTextGroup = textGroup; // Assign to global for access in animate()
    let currentX = 0;
    const textHeight = 0.5; // Depth of the text
    const textSize = 5;
    const letterSpacing = 1; // Spacing between letters

    textChars.forEach(item => {
        const textGeo = new TextGeometry(item.char, {
            font: font,
            size: textSize,
            height: textHeight,
            curveSegments: 12,
            bevelEnabled: false
        });

        // Add a_random attribute to geometry
        const numVertices = textGeo.attributes.position.count;
        const randomsArray = new Float32Array(numVertices);
        for (let i = 0; i < numVertices; i++) {
            randomsArray[i] = Math.random();
        }
        textGeo.setAttribute('a_random', new THREE.BufferAttribute(randomsArray, 1));

        const uniforms = {
            u_time: { value: 0.0 },
            u_charOpacity: { value: 0.0 } // Initial opacity for fade-in
        };

        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // Base color, will be set by HSL
            transparent: true,
            // opacity: 1, // Opacity now controlled by u_charOpacity via shader
        });
        textMaterial.color.setHSL(item.colorHSL.h, item.colorHSL.s, item.colorHSL.l);
        textMaterial.userData.uniforms = uniforms; // Store uniforms

        textMaterial.onBeforeCompile = shader => {
            shader.uniforms.u_time = uniforms.u_time;
            shader.uniforms.u_charOpacity = uniforms.u_charOpacity;

            shader.vertexShader = 'attribute float a_random;\n' +
                                  'varying float v_random;\n' +
                                  'varying vec3 v_localPosition;\n' +
                                  shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <project_vertex>',
                '#include <project_vertex>\n' +
                'v_random = a_random;\n' +
                'v_localPosition = position;\n' // 'position' is the local vertex position attribute
            );

            shader.fragmentShader = 'uniform float u_time;\n' +
                                    'uniform float u_charOpacity;\n' +
                                    'varying float v_random;\n' +
                                    'varying vec3 v_localPosition;\n' +
                                    shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float shimmer = (1.0 + cos(v_localPosition.x * 4.0 + v_localPosition.y * 4.0 + u_time * 5.0)) / 2.0; // Increased spatial and time frequency
                float finalAlpha = shimmer * u_charOpacity * v_random * 0.8 + u_charOpacity * 0.2; // Ensure some base visibility from u_charOpacity
                finalAlpha = clamp(finalAlpha, 0.0, 1.0); // Clamp final alpha
                gl_FragColor = vec4(diffuseColor.rgb, finalAlpha);` // Use diffuseColor.rgb (which holds the material's color)
            );
            // Store the modified shader for debugging or potential reuse
            // textMaterial.userData.shader = shader; 
        };

        const textMesh = new THREE.Mesh(textGeo, textMaterial);
        textMesh.position.x = currentX;
        
        // Calculate width of the current character for positioning next one
        textGeo.computeBoundingBox();
        const charWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
        currentX += charWidth + letterSpacing;

        textGroup.add(textMesh);
    });

    // Center the group
    // To do this, we need the total width of the group
    // currentX already holds the total width + one extra letterSpacing
    // So, total width is currentX - letterSpacing
    const totalWidth = currentX - letterSpacing;
    textGroup.position.x = -totalWidth / 2;
    
    // Ensure matrices are updated for world coordinate calculation
    textGroup.updateMatrixWorld(true); 

    scene.add(textGroup); // Add to scene so matrixWorld is calculated correctly

    // --- Populate sourcePointsData ---
    textGroup.children.forEach(mesh => {
        mesh.updateMatrixWorld(true); // Ensure matrixWorld is up to date
        const geometry = mesh.geometry;
        const positions = geometry.attributes.position;
        const meshColor = mesh.material.color.clone(); // Get the color of the letter
        const localVertex = new THREE.Vector3();

        for (let i = 0; i < positions.count; i++) {
            localVertex.fromBufferAttribute(positions, i);
            const worldVertex = localVertex.clone().applyMatrix4(mesh.matrixWorld);
            sourcePointsData.push({
                position: worldVertex,
                color: meshColor
            });
        }
    });
    
    // --- Initialize Dynamic Particle System ---
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxParticles * 3), 3));
    particlesGeometry.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(maxParticles * 3), 3));
    particlesGeometry.setAttribute('customAlpha', new THREE.BufferAttribute(new Float32Array(maxParticles * 1), 1));
    particlesGeometry.setAttribute('customSize', new THREE.BufferAttribute(new Float32Array(maxParticles * 1), 1)); // For per-particle size via shader

    const particleMaterial = new THREE.PointsMaterial({
        // size: 5, // Base size, will be overridden by customSize attribute via shader
        vertexColors: true, // Use customColor attribute
        transparent: true,
        // opacity: 0.5, // Opacity will be controlled by customAlpha and shader
        depthTest: false, // Optional: particles often look better without depth testing
        blending: THREE.AdditiveBlending // Optional: for a brighter effect
    });

    particleMaterial.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            [
                '#include <common>',
                'attribute float customAlpha;',
                'attribute float customSize;', // If using per-particle size
                'varying float vAlpha;',
                // 'varying float vSize;', // vSize is not strictly needed if size is only for gl_PointSize
            ].join('\n')
        ).replace(
            '#include <begin_vertex>',
            [
                '#include <begin_vertex>',
                'vAlpha = customAlpha;',
                // 'transformed *= customSize / 5.0; ', // Example if size affected model coords
            ].join('\n')
        ).replace(
            // This might need adjustment based on Three.js version's default shader
            'gl_PointSize = size;', 
            'gl_PointSize = customSize * step(0.0, vAlpha);' // Use customSize, hide if alpha is zero
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            [
                '#include <common>',
                'varying float vAlpha;',
            ].join('\n')
        ).replace(
            '#include <color_fragment>',
            [
                '#include <color_fragment>',
                'if (vAlpha <= 0.0) discard;', // Discard pixel if alpha is zero or less
                'gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a * vAlpha);',
            ].join('\n')
        );
    };
    
    particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
    scene.add(particleSystem);

    // Remove any previous static particle system (if it was named 'particles')
    const oldParticles = scene.getObjectByName("particles"); // Assuming it might have been named
    if (oldParticles) {
        scene.remove(oldParticles);
        if (oldParticles.geometry) oldParticles.geometry.dispose();
        if (oldParticles.material) oldParticles.material.dispose();
    }
    // Initial spawn can be done here if needed, or let animate loop handle it
    
    // Start text animation
    currentTextState = TEXT_STATE_FADING_IN;
    textAnimationTimer = 0;

    // --- Create decoPointsData ---
    for (let i = 0; i < sourcePointsData.length; i++) {
        if (i % 2 === 0) { // Roughly every other point
            const sourcePoint = sourcePointsData[i];
            decoPointsData.push({
                position: sourcePoint.position.clone(),
                color: sourcePoint.color.clone(),
                isCircle: Math.random() < 0.5,
                animOffset: Math.random(),
                baseSize: 3.0 + Math.random() * 3.0 // Adjusted for Three.js units
            });
        }
    }

    // --- Initialize Decorative Particle System ---
    if (decoPointsData.length > 0) {
        const maxDecoParticles = decoPointsData.length;
        const decoParticlesGeometry = new THREE.BufferGeometry();

        const positionsArray = new Float32Array(maxDecoParticles * 3);
        const colorsArray = new Float32Array(maxDecoParticles * 3);
        const animOffsetArray = new Float32Array(maxDecoParticles);
        const isCircleArray = new Float32Array(maxDecoParticles);
        const baseSizeArray = new Float32Array(maxDecoParticles);

        decoPointsData.forEach((data, i) => {
            positionsArray[i * 3 + 0] = data.position.x;
            positionsArray[i * 3 + 1] = data.position.y;
            positionsArray[i * 3 + 2] = data.position.z;

            colorsArray[i * 3 + 0] = data.color.r;
            colorsArray[i * 3 + 1] = data.color.g;
            colorsArray[i * 3 + 2] = data.color.b;

            animOffsetArray[i] = data.animOffset;
            isCircleArray[i] = data.isCircle ? 1.0 : 0.0;
            baseSizeArray[i] = data.baseSize;
        });

        decoParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
        decoParticlesGeometry.setAttribute('customColor', new THREE.BufferAttribute(colorsArray, 3)); // Will be v_color
        decoParticlesGeometry.setAttribute('a_animOffset', new THREE.BufferAttribute(animOffsetArray, 1));
        decoParticlesGeometry.setAttribute('a_isCircle', new THREE.BufferAttribute(isCircleArray, 1));
        decoParticlesGeometry.setAttribute('a_baseSize', new THREE.BufferAttribute(baseSizeArray, 1));

        const decoUniforms = {
            u_time: { value: 0.0 },
            u_textOverallOpacity: { value: 0.0 }
        };

        const decoParticlesMaterial = new THREE.PointsMaterial({
            vertexColors: true,
            transparent: true,
            sizeAttenuation: true, // Points scale with distance (or not, depending on shader)
            // size: 10, // Fallback size, but gl_PointSize will be used
        });
        decoParticlesMaterial.userData.uniforms = decoUniforms;

        decoParticlesMaterial.onBeforeCompile = shader => {
            shader.uniforms.u_time = decoUniforms.u_time;
            shader.uniforms.u_textOverallOpacity = decoUniforms.u_textOverallOpacity;

            shader.vertexShader = `
                attribute float a_animOffset;
                attribute float a_isCircle;
                attribute float a_baseSize;
                // customColor is already defined by Three.js when vertexColors = true
                // varying vec3 v_color; // Already declared by Three.js
                varying float v_isCircle;
                varying float v_elementOpa; // Pass calculated opacity to fragment

                uniform float u_time; // u_time for vertex shader calculations
                const float PI = ${Math.PI};

                ${shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                    // v_color = customColor; // Already handled by Three.js
                    v_isCircle = a_isCircle;

                    float currentOffset_vs = a_animOffset + u_time * 0.2; // Adjusted speed
                    v_elementOpa = (sin(currentOffset_vs * PI * 2.0) + 1.0) / 2.0; // Calculate here
                    // transformed.z += v_elementOpa * 0.5; // Example: make them pulse in Z
                `
            ).replace(
                // Ensure gl_PointSize is set *after* any projection calculations if needed, but usually here is fine
                'gl_PointSize = size;', // Default PointsMaterial size logic
                `gl_PointSize = a_baseSize + v_elementOpa * 8.0;` // Adjusted pulsation factor
            )}
            `;
            
            shader.fragmentShader = `
                uniform float u_textOverallOpacity;
                // varying vec3 v_color; // Already declared
                varying float v_isCircle;
                varying float v_elementOpa; // Receive from vertex shader

                ${shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                    float finalAlpha = u_textOverallOpacity * v_elementOpa * 0.2;

                    if (v_isCircle > 0.5) { // Circle
                        float r = dot(cxy, cxy);
                        if (r > 1.0) discard;
                    } // else Square - default point is square

                    // diffuseColor comes from vColor (customColor attribute)
                    gl_FragColor = vec4(diffuseColor.rgb, finalAlpha);
                `
            )}
            `;
        };
        
        decoParticleSystem = new THREE.Points(decoParticlesGeometry, decoParticlesMaterial);
        scene.add(decoParticleSystem);
    }
});


function spawnNewParticles() {
    if (!textMeshesFullyVisible) return; // Control particle spawning

    if (sourcePointsData.length === 0 || activeParticles.length >= maxParticles) {
        return;
    }

    const numToSpawn = Math.min(particlesPerFrame, maxParticles - activeParticles.length);

    for (let i = 0; i < numToSpawn; i++) {
        const sourcePoint = sourcePointsData[Math.floor(Math.random() * sourcePointsData.length)];
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,   // Increased overall speed/spread
            (Math.random() - 0.4) * 0.8,   // Slight upward bias, increased speed
            (Math.random() - 0.5) * 0.8    // Increased overall speed/spread
        );
        
        const particle = {
            position: sourcePoint.position.clone(),
            basePosition: sourcePoint.position.clone(),
            color: sourcePoint.color.clone(),
            velocity: velocity,
            opacity: 0.0,
            size: 1.0 + Math.random() * 4.0, // Will be used if customSize shader is implemented
            age: 0,
            lifetime: 1.5 + Math.random() * 2.5 // Adjusted lifetime: 1.5s to 4s
        };
        activeParticles.push(particle);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // --- Text Animation State Machine ---
    let currentTextOpacity = 0.0; // Default to 0
    if (animatedTextGroup && animatedTextGroup.children.length > 0 && animatedTextGroup.children[0].material.userData.uniforms) {
        currentTextOpacity = animatedTextGroup.children[0].material.userData.uniforms.u_charOpacity.value;
    }

    if (animatedTextGroup) {
        textAnimationTimer += deltaTime;
        const currentTime = clock.getElapsedTime();
        let newCharOpacityValue;

        if (currentTextState === TEXT_STATE_FADING_IN) {
            newCharOpacityValue = Math.min(1.0, textAnimationTimer / fadeInDuration);
            animatedTextGroup.children.forEach(mesh => {
                if (mesh.material.userData.uniforms) {
                    mesh.material.userData.uniforms.u_charOpacity.value = newCharOpacityValue;
                    mesh.material.userData.uniforms.u_time.value = currentTime;
                }
            });
            textMeshesFullyVisible = newCharOpacityValue > 0.1;
            currentTextOpacity = newCharOpacityValue; // Update for deco particles
            if (textAnimationTimer >= fadeInDuration) {
                animatedTextGroup.children.forEach(mesh => {
                    if (mesh.material.userData.uniforms) mesh.material.userData.uniforms.u_charOpacity.value = 1.0;
                });
                currentTextOpacity = 1.0; // Update for deco particles
                currentTextState = TEXT_STATE_VISIBLE;
                textAnimationTimer = 0;
                textMeshesFullyVisible = true;
            }
        } else if (currentTextState === TEXT_STATE_VISIBLE) {
            textMeshesFullyVisible = true; // Ensure it's true
            currentTextOpacity = 1.0; // Update for deco particles
            animatedTextGroup.children.forEach(mesh => {
                if (mesh.material.userData.uniforms) {
                    mesh.material.userData.uniforms.u_time.value = currentTime;
                    // u_charOpacity remains 1.0
                }
            });
            if (textAnimationTimer >= visibleDuration) {
                currentTextState = TEXT_STATE_FADING_OUT;
                textAnimationTimer = 0;
            }
        } else if (currentTextState === TEXT_STATE_FADING_OUT) {
            newCharOpacityValue = Math.max(0.0, 1.0 - (textAnimationTimer / fadeOutDuration));
            animatedTextGroup.children.forEach(mesh => {
                if (mesh.material.userData.uniforms) {
                    mesh.material.userData.uniforms.u_charOpacity.value = newCharOpacityValue;
                    mesh.material.userData.uniforms.u_time.value = currentTime;
                }
            });
            textMeshesFullyVisible = newCharOpacityValue > 0.1;
            currentTextOpacity = newCharOpacityValue; // Update for deco particles
            if (textAnimationTimer >= fadeOutDuration) {
                 animatedTextGroup.children.forEach(mesh => {
                    if (mesh.material.userData.uniforms) mesh.material.userData.uniforms.u_charOpacity.value = 0.0;
                });
                currentTextOpacity = 0.0; // Update for deco particles
                currentTextState = TEXT_STATE_IDLE; // Or loop: TEXT_STATE_FADING_IN
                textAnimationTimer = 0;
                textMeshesFullyVisible = false;
            }
        } else if (currentTextState === TEXT_STATE_IDLE) {
            currentTextOpacity = 0.0; // Update for deco particles
            // Optional: Restart logic or ensure u_time is still updated if shader relies on it for idle effects
            animatedTextGroup.children.forEach(mesh => {
                 if (mesh.material.userData.uniforms) mesh.material.userData.uniforms.u_time.value = currentTime;
            });
        }
    }

    // --- Update Decorative Particle System Uniforms ---
    if (decoParticleSystem) {
        const currentTime = clock.getElapsedTime(); // Could reuse from above if always present
        decoParticleSystem.material.userData.uniforms.u_time.value = currentTime;
        decoParticleSystem.material.userData.uniforms.u_textOverallOpacity.value = currentTextOpacity;
        }
    }

    // --- Particle Spawning & Animation ---
    spawnNewParticles();

    // Ensure particleSystem is initialized before accessing its attributes
    if (!particleSystem || !particleSystem.geometry) {
        renderer.render(scene, camera); // Render scene even if particles aren't ready
        return; 
    }
    
    const positions = particleSystem.geometry.attributes.position;
    const colors = particleSystem.geometry.attributes.customColor;
    const alphas = particleSystem.geometry.attributes.customAlpha;
    const sizes = particleSystem.geometry.attributes.customSize; // If using per-particle size

    let aliveParticles = 0;
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.age += deltaTime;

        if (p.age > p.lifetime) {
            activeParticles.splice(i, 1); // Remove dead particle
            continue; 
        }

        p.position.addScaledVector(p.velocity, deltaTime);
        
        // Opacity: fade in then fade out
        p.opacity = Math.sin((p.age / p.lifetime) * Math.PI);
        
        // For dynamic size: p.size could be updated here too

        // Update geometry attributes for alive particles
        positions.setXYZ(aliveParticles, p.position.x, p.position.y, p.position.z);
        colors.setXYZ(aliveParticles, p.color.r, p.color.g, p.color.b);
        alphas.setX(aliveParticles, p.opacity);
        sizes.setX(aliveParticles, p.size); // If using per-particle size
        
        aliveParticles++;
    }

    particleSystem.geometry.setDrawRange(0, aliveParticles);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    alphas.needsUpdate = true;
    sizes.needsUpdate = true; // If using per-particle size

    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});