#extension GL_EXT_shader_texture_lod : enable

precision highp float;

#define NUM_STEPS 128

//	VARYING
varying vec2 uv;

//	UNIFORMS
uniform float uGlobalTime;
uniform vec2 uMouse;
uniform float uFOV;

uniform samplerCube uRadianceMap;
uniform samplerCube uIrradianceMap;

uniform vec3		uBaseColor;
uniform float		uRoughness;
uniform float		uMetallic;
uniform float		uSpecular;

uniform float		uExposure;
uniform float		uGamma;


//	DISTANCE FIELD FUNCTIONS
float plane(vec3 pos) {
	return pos.y;
}

float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}


//	MAPPING FUNCTION
float map(vec3 pos) {
	// float dPlane = plane(pos);
	float dSphere = sphere(pos, 4.0);
	// return min(dPlane, dSphere);

	return dSphere;
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


#define saturate(x) clamp(x, 0.0, 1.0)
#define PI 3.1415926535897932384626433832795


// Filmic tonemapping from
// http://filmicgames.com/archives/75

const float A = 0.15;
const float B = 0.50;
const float C = 0.10;
const float D = 0.20;
const float E = 0.02;
const float F = 0.30;

vec3 Uncharted2Tonemap( vec3 x )
{
	return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

// https://www.unrealengine.com/blog/physically-based-shading-on-mobile
vec3 EnvBRDFApprox( vec3 SpecularColor, float Roughness, float NoV )
{
	const vec4 c0 = vec4( -1, -0.0275, -0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, -0.04 );
	vec4 r = Roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( -9.28 * NoV ) ) * r.x + r.y;
	vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
	return SpecularColor * AB.x + AB.y;
}


// http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
vec3 fix_cube_lookup( vec3 v, float cube_size, float lod ) {
	float M = max(max(abs(v.x), abs(v.y)), abs(v.z));
	float scale = 1.0 - exp2(lod) / cube_size;
	if (abs(v.x) != M) v.x *= scale;
	if (abs(v.y) != M) v.y *= scale;
	if (abs(v.z) != M) v.z *= scale;
	return v;
}

vec3 correctGamma(vec3 color, float g) {
	return pow(color, vec3(1.0/g));
}

vec3 getPbr(vec3 N, vec3 V, vec3 baseColor, float roughness, float metallic, float specular) {
	vec3 diffuseColor	= baseColor - baseColor * metallic;
	vec3 specularColor	= mix( vec3( 0.08 * specular ), baseColor, specular );	

	vec3 color;
	float roughness4 = pow(roughness, 4.0);
	
	// sample the pre-filtered cubemap at the corresponding mipmap level
	float numMips		= 6.0;
	float mip			= numMips - 1.0 + log2(roughness);
	vec3 lookup			= -reflect( V, N );
	lookup				= fix_cube_lookup( lookup, 512.0, mip );
	vec3 radiance		= pow( textureCubeLodEXT( uRadianceMap, lookup, mip ).rgb, vec3( 2.2 ) );
	vec3 irradiance		= pow( textureCube( uIrradianceMap, N ).rgb, vec3( 1 ) );
	
	// get the approximate reflectance
	float NoV			= saturate( dot( N, V ) );
	vec3 reflectance	= EnvBRDFApprox( specularColor, roughness4, NoV );
	
	// combine the specular IBL and the BRDF
    vec3 diffuse  		= diffuseColor * irradiance;
    vec3 _specular 		= radiance * reflectance;
	color				= diffuse + _specular;

	return color;
}

//	COLORING FUNCTION

void main(void) {
	vec2 uv = uv;

	vec3 pos = vec3(sin(uGlobalTime) * 2.0, cos(uGlobalTime) * 2.0, -20.0);
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
		vec3 N = computeNormal(pos);
		vec3 L = normalize(vec3(1.0, 1.0, -1.0));
		float shadow = softshadow(pos, L, 0.02, 2.5);
		float _ao = ao(pos, N);
		// color = diffuse(N, L, vec3(1.0)) * shadow * _ao;
		color = getPbr(N, -dir, uBaseColor, uRoughness, uMetallic, uSpecular) * shadow * _ao;

		// apply the tone-mapping
		color				= Uncharted2Tonemap( color * uExposure );
		// white balance
		color				= color * ( 1.0 / Uncharted2Tonemap( vec3( 20.0 ) ) );
		
		// gamma correction
		color				= pow( color, vec3( 1.0 / uGamma ) );
	}

	gl_FragColor = vec4(color, 1.0);
	// gl_FragColor = vec4(vec3(uSpecular), 1.0);
}