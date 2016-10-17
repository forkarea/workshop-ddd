precision highp float;

#define NUM_STEPS 64

//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;


//	DISTANCE FIELD FUNCTIONS

float box(vec3 pos, vec3 size) {	return length(max(abs(pos) - size, 0.0)); }

float plane(vec3 pos) {
	return pos.y;
}

float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}

//	MAPPING FUNCTION
float map(vec3 pos) {
	float dBox = box(pos, vec3(1.0));
	float dSphere = sphere(pos-vec3(1.0, sin(uGlobalTime)*.5,-1.0), 1.0);
	return min(dBox, dSphere);
}


void main(void) {
	vec2 uv = uv;

	vec3 pos = vec3(sin(uGlobalTime) * 3.0, cos(uGlobalTime) * 3.0, -10.0);
	vec3 dir = normalize(vec3(uv, uFOV));

	vec3 color = vec3(0.0);
	bool hit = false;

	for( int i = 0; i < NUM_STEPS; i++) {
		float d = map(pos);

		if(d > 30.0) {
			break;
		}

		if(d < 0.01) {
			hit = true;
			break;
		}

		pos += d * dir;
	}

	if(hit) {
		color = fract(pos );
	}

	gl_FragColor = vec4(color, 1.0);
}