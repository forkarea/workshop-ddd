precision highp float;

#define NUM_STEPS 128

//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;
uniform vec2 uAngles;
uniform float uRadius;


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

//	CAMERA CONTROL
mat3 setCamera( in vec3 ro, in vec3 ta, float cr ) {
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = normalize( cross(cu,cw) );
    return mat3( cu, cv, cw );
}

//	COLORING FUNCTION

void main(void) {
	float r  = uRadius;
	float tr = cos(uAngles.x) * r;
	vec3 pos = vec3(cos(uAngles.y) * tr, sin(uAngles.x) * r, sin(uAngles.y) * tr);
	vec3 ta  = vec3( 0.0, 0.0, 0.0 );
	mat3 ca  = setCamera( pos, ta, 0.0 );
	vec3 dir = ca * normalize( vec3(uv, uFOV) );

	vec3 color = vec3(0.0);
	bool hit = false;

	for( int i = 0; i < NUM_STEPS; i++) {
		float d = map(pos);

		if(d > 20.0) {
			break;
		}

		if(d < 0.01) {
			hit = true;
			break;
		}

		pos += d * dir;
	}

	if(hit) {
		color = fract(pos);
	}

	gl_FragColor = vec4(color, 1.0);
}