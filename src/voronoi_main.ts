import { Voronoi, VoronoiGridCell, DelaunayPoint, Vec2 } from "src/voronoi";
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
for (let x = -1; x <= 1; x++) {
	for (let y = -1; y <= 1; y++) {
		cells.push(voronoi.addCell(x, y));
	}
}
// points.push(new DelaunayPoint(11000, 11000, <any>{x: 0, y: 0}));
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
voronoi.advanceRegionToRelaxations(-1, -1, 1, 1, 1);
let graphic2 = new PIXI.Graphics();
viewport.addChild(graphic2);

for (let triangle of voronoi.triangles) {
	graphic2.lineStyle(75, Math.floor(Math.random()*0x1000000))
			.moveTo(triangle.edge1.point1.x, triangle.edge1.point1.y)
			.lineTo(triangle.edge1.point2.x, triangle.edge1.point2.y)
			.moveTo(triangle.edge2.point1.x, triangle.edge2.point1.y)
			.lineTo(triangle.edge2.point2.x, triangle.edge2.point2.y)
			.moveTo(triangle.edge3.point1.x, triangle.edge3.point1.y)
			.lineTo(triangle.edge3.point2.x, triangle.edge3.point2.y);
}

// voronoi.pointsLeft = [new Vec2(11000, 11000)];

let showCircles = false;

document.addEventListener("keypress", (event)=>{
	if (event.key === "s") {
		for (let triangle of voronoi.triangles) {
			let obj = <any> triangle;
			if (obj.isNew) {
				obj.isNew = false;
			}
		}
		voronoi.step();
		for (let triangle of voronoi.triangles) {
			let obj = <any> triangle;
			if (obj.isNew == null) {
				obj.isNew = true;
			}
		}
	}
	if (event.key === "c") {
		showCircles = !showCircles;
	}
	if (event.key === "s" || event.key === "c") {
		graphic2.clear();
		for (let triangle of voronoi.triangles) {
			let color = Math.floor(Math.random()*0x1000000);
			graphic2.lineStyle(75, color)
					.moveTo(triangle.edge1.point1.x, triangle.edge1.point1.y)
					.lineTo(triangle.edge1.point2.x, triangle.edge1.point2.y)
					.moveTo(triangle.edge2.point1.x, triangle.edge2.point1.y)
					.lineTo(triangle.edge2.point2.x, triangle.edge2.point2.y)
					.moveTo(triangle.edge3.point1.x, triangle.edge3.point1.y)
					.lineTo(triangle.edge3.point2.x, triangle.edge3.point2.y);
			if (showCircles && (<any> triangle).isNew) {
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
				graphic2.lineStyle(25, color);
				graphic2.beginFill(0xFFFFFF, 0.1);
				graphic2.drawCircle(x, y, r);
				graphic2.endFill();
			}
		}
	}
});