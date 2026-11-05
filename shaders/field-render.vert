precision mediump float;


uniform vec2 uScale;

varying vec2 f_Position;
varying vec2 scale;

// Vertex position in World Coordinates
attribute vec2 vPosition;

void main() 
{
    gl_Position = vec4(vPosition, 0.0, 1.0);
    f_Position = vPosition * uScale;
    scale = uScale;
}