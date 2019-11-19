import { Voronoi, VoronoiGridCell, DelaunayPoint } from "src/voronoi";
import { DelaunayTriangulator, TriPoint, VorCell } from "src/voronoi2";
import * as Viewport from "pixi-viewport";
import * as PIXI from "pixi.js";

const app = new PIXI.Application();

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight
});

const voronoi = new Voronoi();

viewport.zoom(100000);
viewport.moveCenter(new PIXI.Point(voronoi.gridCellWidth/2,voronoi.gridCellWidth/2));

document.body.appendChild(app.view);
app.stage.addChild(viewport);

viewport.drag().wheel().decelerate();

let cells: VoronoiGridCell[] = [];
let points: DelaunayPoint[] = [];
let startX = -2;
let startY = -2;
let endX = 2;
let endY = 2;
for (let x = startX; x <= endX; x++) {
	for (let y = startY; y <= endY; y++) {
		cells.push(voronoi.addCell(x, y));
	}
}

for (let cell of cells) {
	points.push(...cell.delaunayPoints);
}
let graphic = new PIXI.Graphics();
for (let point of points) {
	graphic.beginFill(0xFF0000);
	graphic.drawCircle(point.x+point.cell.x*voronoi.gridCellWidth,
	                   point.y+point.cell.y*voronoi.gridCellWidth, 100);
	graphic.endFill();
}
viewport.addChild(graphic);
const triangulator = new DelaunayTriangulator();
let points2 = voronoi.getPoints(startX, startY, endX, endY);
let points3: TriPoint[] = [];
for (let point of points2) {
	points3.push(TriPoint.of(point));
}
let triangles = triangulator.doTriangulation(
	points3,
	startX*voronoi.gridCellWidth, startY*voronoi.gridCellWidth,
	endX*voronoi.gridCellWidth, endY*voronoi.gridCellWidth);
let voronoiCells: VorCell[] = [];
for (let point of points3) {
	let cell = VorCell.fromTriPoint(point);
	if (cell != null) {
		voronoiCells.push(cell);
	}
}

let graphic2 = new PIXI.Graphics();
viewport.addChild(graphic2);

let showCircles = false;
let showDelaunay = true;
let showVoronoi = true;

let delaunayColor = 0xFF0000;
let voronoiColor = 0x00FF00;

function redraw() {
	graphic2.clear();
	for (let triangle of triangles) {
		if (showDelaunay) {
			graphic2.lineStyle(75, delaunayColor)
					.moveTo(triangle.edge1.vert1.x, triangle.edge1.vert1.y)
					.lineTo(triangle.edge1.vert2.x, triangle.edge1.vert2.y)
					.moveTo(triangle.edge2.vert1.x, triangle.edge2.vert1.y)
					.lineTo(triangle.edge2.vert2.x, triangle.edge2.vert2.y)
					.moveTo(triangle.edge3.vert1.x, triangle.edge3.vert1.y)
					.lineTo(triangle.edge3.vert2.x, triangle.edge3.vert2.y);
		}
		if (showCircles) {
			let [ax, ay] = [triangle.vert1.x, triangle.vert1.y];
			let [bx, by] = [triangle.vert2.x, triangle.vert2.y];
			let [cx, cy] = [triangle.vert3.x, triangle.vert3.y];
			let D = 2 * (ax*(by-cy) + bx*(cy-ay) + cx*(ay-by));
			let ad = ax*ax + ay*ay;
			let bd = bx*bx + by*by;
			let cd = cx*cx + cy*cy;
			let x = (ad*(by-cy) + bd*(cy-ay) + cd*(ay-by))/D;
			let y =-(ad*(bx-cx) + bd*(cx-ax) + cd*(ax-bx))/D;

			let dx = x - ax;
			let dy = y - ay;
			let r = Math.sqrt(dx*dx + dy*dy);
			graphic2.lineStyle(25, delaunayColor);
			graphic2.beginFill(0xFFFFFF, 0.1);
			graphic2.drawCircle(x, y, r);
			graphic2.endFill();
		}
	}
	if (showVoronoi) {
		for (let cell of voronoiCells) {
			let color = Math.floor(Math.random()*0x1000000);
			for (let edge of cell.edges) {
				graphic2.lineStyle(75, color)
						.moveTo(edge.vert1.x, edge.vert1.y)
						.lineTo(edge.vert2.x, edge.vert2.y);
			}
		}
	}
}

document.addEventListener("keypress", (event)=>{
	if (event.key === "c") {
		showCircles = !showCircles;
	}
	if (event.key === "d") {
		showDelaunay = !showDelaunay;
	}
	if (event.key === "v") {
		showVoronoi = !showVoronoi;
	}
	// if (event.key === "s") {
	// 	triangulator.retriangulate(triangles, TriPoint.of(<any>points2.pop()));
	// }
	if (event.key === "c" || event.key === "d" || event.key === "v" || event.key === "s") {
		redraw();
	}
});

redraw();