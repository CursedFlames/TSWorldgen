import { VoronoiWorldMap } from "src/voronoi/voronoi";
import * as Viewport from "pixi-viewport";
import * as PIXI from "pixi.js";

const app = new PIXI.Application();

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight
});
let onResize = ()=>{
	var w = window.innerWidth;
	var h = window.innerHeight;

	//this part resizes the canvas but keeps ratio the same
	app.renderer.view.style.width = w + "px";
	app.renderer.view.style.height = h + "px";

	//this part adjusts the ratio:
	app.renderer.resize(w,h);
}
window.addEventListener("resize", onResize, false);
onResize();

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
let showGrid = false;

let delaunayColor = 0xFF0000;
let voronoiColor = 0x00FF00;

let posX = 0;
let posY = 0;

let minX = -3;
let minY = -3;
let maxX = 3;
let maxY = 3;

function redraw() {
	graphic.clear();

	if (showGrid) {
		graphic.lineStyle(100, 0x555555);
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y < maxY; y++) {
				graphic.moveTo(x*8192, y*8192);
				graphic.lineTo(x*8192, (y+1)*8192);
			}
		}
		for (let x = minX; x < maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				graphic.moveTo(x*8192, y*8192);
				graphic.lineTo((x+1)*8192, y*8192);
			}
		}
	}

	if (showVoronoi) {
		for (let cell of cells) {
			let color = cell.color || 0xFFFFFF;
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
	if (event.key === "g") {
		showGrid = !showGrid;
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
		// add already included cells as well, so we can see if they're conflicting with other cell's edges
		cells.push(...voronoi.getCells(posX, posY));
		redraw();
	}
	if (event.key === "v" || event.key === "g") {
		redraw();
	}
});

redraw();