precision highp float;

#define NUM_STEPS 64
#define PRECISION 0.01

//  VARYING
varying vec2 uv;

/*
//  UNIFORMS

uniform vec2 uMouse;
*/
uniform float uGlobalTime;
uniform float uFOV;
uniform float uRadius;
uniform vec2 uAngles;

const float PI = 3.141592657;


//  tool functions
vec2 rotate(vec2 v, float a) {
	float c = cos(a);
	float s = sin(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}

vec3 repeat(vec3 v, float gap) {
	return mod(v + gap/2.0, gap) - gap/2.0;
}

float repeat(float v, float gap) {
	return mod(v + gap/2.0, gap) - gap/2.0;
}


float smin( float a, float b, float k ) {
	float res = exp( -k*a ) + exp( -k*b );
	return -log( res )/k;
}

float smin( float a, float b ) {
	return smin(a, b, 7.0);
}


float combineChamfer(float d1, float d2, float r) {
	float m = min(d1, d2);

	if (d1 < r && d2 < r) {
		return min(m, d1 + d2 - r);
	} else {
		return m;
	}
}

float combineChamfer(float d1, float d2) {
	return combineChamfer(d1, d2, 0.1);
}


vec2 repAng(vec2 p, float n) {
	float ang = 2.0*PI/n;
	float sector = floor(atan(p.x, p.y)/ang + 0.5);
	p = rotate(p, sector*ang);
	return p;
}

//  distance field functions
float plane(vec3 pos) {
	return pos.y;
}

float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}

float box(vec3 pos, vec3 size) {
	return length(max(abs(pos) - size, 0.0));
}

float box(vec3 pos, float size) {
	return box(pos, vec3(size));
}

float roundedBox(vec3 pos, vec3 size, float radius) {
	return length(max(abs(pos) - size, 0.0)) - radius;  
}

