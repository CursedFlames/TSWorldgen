import * as THREE from "three";
import OpenSimplexNoise from 'open-simplex-noise';
import * as FractalNoise from "fractal-noise";
import { Board } from "src/worldgen";
// OrbitControls.js expects a global THREE object
(window as any).THREE = THREE;
import "three-examples/controls/OrbitControls";
import "three-examples/objects/Water";
import { RENDERER_TYPE } from "pixi.js";

const scene = new THREE.Scene();
const gridScene = new THREE.Scene(); // separate scene so it doesn't reflect in water
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.z = 15;
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new THREE.Color(0xAAAAFF))
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", ()=>{
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

const controls = new (<any>THREE).OrbitControls(camera, renderer.domElement);

const WIDTH = 512;
const REGION_SIZE = 16;
const WIDTH_REGIONS = WIDTH/REGION_SIZE;

// var light = new THREE.PointLight(0xFFFFFF, 0.33);
// light.position.set(24, 24, 36);
// scene.add(light);

// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var directionalLight = new THREE.DirectionalLight(0xFFFFFF);
directionalLight.position.set(0, WIDTH_REGIONS, WIDTH_REGIONS/4);
// directionalLight.castShadow = true;
scene.add(directionalLight);


// light.shadow.mapSize.width = 512;
// light.shadow.mapSize.height = 512;
// light.shadow.camera.near = 0.5;    // default
// light.shadow.camera.far = 500;     // default

var ambientLight = new THREE.AmbientLight(0x444444);
scene.add(ambientLight);

const board = new Board(""+Math.random(), WIDTH, WIDTH);

var material = new THREE.MeshStandardMaterial(
		{vertexColors: THREE.VertexColors, side: THREE.DoubleSide, metalness: 0, roughness: 1,
		flatShading: true});
var planeGeo = new THREE.PlaneGeometry(WIDTH_REGIONS, WIDTH_REGIONS, WIDTH-1, WIDTH-1);

for (let i = 0; i < planeGeo.vertices.length; i++) {
	let v = planeGeo.vertices[i];
	v.z = board.heightmap[i%WIDTH][Math.floor(i/WIDTH)]/REGION_SIZE;
}
for (let i = 0; i < planeGeo.faces.length; i++) {
	let face = planeGeo.faces[i];

	face.vertexColors = [board.colormap[face.a%WIDTH][Math.floor(face.a/WIDTH)],
						 board.colormap[face.b%WIDTH][Math.floor(face.b/WIDTH)],
						 board.colormap[face.c%WIDTH][Math.floor(face.c/WIDTH)]];
}
planeGeo.colorsNeedUpdate = true;
var plane = new THREE.Mesh(planeGeo, material);
// plane.castShadow = true;
// plane.receiveShadow = true;
scene.add(plane);

var waterGeo = new THREE.PlaneGeometry(WIDTH_REGIONS, WIDTH_REGIONS, 1, 1);
var waterMaterial = new THREE.MeshBasicMaterial(
		{color: new THREE.Color(0x2929D8), side: THREE.DoubleSide, opacity: 0.75, transparent: true});
var water = new THREE.Mesh(waterGeo, waterMaterial);
// var water: THREE.Mesh = new (<any>THREE).Water(waterGeo, {
// 	textureWidth: 512, 
//     textureHeight: 512,
//     // waterNormals: waterNormals,
//     alpha: 0.6,
//     sunDirection: directionalLight.position.clone().normalize(),
//     sunColor: 0xffffff,
//     waterColor: 0x001eff,
//     // distortionScale: 50.0
// });

// water.castShadow = true;
// water.receiveShadow = true;
scene.add(water);

var gridXZ = new THREE.GridHelper(WIDTH_REGIONS, WIDTH_REGIONS, new THREE.Color(0x006600), new THREE.Color(0x006600));
gridXZ.position.set(0,-WIDTH_REGIONS/2,WIDTH_REGIONS/2);
gridScene.add(gridXZ);

var gridXY = new THREE.GridHelper(WIDTH_REGIONS, WIDTH_REGIONS, new THREE.Color(0x000066), new THREE.Color(0x000066));
// gridXY.position.set( 10,10,0 );
gridXY.rotation.x = Math.PI/2;
gridScene.add(gridXY);
var gridYZ = new THREE.GridHelper(WIDTH_REGIONS, WIDTH_REGIONS, new THREE.Color(0x660000), new THREE.Color(0x660000));
gridYZ.position.set(-WIDTH_REGIONS/2,0,WIDTH_REGIONS/2);
gridYZ.rotation.z = Math.PI/2;
gridScene.add(gridYZ);

(<any>gridXZ.material).depthTest = false;
(<any>gridXY.material).depthTest = false;
(<any>gridYZ.material).depthTest = false;
gridXZ.renderOrder = 2;
gridXY.renderOrder = 1;
gridYZ.renderOrder = 2;

// gridXY.onBeforeRender = (renderer) => {renderer.clearDepth();};

document.addEventListener("keypress", (event)=>{
	if (event.key == "g") {
		let showGrid = !gridXY.visible;
		gridXZ.visible = showGrid;
		gridXY.visible = showGrid;
		gridYZ.visible = showGrid;
	}
});

renderer.autoClear = false; // So we can render multiple scenes in one frame

function draw(timestamp: number) {
	// let time = performance.now() * 0.001;
	// (<any>water.material).uniforms["time"].value += 1/60;
	renderer.clear();
	renderer.render(scene, camera);
	renderer.render(gridScene, camera);
	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;
	requestAnimationFrame(draw);
}
requestAnimationFrame(draw);