

enum Dir {
	UP_LEFT,
	UP,
	UP_RIGHT,
	RIGHT,
	DOWN_RIGHT,
	DOWN,
	DOWN_LEFT,
	LEFT
}

const Dirs = [Dir.UP_LEFT, Dir.UP, Dir.UP_RIGHT, Dir.RIGHT, Dir.DOWN_RIGHT, Dir.DOWN, Dir.DOWN_LEFT, Dir.LEFT];

namespace DirUtil {
	export function offset(dir: Dir, x: number, y: number): number[] {
		switch(dir) {
			case Dir.UP_LEFT:
				return [x-1, y-1];
			case Dir.UP:
				return [x, y-1];
			case Dir.UP_RIGHT:
				return [x+1, y-1];
			case Dir.RIGHT:
				return [x+1, y];
			case Dir.DOWN_RIGHT:
				return [x+1, y+1];
			case Dir.DOWN:
				return [x, y+1];
			case Dir.DOWN_LEFT:
				return [x-1, y+1];
			case Dir.LEFT:
				return [x-1, y];
		}
	}

	export function reverse(dir: Dir): Dir {
		switch (dir) {
			case Dir.UP_LEFT:
				return Dir.DOWN_RIGHT;
			case Dir.UP:
				return Dir.DOWN;
			case Dir.UP_RIGHT:
				return Dir.DOWN_LEFT;
			case Dir.RIGHT:
				return Dir.LEFT;
			case Dir.DOWN_RIGHT:
				return Dir.UP_LEFT;
			case Dir.DOWN:
				return Dir.UP;
			case Dir.DOWN_LEFT:
				return Dir.UP_RIGHT;
			case Dir.LEFT:
				return Dir.RIGHT;
		}
	}
}

export class Vec2 {
	constructor(public x: number, public y: number) {}

	equals(other: Vec2): boolean {
		return other != null && this.x == other.x && this.y == other.y;
	}
}
export class DelaunayPoint extends Vec2 {
	constructor(x: number, y: number, public cell: VoronoiGridCell) {
		super(x, y);
	}
}
export class Edge {
	constructor(public point1: Vec2, public point2: Vec2) {}

	equals(other: Edge): boolean {
		return other != null && 
		((this.point1.equals(other.point1) && this.point2.equals(other.point2))
		|| (this.point2.equals(other.point1) && this.point1.equals(other.point2)));
	}
}
export class Triangle {
	edge1: Edge;
	edge2: Edge;
	edge3: Edge;
	constructor (public vert1: Vec2, public vert2: Vec2, public vert3: Vec2) {
		// force counterclockwise triangle
		if ((this.vert2.x - this.vert1.x)
		   *(this.vert3.y - this.vert1.y)
		   -(this.vert3.x - this.vert1.x)
		   *(this.vert2.y - this.vert1.y) <= 0) {
			this.vert2, this.vert3 = this.vert3, this.vert2;
		}
		this.edge1 = new Edge(vert1, vert2);
		this.edge2 = new Edge(vert2, vert3);
		this.edge3 = new Edge(vert3, vert1);
	}
}
export class VoronoiGridCell {
	neighbors: Map<Dir, VoronoiGridCell> = new Map<Dir, VoronoiGridCell>();
	neighborsList: VoronoiGridCell[] = [];
	delaunayPoints: DelaunayPoint[] = [];
	prevPoints: DelaunayPoint[][] = [];
	relaxations = 0;
	// TODO use normal distribution to pick number of points for cell? not sure what stddev should be though
	constructor(public parent: Voronoi, public x: number, public y: number) {
		for (let i = 0; i < parent.pointsPerCell; i++) {
			// TODO might want to floor these? use int coords
			// TODO seeded random
			let pointX = Math.random()*parent.gridCellWidth;
			let pointY = Math.random()*parent.gridCellWidth;
			this.delaunayPoints.push(new DelaunayPoint(pointX, pointY, this));
			this.prevPoints.push(this.delaunayPoints);
		}
	}
}
export class Voronoi {
	gridCellWidth: number = 8192;
	pointsPerCell: number = 5;
	grid: Map<string, VoronoiGridCell>;

	constructor() {
		this.grid = new Map<string, VoronoiGridCell>();
	}

