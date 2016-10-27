precision highp float;

#define NUM_STEPS 64
//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform float uFOV;

/*
uniform vec2 uMouse;

uniform vec2 uAngles;
uniform float uRadius;
*/


void main(void) {
	vec4 color = vec4(uv, 0.0, 1.0);
	gl_FragColor = color;
}