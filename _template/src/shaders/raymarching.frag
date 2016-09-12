precision highp float;

//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;


//	DISTANCE FIELD FUNCTIONS
float plane(vec3 pos) {
	return pos.y;
}

float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}


//	MAPPING FUNCTION
float map(vec3 pos) {
	float dPlane = plane(pos);
	float dSphere = sphere(pos, 2.0);
	return min(dPlane, dSphere);
}

//	COLORING FUNCTION

void main(void) {
	vec2 uv = uv;

	vec3 pos = vec3(sin(uGlobalTime) * 2.0, 5.0, -10.0);
	vec3 dir = normalize(vec3(uv, uFOV));

	vec3 color = vec3(0.0);
	bool hit = false;

	for( int i = 0; i < 100; i++) {
		float d = map(pos);

		if(d < 0.01) {
			hit = true;
			break;
		}

		pos += d * dir;
	}

	if(hit) {
		color = fract(pos * 0.2);
	}

    gl_FragColor = vec4(color, 1.0);
}