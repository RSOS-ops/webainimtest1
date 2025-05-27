import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { FontLoader } from 'https://unpkg.com/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://unpkg.com/three/examples/jsm/geometries/TextGeometry.js';
// BufferGeometry, Float32BufferAttribute, PointsMaterial, Points, Color are part of the THREE namespace
// No new specific imports needed if * as THREE is used.

// Global Scene Variables
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
let globalFont = null; // Will hold the loaded font

// Global Animation State
let stackData = []; // Parsed from HTML, holds timings and text data
let maskCache = []; // Holds geometry points for each character

let currentStackId = -1;
let currentTextOpacity = 0; // Overall opacity for the current text block
let maskTick = 0; // Timer for current state (e.g., hold time)
let currentStateFunction = null; // Points to the current state logic (nextMaskState, etc.)

let activeDynamicParticles = null; // THREE.Points object for current dynamic text
let activeStaticParticles = null; // THREE.Points object for current static shimmer text

let activeParticlesDataArray = []; // Holds animation state for individual dynamic particles
let activeStaticDataArray = []; // Holds animation state for individual static particles

let tick = 0; // Global animation tick, incremented each frame

// Initial Setup
camera.position.set(0, 0, 10);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// --- Simple Cube Test ---
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);
// --- End Simple Cube Test ---

// Font Loading
const fontLoader = new FontLoader();
fontLoader.load('https://unpkg.com/three/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    globalFont = font;
    stackData = fetchData(); // Populate stackData
    // Pre-generate all mask geometries
    stackData.forEach(stack => {
        const textMasksForStack = buildTextMask(stack.texts, globalFont);
        maskCache.push(textMasksForStack);
    });
    console.log('Stack Data:', stackData);
    console.log('Mask Cache:', maskCache);

    // currentStateFunction = nextMaskState; // Kick off the animation sequence - COMMENTED OUT FOR CUBE TEST
});

function createTextEffect(stackIndex) {
    if (!globalFont || stackIndex < 0 || stackIndex >= maskCache.length) {
        console.error('Font not loaded or invalid stackIndex for createTextEffect');
        return { dynamicSystem: null, staticSystem: null };
    }

    activeParticlesDataArray = [];
    activeStaticDataArray = [];

    const currentTextMasks = maskCache[stackIndex]; // Array of character masks for the current text block
    const currentTextData = stackData[stackIndex];   // Text data (timings, texts array) for the current block

    let totalDynamicPoints = 0;
    let totalStaticPoints = 0;
    currentTextMasks.forEach(charMask => {
        totalDynamicPoints += charMask.points.length;
        totalStaticPoints += charMask.points.length; // Same number of points for static
    });

    const allDynamicPositions = new Float32Array(totalDynamicPoints * 3);
    const allDynamicColors = new Float32Array(totalDynamicPoints * 4);
    const allStaticPositions = new Float32Array(totalStaticPoints * 3);
    const allStaticColors = new Float32Array(totalStaticPoints * 4);

    let dynamicOffset = 0;
    let staticOffset = 0;
    let currentXOffset = 0;
    const charSpacing = 4; // Approximate character width + spacing (adjust as needed)
    // To center the whole word, we first need to calculate its total width
    let totalWordWidth = 0;
    currentTextMasks.forEach((charMask, charIndex) => {
        // For simplicity, using a fixed width. A more accurate way would be to use charMask.points bounds.
        totalWordWidth += charSpacing;
    });
    totalWordWidth -= charSpacing; // No spacing after the last character
    
    let initialXOffset = -totalWordWidth / 2;


    currentTextMasks.forEach((charMask, charIndex) => {
        const charHslColor = currentTextData.texts[charIndex].hsl;
        const dynamicBaseColor = new THREE.Color();
        dynamicBaseColor.setHSL(charHslColor.h / 360, charHslColor.s / 100, charHslColor.l / 100);
        const staticBaseColor = new THREE.Color().copy(dynamicBaseColor); // Same color for static

        charMask.points.forEach(point => {
            // Dynamic Particle Data
            const dynamicParticle = {
                originalX: point.x + currentXOffset + initialXOffset,
                originalY: point.y,
                originalZ: point.z,
                x: point.x + currentXOffset + initialXOffset,
                y: point.y,
                z: point.z,
                vx: (-0.5 + Math.random()) / 200, // Adjusted drift speed
                vy: (-0.5 + Math.random()) / 200, // Adjusted drift speed
                vz: (-0.5 + Math.random()) / 200, // Adjusted drift speed
                life: 0,
                opacity: 0,
                s: 0.005 + Math.random() / 150, // Adjusted life progression speed
                hsl: charHslColor
            };
            activeParticlesDataArray.push(dynamicParticle);
            allDynamicPositions[dynamicOffset * 3 + 0] = dynamicParticle.x;
            allDynamicPositions[dynamicOffset * 3 + 1] = dynamicParticle.y;
            allDynamicPositions[dynamicOffset * 3 + 2] = dynamicParticle.z;
            allDynamicColors[dynamicOffset * 4 + 0] = dynamicBaseColor.r;
            allDynamicColors[dynamicOffset * 4 + 1] = dynamicBaseColor.g;
            allDynamicColors[dynamicOffset * 4 + 2] = dynamicBaseColor.b;
            allDynamicColors[dynamicOffset * 4 + 3] = 0; // Initial opacity
            dynamicOffset++;

            // Static Particle Data
            const staticParticle = {
                x: point.x + currentXOffset + initialXOffset,
                y: point.y,
                z: point.z,
                hsl: charHslColor,
                t: Math.random(),
                o: Math.random() * Math.PI * 2,
                currentOpacity: 0
            };
            activeStaticDataArray.push(staticParticle);
            allStaticPositions[staticOffset * 3 + 0] = staticParticle.x;
            allStaticPositions[staticOffset * 3 + 1] = staticParticle.y;
            allStaticPositions[staticOffset * 3 + 2] = staticParticle.z;
            allStaticColors[staticOffset * 4 + 0] = staticBaseColor.r;
            allStaticColors[staticOffset * 4 + 1] = staticBaseColor.g;
            allStaticColors[staticOffset * 4 + 2] = staticBaseColor.b;
            allStaticColors[staticOffset * 4 + 3] = 0; // Initial opacity
            staticOffset++;
        });
        currentXOffset += charSpacing; // Move to the next character position
    });

    const dynamicSystemGeometry = new THREE.BufferGeometry();
    dynamicSystemGeometry.setAttribute('position', new THREE.BufferAttribute(allDynamicPositions, 3));
    dynamicSystemGeometry.setAttribute('color', new THREE.BufferAttribute(allDynamicColors, 4));
    const dynamicSystemMaterial = new THREE.PointsMaterial({
        size: 0.15, // Adjusted size
        vertexColors: true,
        transparent: true,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending // Enabled Additive Blending
    });
    const finalDynamicSystem = new THREE.Points(dynamicSystemGeometry, dynamicSystemMaterial);

    const staticSystemGeometry = new THREE.BufferGeometry();
    staticSystemGeometry.setAttribute('position', new THREE.BufferAttribute(allStaticPositions, 3));
    staticSystemGeometry.setAttribute('color', new THREE.BufferAttribute(allStaticColors, 4));
    const staticSystemMaterial = new THREE.PointsMaterial({
        size: 0.08, // Adjusted size
        vertexColors: true,
        transparent: true,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending // Enabled Additive Blending
    });
    const finalStaticSystem = new THREE.Points(staticSystemGeometry, staticSystemMaterial);
    
    // console.log(`Created text effect for stack ${stackIndex} with ${activeParticlesDataArray.length} dynamic particles and ${activeStaticDataArray.length} static particles.`);
    return { dynamicSystem: finalDynamicSystem, staticSystem: finalStaticSystem };
}

