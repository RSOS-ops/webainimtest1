precision mediump float;

varying vec2 v_textureCoord;
uniform sampler2D u_imageTexture;

void main() {
    // Sample the texture at the given texture coordinate
    vec4 textureColor = texture2D(u_imageTexture, v_textureCoord);
    gl_FragColor = textureColor;
}
