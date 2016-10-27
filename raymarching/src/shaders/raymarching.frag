precision highp float;

#define NUM_STEPS 64
//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;

/*
uniform vec2 uMouse;
uniform float uFOV;
uniform vec2 uAngles;
uniform float uRadius;
*/

void main(void) {
	vec4 color = vec4(0.0);

	vec3 dir = vec3(uv, 0.0);

	color.rgb = dir;

	gl_FragColor = color;
}