// Animation State Functions
function nextMaskState() {
    // console.log("State: nextMaskState");
    if (activeDynamicParticles) {
        scene.remove(activeDynamicParticles);
        activeDynamicParticles.geometry.dispose();
        activeDynamicParticles.material.dispose();
        activeDynamicParticles = null;
    }
    if (activeStaticParticles) {
        scene.remove(activeStaticParticles);
        activeStaticParticles.geometry.dispose();
        activeStaticParticles.material.dispose();
        activeStaticParticles = null;
    }
    activeParticlesDataArray = []; 
    activeStaticDataArray = [];  

    currentStackId++;
    if (currentStackId >= stackData.length) {
        currentStackId = 0;
    }

    const systems = createTextEffect(currentStackId);
    activeDynamicParticles = systems.dynamicSystem;
    activeStaticParticles = systems.staticSystem;

    if (activeDynamicParticles) scene.add(activeDynamicParticles);
    if (activeStaticParticles) scene.add(activeStaticParticles);
    
    currentTextOpacity = 0;
    maskTick = 0;

    const currentStack = stackData[currentStackId];
    if (currentStack.fadeIn <= 0) { 
        currentTextOpacity = 1;
        currentStateFunction = afterFadeInState;
    } else {
        currentStateFunction = fadeInMaskState;
    }
}

function fadeInMaskState() {
    // console.log("State: fadeInMaskState, Opacity:", currentTextOpacity);
    const fadeInIncrement = stackData[currentStackId].fadeIn || 0.01; 
    currentTextOpacity += fadeInIncrement;
    if (currentTextOpacity >= 1) {
        currentTextOpacity = 1;
        currentStateFunction = afterFadeInState;
    }
}

function afterFadeInState() {
    // console.log("State: afterFadeInState");
    maskTick = 0;
    const currentTicks = stackData[currentStackId].ticks;
    if (currentTicks > 0) {
        currentStateFunction = tickMaskState;
    } else {
        const fadeOutValue = stackData[currentStackId].fadeOut;
        currentStateFunction = (fadeOutValue > 0) ? fadeOutMaskState : afterFadeOutState;
    }
}

