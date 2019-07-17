import * as THREE from "three";
import OpenSimplexNoise from 'open-simplex-noise';
import * as FractalNoise from "fractal-noise";
import { Board } from "src/worldgen";

// OrbitControls.js expects a global THREE object
(window as any).THREE = THREE;

// NOTE: OrbitControls must be included with require:
// using "import" cause it to be executed before global THREE becomes available
declare var require: any
require("three/examples/js/controls/OrbitControls");

const scene = new THREE.Scene();
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

var light = new THREE.PointLight(0xffffff);
light.position.set(12, 12, 18);
scene.add(light);

var ambientLight = new THREE.AmbientLight(0x666666);
scene.add(ambientLight);

const board = new Board(256, 256);

var material = new THREE.MeshStandardMaterial(
		{vertexColors: THREE.VertexColors, side: THREE.DoubleSide, metalness: 0, roughness: 1});
var planeGeo = new THREE.PlaneGeometry(16, 16, 255, 255);

for (let i = 0; i < planeGeo.vertices.length; i++) {
	let v = planeGeo.vertices[i];
	v.z = board.heightmap[i%256][Math.floor(i/256)];
}
for (let i = 0; i < planeGeo.faces.length; i++) {
	let face = planeGeo.faces[i];

	face.vertexColors = [board.colormap[face.a%256][Math.floor(face.a/256)],
						 board.colormap[face.b%256][Math.floor(face.b/256)],
						 board.colormap[face.c%256][Math.floor(face.c/256)]];
}
planeGeo.colorsNeedUpdate = true;
var plane = new THREE.Mesh(planeGeo, material);
scene.add(plane);

var water = new THREE.PlaneGeometry(16, 16, 1, 1);
var waterMaterial = new THREE.MeshStandardMaterial(
		{color: new THREE.Color(0x3333FF), side: THREE.DoubleSide, metalness: 0.2, roughness: 0.6});
scene.add(new THREE.Mesh(water, waterMaterial));

// var grid = new THREE.GridHelper(10, 10);
var gridXZ = new THREE.GridHelper(16, 16, new THREE.Color(0x006600), new THREE.Color(0x006600));
// gridXZ.setColors( new THREE.Color(0x006600), new THREE.Color(0x006600) );
gridXZ.position.set(0,-8,8);
scene.add(gridXZ);

var gridXY = new THREE.GridHelper(16, 16, new THREE.Color(0x000066), new THREE.Color(0x000066));
// gridXY.position.set( 10,10,0 );
gridXY.rotation.x = Math.PI/2;
// gridXY.setColors( new THREE.Color(0x000066), new THREE.Color(0x000066) );
scene.add(gridXY);
var gridYZ = new THREE.GridHelper(16, 16, new THREE.Color(0x660000), new THREE.Color(0x660000));
gridYZ.position.set(-8,0,8);
gridYZ.rotation.z = Math.PI/2;
// gridYZ.setColors( new THREE.Color(0x660000), new THREE.Color(0x660000) );
scene.add(gridYZ);

gridXZ.renderOrder = 999;
gridXY.renderOrder = 998;
gridYZ.renderOrder = 999;
gridXY.onBeforeRender = (renderer) => {renderer.clearDepth();};

document.addEventListener("keypress", (event)=>{
	if (event.key == "g") {
		let showGrid = !gridXY.visible;
		gridXZ.visible = showGrid;
		gridXY.visible = showGrid;
		gridYZ.visible = showGrid;
	}
});

function draw(timestamp: number) {
	requestAnimationFrame(draw);
	renderer.render(scene, camera);
	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;
}
requestAnimationFrame(draw);