float cylinder( vec3 p, vec2 h ) {
	vec2 d = abs(vec2(length(p.xz),p.y)) - h;
	return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

const float diskHeight = 0.01;
const float diskSize = 3.0;
const float diskSizeHalf = diskSize * 0.5;
const float diskSizeQuater = diskSize * 0.25;



float disk(vec3 pos) {
	pos.xz = rotate(pos.xz, uGlobalTime * 2.0);
	float d = 0.0;
	float disk = cylinder(pos, vec2(diskSize, diskHeight));
	float dBox = box(pos-vec3(diskSize, 0.0, 0.0), 3.0);
	d = max(disk, dBox);

	float disk2 = cylinder(pos+vec3(0.0, 0.0, -diskSizeHalf ), vec2(diskSizeHalf, diskHeight));
	d = min(d, disk2);

	float disk3 = cylinder(pos+vec3(0.0, 0.0, diskSizeHalf ), vec2(diskSizeHalf, 5.0));
	d = max(d, -disk3);

	float disk4 = cylinder(pos+vec3(0.0, 0.0, -diskSizeHalf ), vec2(diskSizeQuater, 5.0));
	d = max(d, -disk4);

	float sphere = sphere(pos+vec3(0.0, 0.0, diskSizeHalf ), diskSizeQuater * 0.75);
	d = min(d, sphere);

	return d;
}


vec2 yingyang(vec3 pos) {
	float colorIndex = 1.0;
	float dWhite = disk(pos);
	vec3 posBlack = pos.yxz;
	posBlack.xz = rotate(posBlack.xz, PI);
	float dBlack = disk(posBlack);

	float d = min(dWhite, dBlack);
	colorIndex = dWhite < dBlack ? 1.0 : 0.0;

	return vec2(d, colorIndex);
}


const float gearSize = 2.0;
const float ringSize = 0.2;
const float numTeeth = 12.0;


float gear0(vec3 pos) {
	float d = 0.0;
	pos.xy = repAng(pos.xy, 4.0);
	pos.y -= 5.2;

	pos.xz = rotate(pos.xz, uGlobalTime);

	float c = cylinder(pos, vec2(gearSize, ringSize));
	float cInner = cylinder(pos, vec2(gearSize-ringSize*2.0, 5.0));
	d = max(c, -cInner);

	pos.xz = repAng(pos.xz, numTeeth);
	float dBox = box(pos-vec3(0.0, 0.0, gearSize+ringSize), ringSize*.85);
	d = combineChamfer(d, dBox, 0.05);

	return d;
}


float gear1(vec3 pos) {
	float d = 0.0;
	pos.xy = repAng(pos.xy, 4.0);
	pos.y -= 5.2;

	pos.xz = rotate(pos.xz, -uGlobalTime);

	float c = cylinder(pos, vec2(gearSize, ringSize));
	float cInner = cylinder(pos, vec2(gearSize-ringSize*2.0, 5.0));
	d = max(c, -cInner);

	pos.xz = rotate(pos.xz, PI/numTeeth);
	pos.xz = repAng(pos.xz, numTeeth);
	float dBox = box(pos-vec3(0.0, 0.0, gearSize+ringSize), ringSize*.85);
	d = combineChamfer(d, dBox, 0.05);

	return d;
}

//  mapping function
vec2 map(vec3 pos) {
	float colorIndex = 1.0;
	float d = 0.0;


	float g0 = gear0(pos);
	vec3 p1 = pos;
	p1.xy = rotate(p1.xy, PI / 4.0);
	
	float g1 = gear1(p1);
	d = min(g0, g1);

	colorIndex = g0 < g1 ? 1.0 : 0.0;
	

	return vec2(d, colorIndex);
	// return yingyang(pos);
}

//  color functions

vec3 getNormal(vec3 pos) {
	vec2 eps = vec2(0.01, 0.0);
	return normalize(vec3(
			map(pos + eps.xyy).x - map(pos - eps.xyy).x,
			map(pos + eps.yxy).x - map(pos - eps.yxy).x,
			map(pos + eps.yyx).x - map(pos - eps.yyx).x
		));
}


float gaussianSpecular(vec3 lightDirection, vec3 viewDirection, vec3 surfaceNormal, float shininess) {
	vec3 H = normalize(lightDirection + viewDirection);
	float theta = acos(dot(H, surfaceNormal));
	float w = theta / shininess;
	return exp(-w*w);
}

float orenNayarDiffuse(vec3 lightDirection, vec3 viewDirection, vec3 surfaceNormal, float roughness, float albedo) {
	float LdotV = dot(lightDirection, viewDirection);
	float NdotL = dot(lightDirection, surfaceNormal);
	float NdotV = dot(surfaceNormal, viewDirection);

	float s = LdotV - NdotL * NdotV;
	float t = mix(1.0, max(NdotL, NdotV), step(0.0, s));

	float sigma2 = roughness * roughness;
	float A = 1.0 + sigma2 * (albedo / (sigma2 + 0.13) + 0.5 / (sigma2 + 0.33));
	float B = 0.45 * sigma2 / (sigma2 + 0.09);

	return albedo * max(0.0, NdotL) * (A + B * s / t) / 3.14159265;
}

float ao( in vec3 pos, in vec3 nor ){
	float occ = 0.0;
	float sca = 1.0;
	for( int i=0; i<5; i++ )
	{
		float hr = 0.01 + 0.12*float(i)/4.0;
		vec3 aopos =  nor * hr + pos;
		float dd = map( aopos ).x;
		occ += -(dd-hr)*sca;
		sca *= 0.95;
	}
	return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    
}


const vec2 LIGHT = vec2(1.0, .96);
const vec3 LIGHT_DIR0 = vec3(1.0, 1.0, -1.0);
const vec3 LIGHT_DIR1 = vec3(-1.0, 0.25, 0.0);

vec3 getColor(vec3 pos, vec3 dir, float colorIndex) {
	vec3 n = getNormal(pos);

	float ambient = .25;
	vec3 light0 = orenNayarDiffuse(LIGHT_DIR0, -dir, n, 1.0, .7) * LIGHT.rrg;
	vec3 light1 = orenNayarDiffuse(LIGHT_DIR1, -dir, n, 1.0, .4) * LIGHT.ggr;
	float specular0 = gaussianSpecular(LIGHT_DIR0, -dir, n, 0.2);
	float specular1 = gaussianSpecular(LIGHT_DIR1, -dir, n, 0.1);

	float baseColor = mix(colorIndex, 1.0, .3);

	vec3 color = light0 + light1 + specular0 + specular1 + ambient;
	float _ao = ao(pos, n);
	color *= _ao * baseColor;

	return color;
}




//  CAMERA CONTROL
mat3 setCamera( in vec3 ro, in vec3 ta, float cr ) {
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = normalize( cross(cu,cw) );
	return mat3( cu, cv, cw );
}

void main(void) {
	float r = uRadius;
	float tr = cos(uAngles.x) * r;
	vec3 pos = vec3(cos(uAngles.y) * tr, sin(uAngles.x) * r, sin(uAngles.y) * tr);
	vec3 ta  = vec3( 0.0, 0.0, 0.0 );
	mat3 ca  = setCamera( pos, ta, 0.0 );
	vec3 dir = ca * normalize( vec3(uv, uFOV) );

	float d;

	vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

	for( int i=0; i<NUM_STEPS; i++) {
		vec2 result = map(pos);
		d = result.x;

		if(d < PRECISION) {
			//  hit 
			color.rgb = getColor(pos, dir, result.y);
			break;
		}

		pos += dir * d;
	}


	gl_FragColor = color;
}