// Attributes received from buffer data
attribute vec2 a_particlePosition; // The initial normalized position of the particle (pixel)
attribute vec2 a_textureCoord;   // Texture coordinate for this particle

// Uniforms (values that are the same for all vertices in a draw call)
uniform float u_pointSize;       // Desired point size
uniform vec2 u_resolution;       // Canvas resolution for aspect ratio correction or scaling

// Varying to pass data to the fragment shader
varying vec2 v_textureCoord;

void main() {
    // For now, a_particlePosition can be directly used as clip space position
    // if positions are already in -1 to 1 range.
    // If they are 0 to 1, they need to be scaled: (a_particlePosition * 2.0 - 1.0)
    // Let's assume they will be in clip space coordinates (-1 to 1) for now.
    gl_Position = vec4(a_particlePosition, 0.0, 1.0);

    // Pass the texture coordinate to the fragment shader
    v_textureCoord = a_textureCoord;

    // Set the size of the point
    gl_PointSize = u_pointSize;
}