	addCell(x: number, y: number): VoronoiGridCell {
		let key = x+","+y;
		// TODO might want to error if cell already present?
		if (this.grid.has(key)) return <VoronoiGridCell> this.grid.get(key);
		let cell = new VoronoiGridCell(this, x, y);
		for (let dir of Dirs) {
			let [x2, y2] = DirUtil.offset(dir, x, y);
			let key2 = x2+","+y2;
			if (this.grid.has(key2)) {
				let cell2 = <VoronoiGridCell> this.grid.get(key2);
				cell2.neighborsList.push(cell);
				cell.neighborsList.push(cell2);
				cell.neighbors.set(dir, cell2);
				cell2.neighbors.set(DirUtil.reverse(dir), cell);
			}
		}
		this.grid.set(key, cell);
		return cell;
	}

	// for testing
	outerPoints: Vec2[] = [];
	triangles: Triangle[] = [];
	pointsLeft: Vec2[] = [];
	clean = false;

	cleanup(): void {
		for (let i = 0; i < this.triangles.length; i++) {
			let triangle = this.triangles[i];
			let outerTriangle = false;
			for (let point of this.outerPoints) {
				if (triangle.vert1.equals(point)
				  ||triangle.vert2.equals(point)
				  ||triangle.vert3.equals(point)) {
					outerTriangle = true;
					break;
				}
			}
			if (outerTriangle) {
				this.triangles.splice(i, 1);
				i--;
			}
		}
	}

	step(): void {
		if (this.pointsLeft.length === 0) {
			if (this.clean) return;
			this.cleanup();
			this.clean = true;
			return;
		}
		this.retriangulate(this.triangles, <Vec2> this.pointsLeft.pop());
	}

	advanceRegionToRelaxations(x1: number, y1: number, x2: number, y2: number, relaxations: number): void {
		if (x2 < x1 || y2 < y1) {
			throw new Error("get your points around the right way, Cursed, you dumbass");
		}
		// let expandX = x2-x1 < 2;
		// let expandY = y2-y1 < 2;
		// if (expandX || expandY) {
		// 	return this.advanceRegionToRelaxations(expandX ? x1-1 : x1, expandY ? y1-1 : y1,
		// 		expandX ? x2+1 : x2, expandY ? y2+1 : y2, relaxations);
		// }
		let outerPoints: Vec2[] =
				[new Vec2(x1*this.gridCellWidth-1, y1*this.gridCellWidth-1),
					new Vec2((2+2*x2-x1)*this.gridCellWidth-1, y1*this.gridCellWidth-1),
					new Vec2(x1*this.gridCellWidth-1, (2+2*y2-y1)*this.gridCellWidth-1)];
		this.outerPoints = outerPoints;
		let points: (Vec2 | DelaunayPoint)[] = [];
		for (let x = x1; x <= x2; x++) {
			for (let y = y1; y <= y2; y++) {
				// FIXME check that cells exist and have n-1 relaxations
				// recurse if they don't have n-1 relaxations already.
				let cell = this.grid.get(x+","+y);
				if (cell == null) {
					throw Error("nonexistent cell at " + x + ", " + y); //FIXME
				}
				// points.push(...cell.delaunayPoints);
				for (let point of cell.delaunayPoints) {
					let point2 = new Vec2(point.x+x*this.gridCellWidth, point.y+y*this.gridCellWidth);
					points.push(point2);
				}
			}
		}
		let triangles: Triangle[] = [new Triangle(outerPoints[0], outerPoints[1], outerPoints[2])];
		// for (let point of points) {
		// 	this.retriangulate(triangles, point);
		// }
		this.triangles = triangles;
		this.pointsLeft = points;
		// TODO remember to prevent points crossing cell boundaries if it would leave a cell empty
	}

	retriangulate(triangles: Triangle[], point: Vec2) {
		console.log("Doing retriangulation step");
		let badTriangles: Triangle[] = [];
		// TODO when moving to Java, make this a set so we don't need sorting and removing
		let polygonHole: Edge[] = [];
		console.log("Start tris: " + triangles.length);
		this.findInvalidatedTriangles(triangles, point, badTriangles);
		this.polygonHoleFromBadTriangles(badTriangles, polygonHole);
		// this.removeDuplicatedEdges(polygonHole);
		console.log("bad triangles: ")
		console.log(badTriangles);
		for (let triangle of badTriangles) {
			triangles.splice(triangles.indexOf(triangle), 1);
		}
		console.log("After removing bad: " + triangles.length);
		this.fillPolygonHole(triangles, point, polygonHole);
		console.log("End tris: " + triangles.length);
	}

