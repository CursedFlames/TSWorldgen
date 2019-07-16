import * as THREE from "three";
import OpenSimplexNoise from 'open-simplex-noise';
import * as FractalNoise from "fractal-noise";

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

// var geometry = new THREE.BoxGeometry(1, 1, 1);
var material = new THREE.MeshBasicMaterial({ color: 0x00ff00});
// var cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

const noise = new OpenSimplexNoise(Date.now());

var light = new THREE.PointLight(0xffffff);
light.position.set(10, 10, 10);
scene.add(light);

var height: number[][] = <any>FractalNoise.makeRectangle(200, 200, (x,y)=>noise.noise2D(x,y), {octaves: 8, persistence: 0.5, frequency: 0.05})
console.log(height);

var material2 = new THREE.MeshStandardMaterial(
        {vertexColors: THREE.VertexColors, side: THREE.DoubleSide, metalness: 0, roughness: 1});
var planeGeo = new THREE.PlaneGeometry(10, 10, 199, 199);
for (let i = 0; i < planeGeo.vertices.length; i++) {
    let v = planeGeo.vertices[i];
    v.z = height[i%200][Math.floor(i/200)];
    planeGeo.colors[i] = new THREE.Color(0xCCCCCC);
}
var plane = new THREE.Mesh(planeGeo, material2);
scene.add(plane);

var water = new THREE.PlaneGeometry(10, 10, 1, 1);
var waterMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(0x3333FF), side: THREE.DoubleSide});
scene.add(new THREE.Mesh(water, waterMaterial));

camera.position.z = 5;

function draw(timestamp: number) {
    requestAnimationFrame(draw);
    renderer.render(scene, camera);
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
}
requestAnimationFrame(draw);