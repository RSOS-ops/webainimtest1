// Globally accessible variables
let canvas;
let gl;
let vertexShader;
let fragmentShader;
let shaderProgram;
let positionBuffer;
let textureCoordBuffer;
let imageTexture = null; // For the loaded image
let numPoints = 0; // Global to store the number of points to draw
let loadedImageData = null; // Global to store image data after loading

// Shader sources will be loaded from files

// Function to create and compile a shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    } else {
        console.error(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
}

// Function to create and link a shader program
function createProgram(gl, vertexShader, fragmentShader) {
    if (!vertexShader || !fragmentShader) {
        console.error("Cannot create program without valid shaders.");
        return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return program;
    } else {
        console.error("Error linking shader program:");
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
}

async function initWebGL() { // Made async
    canvas = document.getElementById('glCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return false;
    }

    // Try to get WebGL2 context
    gl = canvas.getContext('webgl2');
    if (gl) {
        console.log('WebGL2 context obtained.');
    } else {
        console.log('WebGL2 not available, trying WebGL1.');
        // Fallback to WebGL1
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            console.log('WebGL1 context obtained.');
        } else {
            console.error('WebGL is not supported in this browser.');
            alert('Unable to initialize WebGL. Your browser may not support it.');
            return false;
        }
    }

    if (!gl) {
        // This case should ideally be caught by the alert above,
        // but as a safeguard:
        console.error("Failed to get WebGL context.");
        return false;
    }
    
    // Set initial viewport
    setupViewport();

    // Add resize listener
    window.addEventListener('resize', setupViewport);

    // Fetch and compile vertex shader
    let vertexShaderSource;
    try {
        const response = await fetch('vertex_shader.glsl');
        if (!response.ok) {
            throw new Error(`Failed to fetch vertex_shader.glsl: ${response.statusText}`);
        }
        vertexShaderSource = await response.text();
        console.log("Vertex shader source loaded successfully.");
    } catch (error) {
        console.error("Error loading vertex shader:", error);
        return false;
    }

    vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) {
        console.error("Vertex shader compilation failed. Cannot proceed.");
        return false;
    }
    
    // Fetch and compile fragment shader
    let fragmentShaderSource;
    try {
        const response = await fetch('fragment_shader.glsl');
        if (!response.ok) {
            throw new Error(`Failed to fetch fragment_shader.glsl: ${response.statusText}`);
        }
        fragmentShaderSource = await response.text();
        console.log("Fragment shader source loaded successfully.");
    } catch (error) {
        console.error("Error loading fragment shader:", error);
        return false;
    }

    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
        console.error("Fragment shader compilation failed. Cannot proceed.");
        return false;
    }

    // Link program
    shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    if (!shaderProgram) {
        console.error("Shader program linking failed. Cannot proceed.");
        return false;
    }

    console.log("Shaders compiled and program linked successfully.");
    // Note: initBuffers() is now called after image loading and texture setup.
    return true;
}

function initBuffers() {
    if (!gl || !shaderProgram) {
        console.error("GL context or shader program not available for buffer initialization.");
        return false;
    }
    if (!loadedImageData) {
        console.error("Image data not available for buffer initialization.");
        return false;
    }

    const positions = [];
    const texCoords = [];
    numPoints = 0; // Reset numPoints

    const { width, height, pixels } = loadedImageData;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const alpha = pixels[pixelIndex + 3];

            if (alpha > 128) { // Alpha threshold
                // Normalized Device Coordinates (NDC) for a_particlePosition
                const ndcX = (x / width) * 2.0 - 1.0;
                const ndcY = (y / height) * -2.0 + 1.0; // Y inverted
                positions.push(ndcX, ndcY);

                // Normalized Texture Coordinates for a_textureCoord
                const texU = x / width;
                const texV = y / height;
                texCoords.push(texU, texV);

                numPoints++;
            }
        }
    }
    
    console.log(`Processed image: ${width}x${height}. Generated ${numPoints} particles.`);

    // Position Buffer
    if (!positionBuffer) positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
        console.error("Failed to create the position buffer.");
        return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Texture Coordinate Buffer
    if (!textureCoordBuffer) textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
        console.error("Failed to create the texture coordinate buffer.");
        return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind buffer
    console.log("Particle buffers created and data loaded.");
    return true;
}

