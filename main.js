// Import necessary Three.js components
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, object;
let lastFrameTime = 0;
const rotationSpeed = (2 * Math.PI) / 30; // Radians per second

function init() {
    // Initialize Scene, Camera, and Renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee); // Light gray background

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Add Lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Increased intensity slightly
    directionalLight.position.set(1, 1, 1); // Adjusted position
    scene.add(directionalLight);

    // OrbitControls for easier navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    // controls.maxPolarAngle = Math.PI / 2; // Prevent looking from below the ground

    // Load the .obj Model
    const loader = new OBJLoader();
    loader.load(
        'Shadowed_Gaze.obj',
        function (loadedObject) {
            object = loadedObject; // Store the loaded object

            // Apply MeshStandardMaterial to children
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x808080,
                        metalness: 0.5,
                        roughness: 0.5,
                        // wireframe: true // Useful for debugging model structure
                    });
                }
            });

            // Calculate bounding box and center the object
            const boundingBox = new THREE.Box3().setFromObject(object);
            const center = boundingBox.getCenter(new THREE.Vector3());
            object.position.sub(center);

            // Optionally, scale the object if it's too big or too small
            const size = boundingBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim; // Adjust '3' to desired display size
            object.scale.set(scale, scale, scale);
            
            scene.add(object);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened during loading:', error);
        }
    );

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Start the animation loop
    lastFrameTime = performance.now();
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    const deltaTime = (currentTime - lastFrameTime) / 1000; // Time in seconds
    lastFrameTime = currentTime;

    if (object) {
        // Rotate the loaded object on its X-axis
        object.rotation.x += rotationSpeed * deltaTime;
    }
    
    // Required if controls.enableDamping or controls.autoRotate are set to true
    // controls.update(); 

    renderer.render(scene, camera);
}

// Initialize everything
init();
