precision mediump float;
varying vec2 v_textureCoord; // Keep it, even if not used, to match vertex shader
uniform sampler2D u_imageTexture; // Keep it, even if not used
void main() {
    // Output a constant bright green color for debugging
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Bright Green
}