	pointInCircumcircle(triangle: Triangle, point: Vec2): boolean {
		// black magic
		// assumes that triangle points are listed in counterclockwise order.
		// let ax_ = triangle.vert1.x-point.x;
		// let ay_ = triangle.vert1.y-point.ypolygonHoleFromBadTriangles;
		// let bx_ = triangle.vert2.x-point.xpolygonHoleFromBadTriangles;
		// let by_ = triangle.vert2.y-point.ypolygonHoleFromBadTriangles;
		// let cx_ = triangle.vert3.x-point.x;
		// let cy_ = triangle.vert3.y-point.y;
		// return (
		// 	(ax_*ax_ + ay_*ay_) * (bx_*cy_-cx_*by_) -
		// 	(bx_*bx_ + by_*by_) * (ax_*cy_-cx_*ay_) +
		// 	(cx_*cx_ + cy_*cy_) * (ax_*by_-bx_*ay_)
		// ) > 0;
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

		let dpx = point.x - x;
		let dpy = point.y - y;
		let r2 = dx*dx + dy*dy;
		return dpx*dpx+dpy*dpy < r2;
	}

	findInvalidatedTriangles(triangles: Triangle[], point: Vec2,
	                         badTriangles: Triangle[]) {
		for (let triangle of triangles) {
			if (this.pointInCircumcircle(triangle, point)) {
				badTriangles.push(triangle);
				let edges = [triangle.edge1, triangle.edge2, triangle.edge3];
				let oppVertices = [];
				for (let i = 0; i < 3; i++) {
					let edge = edges[i];
					// TODO make ordering of edges and points in triangles deterministic,
					// so we don't need this
					if (triangle.vert1 !== edge.point1 && triangle.vert1 !== edge.point2) {
						oppVertices.push(triangle.vert1);
					} else if (triangle.vert2 !== edge.point1 && triangle.vert2 !== edge.point2) {
						oppVertices.push(triangle.vert2);
					} else if (triangle.vert3 !== edge.point1 && triangle.vert3 !== edge.point2) {
						oppVertices.push(triangle.vert3);
					} else {
						throw new Error("AAAAAAAAAAAAAAA");
					}
				}
			}
		}
	}

	polygonHoleFromBadTriangles(badTriangles: Triangle[], polygonHole: Edge[]) {
		for (let triangle of badTriangles) {
			let edges = [triangle.edge1, triangle.edge2, triangle.edge3];
			for (let edge of edges) {
				let sharedEdge = false;
				for (let triangle2 of badTriangles) {
					if (triangle !== triangle2) {
						if (triangle2.edge1.equals(edge)
						 || triangle2.edge2.equals(edge)
						 || triangle2.edge3.equals(edge)) {
							sharedEdge = true;
							break;
						}
					}
				}
				if (!sharedEdge) {
					polygonHole.push(edge);
				}
			}
		}
	}

	removeDuplicatedEdges(edges: Edge[]) {
		for (let edge of edges) {
			if (edge.point2.x < edge.point1.x) {
				edge.point1, edge.point2 = edge.point2, edge.point1;
			} else if (edge.point2.x == edge.point1.x && edge.point2.y < edge.point1.y) {
				edge.point1, edge.point2 = edge.point2, edge.point1;
			}
		}
		// Is sorting really necessary here? O(n^2) brute force check vs O(n log n) with sorting
		// Ideally we'd kill duplicates during sorting, but ehhhhh
		// edges.sort((a, b)=> {
		// 	if (a.point1.x - b.point1.x !== 0) return a.point1.x - b.point1.x;
		// 	if (a.point2.x - b.point2.x !== 0) return a.point2.x - b.point2.x;
		// 	if (a.point1.y - b.point1.y !== 0) return a.point1.y - b.point1.y;
		// 	return a.point2.y - b.point2.y;
		// });
		// for (let i = 1; i < edges.length; i++) {
		// 	if (edges[i].equals(edges[i-1])) {
		// 		edges.splice(i, 1);
		// 		i--;
		// 	}
		// }
		for (let i = 0; i < edges.length; i++) {
			for (let j = i+1; j < edges.length; j++) {
				if (edges[i].equals(edges[j])) {
					edges.splice(j, 1);
					j--;
				}
			}
		}
	}

	fillPolygonHole(triangles: Triangle[], point: Vec2, polygonHole: Edge[]) {
		console.log("polygon hole: ");
		console.log(polygonHole);
		for (let edge of polygonHole) {
			let triangle = new Triangle(edge.point1, edge.point2, point);
			triangles.push(triangle);
		}
	}
}