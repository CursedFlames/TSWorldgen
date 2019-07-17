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

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new THREE.Color(0xAAAAFF))
document.body.appendChild(renderer.domElement);

const controls = new (<any>THREE).OrbitControls(camera, renderer.domElement);

var light = new THREE.PointLight(0xffffff);
light.position.set(10, 10, 10);
scene.add(light);

var ambientLight = new THREE.AmbientLight(0x666666);
scene.add(ambientLight);

const board = new Board(200, 200);

var material = new THREE.MeshStandardMaterial(
		{vertexColors: THREE.VertexColors, side: THREE.DoubleSide, metalness: 0, roughness: 1});
var planeGeo = new THREE.PlaneGeometry(10, 10, 199, 199);

for (let i = 0; i < planeGeo.vertices.length; i++) {
	let v = planeGeo.vertices[i];
	v.z = board.heightmap[i%200][Math.floor(i/200)];
	// planeGeo.colors[i] = board.colormap[i%200][Math.floor(i/200)]
}
for (let i = 0; i < planeGeo.faces.length; i++) {
	let face = planeGeo.faces[i];

	face.vertexColors = [board.colormap[face.a%200][Math.floor(face.a/200)],
	                     board.colormap[face.b%200][Math.floor(face.b/200)],
	                     board.colormap[face.c%200][Math.floor(face.c/200)]];
}
planeGeo.colorsNeedUpdate = true;
var plane = new THREE.Mesh(planeGeo, material);
scene.add(plane);

var water = new THREE.PlaneGeometry(10, 10, 1, 1);
var waterMaterial = new THREE.MeshStandardMaterial(
        {color: new THREE.Color(0x3333FF), side: THREE.DoubleSide, metalness: 0.2, roughness: 0.6});
scene.add(new THREE.Mesh(water, waterMaterial));

camera.position.z = 5;

function draw(timestamp: number) {
	requestAnimationFrame(draw);
	renderer.render(scene, camera);
	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;
}
requestAnimationFrame(draw);