function tickMaskState() {
    maskTick++;
    // console.log("State: tickMaskState, Tick:", maskTick, "of", stackData[currentStackId].ticks);
    if (maskTick >= stackData[currentStackId].ticks) {
        const fadeOutValue = stackData[currentStackId].fadeOut;
        currentStateFunction = (fadeOutValue > 0) ? fadeOutMaskState : afterFadeOutState;
    }
}

function fadeOutMaskState() {
    // console.log("State: fadeOutMaskState, Opacity:", currentTextOpacity);
    const fadeOutIncrement = stackData[currentStackId].fadeOut || 0.01; 
    currentTextOpacity -= fadeOutIncrement;
    if (currentTextOpacity <= 0) {
        currentTextOpacity = 0;
        currentStateFunction = afterFadeOutState;
    }
}

function afterFadeOutState() {
    // console.log("State: afterFadeOutState");
    currentStateFunction = nextMaskState;
}


function fetchData() {
    const stacks = [];
    document.querySelectorAll('#text-data > ul').forEach(ulElement => {
        const stack = {
            ticks: parseInt(ulElement.dataset.time) / (1000 / 60), // Convert ms to animation ticks
            fadeIn: parseFloat(ulElement.dataset.fadeIn) || 0.01,
            fadeOut: parseFloat(ulElement.dataset.fadeOut) || 0.01,
            texts: []
        };
        ulElement.querySelectorAll('li').forEach(liElement => {
            stack.texts.push({
                text: liElement.innerText,
                hsl: {
                    h: parseInt(liElement.dataset.hue),
                    s: parseInt(liElement.dataset.saturation) || 100,
                    l: parseInt(liElement.dataset.lightness) || 50
                }
            });
        });
        stacks.push(stack);
    });
    return stacks;
}

function buildTextMask(texts, font) {
    const characterMasks = [];
    texts.forEach(character => {
        const geometry = new TextGeometry(character.text, {
            font: font,
            size: 5,
            height: 0.1, // Minimal depth
            curveSegments: 4, // Lower for performance if not highly curved
            bevelEnabled: false
        });
        geometry.center(); // Center the geometry

        const points = [];
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            points.push({
                x: positions.getX(i),
                y: positions.getY(i),
                z: positions.getZ(i) // Keep z, might be useful for perspective
            });
        }
        geometry.dispose(); // Dispose of geometry to free resources

        characterMasks.push({
            hsl: character.hsl,
            points: points
        });
    });
    return characterMasks;
}


// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    tick++;

    if (currentStateFunction) {
        currentStateFunction();
    }

    // Animate dynamic particles
    if (activeDynamicParticles && activeParticlesDataArray.length > 0) {
        const dynamicPositions = activeDynamicParticles.geometry.attributes.position.array;
        const dynamicColors = activeDynamicParticles.geometry.attributes.color.array;
        const tempColor = new THREE.Color();

        activeParticlesDataArray.forEach((particle, i) => {
            particle.life += particle.s;
            particle.life = Math.min(particle.life, 1.0);
            particle.opacity = particle.life; // Intrinsic particle opacity based on its life

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;

            dynamicPositions[i * 3] = particle.x;
            dynamicPositions[i * 3 + 1] = particle.y;
            dynamicPositions[i * 3 + 2] = particle.z;

            tempColor.setHSL(particle.hsl.h / 360, particle.hsl.s / 100, particle.hsl.l / 100);
            dynamicColors[i * 4] = tempColor.r;
            dynamicColors[i * 4 + 1] = tempColor.g;
            dynamicColors[i * 4 + 2] = tempColor.b;
            dynamicColors[i * 4 + 3] = particle.opacity * currentTextOpacity; // Modulate by global text opacity
        });

        activeDynamicParticles.geometry.attributes.position.needsUpdate = true;
        activeDynamicParticles.geometry.attributes.color.needsUpdate = true;
    }

    // Animate static particles
    if (activeStaticParticles && activeStaticDataArray.length > 0) {
        const staticColors = activeStaticParticles.geometry.attributes.color.array;
        
        activeStaticDataArray.forEach((sParticle, i) => {
            sParticle.o += 0.015; // Adjusted shimmer phase speed
            const baseShimmerOpacity = (1 + Math.cos(sParticle.x * 5 * sParticle.y * 5 + tick / 10 + sParticle.o)) / 2;
            sParticle.currentOpacity = baseShimmerOpacity * sParticle.t * 0.5; // Intrinsic particle opacity

            // RGB for static particles is set once and assumed not to change, only alpha.
            staticColors[i * 4 + 3] = sParticle.currentOpacity * currentTextOpacity; // Modulate by global
        });
        activeStaticParticles.geometry.attributes.color.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
animate();

// Window Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});