precision highp float;

#define NUM_STEPS 64

//	VARYING
varying vec2 uv;

/*
//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;
*/

void main(void) {
	vec4 color = vec4(0.0);

	color.rgb = vec3(uv, 0.0);


	gl_FragColor = color;
}