// Create a new Three.js scene
const scene = new THREE.Scene();

// Create a perspective camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create a WebGL renderer
const renderer = new THREE.WebGLRenderer();

// Set the renderer size
renderer.setSize(window.innerWidth, window.innerHeight);

// Append the renderer's DOM element to the HTML body
document.body.appendChild(renderer.domElement);

// Set the camera position
camera.position.z = 5;

// Define the number of particles
const particleCount = 5000;

// Create a geometry to hold the particle vertices
const particles = new THREE.BufferGeometry();

// Create an array to store particle positions
const positions = new Float32Array(particleCount * 3);

// Populate the positions array with random x, y, and z coordinates for each particle
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 10; // x
  positions[i * 3 + 1] = (Math.random() - 0.5) * 10; // y
  positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
}

// Set the 'position' attribute for the particle geometry
particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Create a material for the particles
const particleMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 });

// Create the particle system (Points object)
const particleSystem = new THREE.Points(particles, particleMaterial);

// Add the particle system to the scene
scene.add(particleSystem);

// Create a basic animation loop
function animate() {
    requestAnimationFrame(animate);
    particleSystem.rotation.y += 0.001; // Example animation: rotate particles
    renderer.render(scene, camera);
}
animate();
