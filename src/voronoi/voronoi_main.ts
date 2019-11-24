import { VoronoiWorldMap } from "src/voronoi/voronoi";
import * as Viewport from "pixi-viewport";
import * as PIXI from "pixi.js";

const app = new PIXI.Application();

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight
});

const voronoi = new VoronoiWorldMap();

viewport.zoom(100000);
viewport.moveCenter(new PIXI.Point(0,0));

document.body.appendChild(app.view);
app.stage.addChild(viewport);

viewport.drag().wheel().decelerate();

let cells = voronoi.getCells(0, 0);

let graphic = new PIXI.Graphics();
viewport.addChild(graphic);

let showVoronoi = true;

let delaunayColor = 0xFF0000;
let voronoiColor = 0x00FF00;

let posX = 0;
let posY = 0;

function redraw() {
	graphic.clear();
	if (showVoronoi) {
		for (let cell of cells) {
			let color = cell.color || 0xFFFFFF;//Math.floor(Math.random()*0x1000000);
			for (let edge of cell.edges) {
				graphic.lineStyle(75, edge.color || 0xFFFFFF)
						.moveTo(edge.vert1.x*8192, edge.vert1.y*8192)
						.lineTo(edge.vert2.x*8192, edge.vert2.y*8192);
			}
			let centroid = cell.getCentroid();
			graphic.lineStyle(0);
			graphic.beginFill(color);
			graphic.drawCircle(centroid.x*8192, centroid.y*8192, 100);
			graphic.endFill();
		}
	}
}

document.addEventListener("keypress", (event)=>{
	if (event.key === "v") {
		showVoronoi = !showVoronoi;
	}
	if (event.key === "w") {
		posY -= 1;
	}
	if (event.key === "s") {
		posY += 1;
	}
	if (event.key === "a") {
		posX -= 1;
	}
	if (event.key === "d") {
		posX += 1;
	}
	if (event.key === "w" || event.key === "a" || event.key === "s" || event.key === "d") {
		cells.push(...voronoi.getCells(posX, posY));
		redraw();
	}
	if (event.key === "v") {
		redraw();
	}
});

redraw();