function drawScene() {
    if (!gl || !shaderProgram || !positionBuffer || !textureCoordBuffer || numPoints === 0) {
        // console.warn("GL context, shader program, buffers not available, or no points to draw.");
        // Allow it to proceed to clear the screen even if there's nothing to draw yet.
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black, fully opaque
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
    }

    // Clear Canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black, fully opaque
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL to use our program
    gl.useProgram(shaderProgram);

    // Set up Position Attribute
    const particlePositionAttribLocation = gl.getAttribLocation(shaderProgram, 'a_particlePosition');
    if (particlePositionAttribLocation === -1) {
        console.error("Attribute 'a_particlePosition' not found in shader program.");
        return;
    }
    gl.enableVertexAttribArray(particlePositionAttribLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(particlePositionAttribLocation, 2, gl.FLOAT, false, 0, 0); // 2 components per iteration (x, y)

    // Set up Texture Coordinate Attribute
    const texCoordAttribLocation = gl.getAttribLocation(shaderProgram, 'a_textureCoord');
    if (texCoordAttribLocation !== -1) { // Check if the attribute exists
        gl.enableVertexAttribArray(texCoordAttribLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 0, 0); // 2 components per iteration (s, t)
    } else {
        // This might be an error if the shader is expected to use it, or expected if it's optional
        // console.warn("Attribute 'a_textureCoord' not found in shader program.");
    }

    // Set Uniforms
    const pointSizeUniformLocation = gl.getUniformLocation(shaderProgram, "u_pointSize");
    if (pointSizeUniformLocation) {
        gl.uniform1f(pointSizeUniformLocation, 1.0); // Set point size to 1.0
    }
    
    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
    if (resolutionUniformLocation) {
        gl.uniform2f(resolutionUniformLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    // Setup image texture uniform
    const textureLocation = gl.getUniformLocation(shaderProgram, 'u_imageTexture');
    if (textureLocation && imageTexture) {
        gl.activeTexture(gl.TEXTURE0); // Activate texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, imageTexture); // Bind the texture
        gl.uniform1i(textureLocation, 0); // Tell the shader to use texture unit 0
    } else {
        if (!imageTexture) console.warn("imageTexture not yet available for drawing.");
        if (!textureLocation) console.warn("Uniform 'u_imageTexture' not found in shader program.");
    }

    // Draw
    gl.drawArrays(gl.POINTS, 0, numPoints); // Draw all generated points

    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind buffer
    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
}

function renderLoop() {
    drawScene();
    requestAnimationFrame(renderLoop);
}

function setupViewport() {
    if (!canvas || !gl) return;

    // Make the canvas responsive
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    console.log(`Viewport set to: ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`);
}

// Image loading function
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Handle potential CORS issues if image is from another domain
        image.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
                reject(new Error('Failed to create 2D context for image processing.'));
                return;
            }

            tempCanvas.width = image.width;
            tempCanvas.height = image.height;
            tempCtx.drawImage(image, 0, 0);

            try {
                const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
                const pixels = new Uint8Array(imageData.data.buffer);
                resolve({
                    image: image,
                    width: image.width,
                    height: image.height,
                    pixels: pixels
                });
            } catch (error) {
                // Catch potential security errors from getImageData (e.g., tainted canvas)
                console.error("Error getting image data:", error);
                reject(new Error(`Failed to get pixel data for ${url}: ${error.message}`));
            }
        };
        image.onerror = (error) => {
            console.error(`Error loading image: ${url}`, error);
            reject(new Error(`Failed to load image: ${url}`));
        };
        image.src = url;
    });
}

function setupImageTexture(imageData) {
    if (!gl) {
        console.error("WebGL context not available for texture setup.");
        return false;
    }
    if (!imageData || !imageData.pixels || !imageData.width || !imageData.height) {
        console.error("Invalid imageData for texture setup.");
        return false;
    }

    imageTexture = gl.createTexture();
    if (!imageTexture) {
        console.error("Failed to create texture object.");
        return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.pixels);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind
    console.log("Image texture setup successfully.");
    return true;
}

// Initialize WebGL, load image, setup texture, then init buffers and start render loop
document.addEventListener('DOMContentLoaded', async () => {
    const webGLInitialized = await initWebGL();
    if (webGLInitialized) {
        console.log("WebGL core initialized. Loading image...");
        try {
            // Assign to global loadedImageData
            loadedImageData = await loadImage('CoryPill_BlkBG.png'); 
            console.log('Image loaded successfully:', loadedImageData.width, 'x', loadedImageData.height);

            if (!setupImageTexture(loadedImageData)) { // Use global loadedImageData
                console.error("Failed to setup image texture. Cannot proceed.");
                return;
            }

            if (!initBuffers()) { // initBuffers now uses global loadedImageData
                console.error("Buffer initialization failed. Cannot proceed.");
                return;
            }
            console.log("Buffers initialized successfully.");

            renderLoop(); // Start the render loop
            console.log("Render loop started.");

        } catch (error) {
            console.error('Failed to load image or setup resources:', error);
            // Display a user-friendly message on the canvas or page if possible
            if(canvas) {
                const ctx = canvas.getContext('2d'); // Fallback to 2D for error message if canvas is already grabbed by WebGL
                if (ctx) { // This might not work if WebGL context is active
                    ctx.font = "16px Arial";
                    ctx.fillStyle = "red";
                    ctx.fillText("Error loading image or setting up WebGL. Check console.", 10, 50);
                } else { // If canvas is already WebGL, use an alert or a dedicated HTML element
                    alert("Error loading image or setting up WebGL. Check console.");
                }
            } else {
                alert("Critical error: Canvas not found and image loading failed. Check console.");
            }
        }
    } else {
        console.error("WebGL Initialization failed. Full application startup aborted.");
        alert("WebGL initialization failed. Your browser might not support WebGL or an error occurred. Check console.");
    }
});

// Export for potential use in other modules
export { gl, canvas, loadImage, shaderProgram, positionBuffer, textureCoordBuffer, imageTexture, numPoints, loadedImageData };
