import { Voronoi, VoronoiGridCell, DelaunayPoint, Vec2 } from "src/voronoi";
import { DelaunayTriangulator, TriPoint, VorCell, cullVorCellsToArea, Triangle } from "src/voronoi2";
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
let startX = -9;
let startY = -9;
let endX = 9;
let endY = 9;
for (let x = startX; x <= endX; x++) {
	for (let y = startY; y <= endY; y++) {
		cells.push(voronoi.addCell(x, y));
	}
}

for (let cell of cells) {
	points.push(...cell.delaunayPoints);
}
let graphic = new PIXI.Graphics();
viewport.addChild(graphic);
const triangulator = new DelaunayTriangulator();
let points2 = voronoi.getPoints(startX, startY, endX, endY);
let points3: TriPoint[] = [];
let triangles: Triangle[] = [];
let voronoiCells: VorCell[] = [];
let triangulationStartX = startX*voronoi.gridCellWidth;
let triangulationStartY = startY*voronoi.gridCellWidth;
let triangulationEndX = endX*voronoi.gridCellWidth;
let triangulationEndY = endY*voronoi.gridCellWidth;
function doVoronoiStep() {
	points3 = [];
	for (let point of points2) {
		points3.push(new TriPoint(point.x, point.y));
	}
	triangles = triangulator.doTriangulation(
		points3,
		triangulationStartX, triangulationStartY,
		triangulationEndX, triangulationEndY);
	voronoiCells = [];
	for (let point of points3) {
		let cell = VorCell.fromTriPoint(point);
		if (cell != null) {
			voronoiCells.push(cell);
		}
	}
	startX += 2;
	startY += 2;
	endX -= 2;
	endY -= 2;
	voronoiCells = cullVorCellsToArea(voronoiCells,
		startX*voronoi.gridCellWidth, startY*voronoi.gridCellWidth,
		(endX+1)*voronoi.gridCellWidth, (endY+1)*voronoi.gridCellWidth);
}

function relaxPoints() {
	points2 = [];
	for (let cell of voronoiCells) {
		let centroid = cell.getCentroid();
		points2.push(new Vec2(centroid.x, centroid.y));
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
	graphic.clear();
	for (let point of points2) {
		graphic.beginFill(0xFF0000);
		graphic.drawCircle(point.x,
							point.y, 100);
		graphic.endFill();
	}
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
			let centroid = cell.getCentroid();
			graphic2.beginFill(color);
			graphic2.drawCircle(centroid.x, centroid.y, 100);
			graphic2.endFill();
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
	if (event.key === "s") {
		relaxPoints();
		doVoronoiStep();
	}
	if (event.key === "c" || event.key === "d" || event.key === "v" || event.key === "s") {
		redraw();
	}
});

doVoronoiStep();
redraw();