import '../scss/global.scss';
import alfrid, { GL } from 'alfrid';
import AssetsLoader from 'assets-loader';
import dat from 'dat-gui';
import Stats from 'stats.js';

import vs from '../shaders/raymarching.vert';
import fs from '../shaders/raymarching.frag';

const getAsset = function(id) {	
	return window.assets.find( (a) => a.id === id).file;	
}

window.params = {
	roughness:1,
	specular:1,
	metallic:0,
	gamma:2.2,
	exposure:5,
	fov:1
};

const assets = [
	{ id:'radiance', url:'assets/img/studio_radiance.dds', type: 'binary' },
	{ id:'irr_posx', url:'assets/img/irr_posx.hdr', type:'binary' },
	{ id:'irr_posx', url:'assets/img/irr_posx.hdr', type:'binary' },
	{ id:'irr_posy', url:'assets/img/irr_posy.hdr', type:'binary' },
	{ id:'irr_posz', url:'assets/img/irr_posz.hdr', type:'binary' },
	{ id:'irr_negx', url:'assets/img/irr_negx.hdr', type:'binary' },
	{ id:'irr_negy', url:'assets/img/irr_negy.hdr', type:'binary' },
	{ id:'irr_negz', url:'assets/img/irr_negz.hdr', type:'binary' },
];

let shader, mesh, globalTime = Math.random() * 10000, stats;
let textureIrr, textureRad;
let mouseX = 0;
let mouseY = 0;

window.addEventListener('DOMContentLoaded', _init);


function _init() {

	//	LOADING ASSETS
	if(assets.length > 0) {
		document.body.classList.add('isLoading');

		const loader = new AssetsLoader({assets:assets})
		.on('error', (error)=>{console.log('Error :', error);})
		.on('progress', (p) => {document.body.querySelector('.Loading-Bar').style.width = `${(p * 100)}%`;})
		.on('complete', _onImageLoaded)
		.start();

	} else {
		_init3D();
	}

	window.addEventListener('mousemove', (e) => {
		mouseX = (e.clientX/window.innerWidth - 0.5) * 2.0;
		mouseY = (e.clientY/window.innerHeight - 0.5) * 2.0;
	});
	window.addEventListener('resize', resize);
}


function _onImageLoaded(o) {
	//	ASSETS
	console.log('Image Loaded : ', o);
	window.assets = o;
	const loader = document.body.querySelector('.Loading-Bar');
	loader.style.width = '100%';

	_init3D();

	setTimeout(()=> {
		document.body.classList.remove('isLoading');
	}, 250);
}


function _init3D() {
	//	CREATE CANVAS
	const canvas = document.createElement('canvas');
	canvas.className = 'Main-Canvas';
	document.body.appendChild(canvas);

	//	INIT 3D TOOL
	GL.init(canvas);

	//	INIT DAT-GUI
	window.gui = new dat.GUI({ width:300 });
	gui.add(params, 'fov', 0.01, 2.0);

	gui.add(params, 'roughness', 0, 1);
	gui.add(params, 'specular', 0, 1);
	gui.add(params, 'metallic', 0, 1);


	//	INIT TEXTURES
	let irr_posx = alfrid.HDRLoader.parse(getAsset('irr_posx'));
	let irr_negx = alfrid.HDRLoader.parse(getAsset('irr_negx'));
	let irr_posy = alfrid.HDRLoader.parse(getAsset('irr_posy'));
	let irr_negy = alfrid.HDRLoader.parse(getAsset('irr_negy'));
	let irr_posz = alfrid.HDRLoader.parse(getAsset('irr_posz'));
	let irr_negz = alfrid.HDRLoader.parse(getAsset('irr_negz'));

	textureIrr = new alfrid.GLCubeTexture([irr_posx, irr_negx, irr_posy, irr_negy, irr_posz, irr_negz]);
	textureRad = alfrid.GLCubeTexture.parseDDS(getAsset('radiance'));


	//	INIT MESH
	mesh = alfrid.Geom.bigTriangle();

	//	INIT shader
	shader = new alfrid.GLShader(vs, fs);

	//	LOOP RENDERING
	alfrid.Scheduler.addEF(() => loop());

	//	STATS
	stats = new Stats();
	document.body.appendChild(stats.domElement);
}


function loop() {
	GL.clear(0, 0, 0, 0);
	globalTime += 0.01;

	shader.bind();
	shader.uniform('uRadianceMap', 'uniform1i', 0);
	shader.uniform('uIrradianceMap', 'uniform1i', 1);
	textureRad.bind(0);
	textureIrr.bind(1);

	shader.uniform('uBaseColor', 'uniform3fv', [1, 1, 1]);
	shader.uniform('uRoughness', 'uniform1f', params.roughness);
	shader.uniform('uMetallic', 'uniform1f', params.metallic);
	shader.uniform('uSpecular', 'uniform1f', params.specular);

	shader.uniform('uExposure', 'uniform1f', params.exposure);
	shader.uniform('uGamma', 'uniform1f', params.gamma);

	shader.uniform("uGlobalTime", "float", globalTime);
	shader.uniform("uMouse", "vec2", [mouseX, mouseY]);
	shader.uniform("uAspectRatio", "float", GL.aspectRatio);
	shader.uniform("uFOV", "float", params.fov);
	GL.draw(mesh);

	stats.update();
}


function resize() {
	console.log('resizeing');
	GL.setSize(window.innerWidth, window.innerHeight);
}