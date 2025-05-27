// Create a new Three.js scene
const scene = new THREE.Scene();
let loadedObject; // Declare loadedObject

// Create a perspective camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create a WebGL renderer
const renderer = new THREE.WebGLRenderer();

// Set the renderer size
renderer.setSize(window.innerWidth, window.innerHeight);

// Append the renderer's DOM element to the HTML body
document.body.appendChild(renderer.domElement);

// Set the camera position
camera.position.z = 15;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White light from a direction
directionalLight.position.set(5, 10, 7.5); // Position the light
scene.add(directionalLight);

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

// Instantiate the loader
const loader = new THREE.OBJLoader();

// Call the loader's load method
loader.load(
    'https://raw.githubusercontent.com/RSOS-ops/webainimtest1/e87d0d7c12595c87ac178d5b2617d515725f95a8/Shadowed_Gaze.obj',
    function (object) {
        // This function is called when the load is complete
        loadedObject = object; // Store the loaded object
        const box = new THREE.Box3().setFromObject(loadedObject);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        console.log('Applying debug material...');
        loadedObject.traverse(function (child) {
            if (child.isMesh) {
                child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            }
        });

        // Auto-center and normalize scale
        // const box = new THREE.Box3().setFromObject(loadedObject); // Already calculated above
        // const size = new THREE.Vector3(); // Already calculated above
        // box.getSize(size); // Already calculated above
        // const center = new THREE.Vector3(); // Already calculated above
        // box.getCenter(center); // Already calculated above

        // 1. Center the object
        loadedObject.position.sub(center); // Move object by -center to bring its bbox center to origin

        // 2. Normalize scale
        const maxDim = Math.max(size.x, size.y, size.z);
        const desiredSize = 5.0;
        const scale = desiredSize / maxDim;
        loadedObject.scale.set(scale, scale, scale);

        console.log('Object auto-centered and scaled. New scale:', scale);

        // loadedObject.position.set(0, 0, 0); // Replaced by auto-centering
        // loadedObject.scale.set(1, 1, 1); // Replaced by auto-scaling
        scene.add(loadedObject);
        console.log('Object loaded successfully and added to scene');
    },
    function (xhr) {
        // This function is called during loading (progress)
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        // This function is called if an error occurs
        console.error('An error happened during loading:', error);
    }
);

// Create a basic animation loop
function animate() {
    requestAnimationFrame(animate);
    particleSystem.rotation.y += 0.001;
    if (loadedObject) { // Check if the object has been loaded
        loadedObject.rotation.y += 0.0002; // Rotate slowly
    }
    renderer.render(scene, camera);
}
animate();
