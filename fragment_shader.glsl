precision mediump float; // Necessary for fragment shaders

// Varying received from the vertex shader
varying vec2 v_textureCoord;

// Uniform for the image texture
uniform sampler2D u_imageTexture;

void main() {
    // Sample the texture at the given texture coordinate
    vec4 textureColor = texture2D(u_imageTexture, v_textureCoord);

    // Output the color
    gl_FragColor = textureColor;
    // For testing without a texture yet, you can output a fixed color:
    // gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Green
}
