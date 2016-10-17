precision highp float;

#define NUM_STEPS 128

//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;


//	OP
float smin( float a, float b, float k ) {
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}

float smin( float a, float b ) {
    return smin(a, b, 7.0);
}


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
	// float dSphere = sphere(pos, 4.0);
	// return min(dPlane, dSphere);

	return dPlane;
}

//	CALCULATE NORMAL
vec3 computeNormal(vec3 pos) {
	vec2 eps = vec2(0.01, 0.0);

	vec3 normal = vec3(
		map(pos + eps.xyy) - map(pos - eps.xyy),
		map(pos + eps.yxy) - map(pos - eps.yxy),
		map(pos + eps.yyx) - map(pos - eps.yyx)
	);
	return normalize(normal);
}

//	DIFFUSE LIGHTING
float diffuse(vec3 N, vec3 L) {
	return max(dot(N, normalize(L)), 0.0);
}


vec3 diffuse(vec3 N, vec3 L, vec3 C) {
	return diffuse(N, L) * C;
}

//	SHADOW
float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax ) {
	float res = 1.0;
	float t = mint;
	for( int i=0; i<16; i++ ) {
		float h = map( ro + rd*t );
		res = min( res, 8.0*h/t );
		t += clamp( h, 0.02, 0.10 );
		if( h<0.001 || t>tmax ) break;
	}
	return clamp( res, 0.0, 1.0 );
}

//	AMBIENT OCCULUSION
float ao( in vec3 pos, in vec3 nor ){
	float occ = 0.0;
	float sca = 1.0;
	for( int i=0; i<5; i++ )
	{
		float hr = 0.01 + 0.12*float(i)/4.0;
		vec3 aopos =  nor * hr + pos;
		float dd = map( aopos );
		occ += -(dd-hr)*sca;
		sca *= 0.95;
	}
	return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    
}

//	COLORING FUNCTION

void main(void) {
	vec2 uv = uv;

	vec3 pos = vec3(sin(uGlobalTime) * 2.0, 10.0 + cos(uGlobalTime) * 2.0, -20.0);
	vec3 dir = normalize(vec3(uv, uFOV));

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
		color = fract(pos * 0.2);
		// vec3 N = computeNormal(pos);
		// vec3 L = normalize(vec3(1.0, 1.0, -1.0));
		// float shadow = softshadow(pos, L, 0.02, 2.5);
		// float _ao = ao(pos, N);
		// color = diffuse(N, L, vec3(1.0)) * shadow * _ao;
	}

	gl_FragColor = vec4(color, 1.0);
}