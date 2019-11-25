import * as seedrandom from "seedrandom";

export class Vec2 {
	constructor(public x: number, public y: number) {}
	
	/**
	 * Includes beginning of range, excludes end of range.
	 */
	inArea(x1: number, y1: number, x2: number, y2: number): boolean {
		return this.x >= x1 && this.x < x2 && this.y >= y1 && this.y < y2;
	}

	equals(other: Vec2): boolean {
		// return other.x === this.x && other.y === this.y;
		
		// this doesn't handle infinity but whatever
		// hopefully this epsilon is big enough to not fail reasonably far out from 0,0, but not too big
		// idk, it doesn't matter anyway, it's not like this will be used for anything important probably
		return Math.abs(other.x-this.x) < 1E-8 && Math.abs(other.y-this.y) < 1E-8;
	}
}

export class VorPoint extends Vec2 {
	edges: VorEdge[] = [];
	static fromTriangle(triangle: Triangle): VorPoint {
		if (triangle.vorPoint != null) {
			console.warn("Tried to make Voronoi point for triangle that already had a Voronoi point");
			return triangle.vorPoint;
		}
		let pos = triangle.circumcenter();
		let point = new VorPoint(pos.x, pos.y);
		triangle.vorPoint = point;
		return point;
	}
}

export class VorEdge {
	cell1?: VorCell | null;
	cell2?: VorCell | null;
	color?: number; //FIXME remove debug
	// TODO do we want a ref to the TriEdge here?

	private constructor(public vert1: VorPoint, public vert2: VorPoint) {
		vert1.edges.push(this);
		vert2.edges.push(this);
	}

	static fromTriEdge(triEdge: TriEdge): VorEdge | null {
		if (triEdge.vorEdge !== undefined) {
			console.warn("Tried to make Voronoi edge for triangle edge that already had a Voronoi edge");
			return triEdge.vorEdge;
		}
		if (triEdge.triangle1 == null || triEdge.triangle2 == null) {
			triEdge.vorEdge = null;
			console.warn("Tried to make Voronoi edge for triangle edge that didn't have two triangles");
			return null;
		}
		let point1 = triEdge.triangle1.vorPoint == null
					 ? VorPoint.fromTriangle(triEdge.triangle1)
					 : triEdge.triangle1.vorPoint;
		let point2 = triEdge.triangle2.vorPoint == null
		             ? VorPoint.fromTriangle(triEdge.triangle2)
					 : triEdge.triangle2.vorPoint;
		let edge = new VorEdge(point1, point2);
		triEdge.vorEdge = edge;
		return edge;
	}

	addCell(cell: VorCell): void {
		if (this.cell1 == null) {
			this.cell1 = cell; return;
		} else if (this.cell2 == null) {
			this.cell2 = cell; return;
		} else {
			throw new Error("edge with three cells");
		}
	}
}

export class VorCell {
	edges: VorEdge[] = [];
	verts: VorPoint[] = [];
	centroid?: Vec2;
	isComplete: boolean = true;
	color?: number; //FIXME remove debug
	private constructor(public point?: Vec2) {}
	static fromTriPoint(point: TriPoint): VorCell | null {
		if (point.vorCell !== undefined) {
			console.warn("Tried to make Voronoi cell for point that already had a cell");
			return point.vorCell;
		}
		let cell = new VorCell(point);
		point.vorCell = cell;
		// point.sortEdges(); // Probably not necessary?
		for (let edge of point.edges) {
			if (edge.triangle1 == null || edge.triangle2 == null) {
				point.vorCell = null;
				return null;
			}
		}
		for (let edge of point.edges) {
			if (edge.vorEdge !== undefined) {
				cell.addEdge(edge.vorEdge);
			} else {
				cell.addEdge(VorEdge.fromTriEdge(edge));
			}
		}
		cell.sortVerts();
		return cell;
	}

	addEdge(edge: VorEdge | null): void {
		if (edge == null) {
			this.isComplete = false;
			return;
		}
		this.edges.push(edge);
		if (this.verts.indexOf(edge.vert1) === -1)
			this.verts.push(edge.vert1);
		if (this.verts.indexOf(edge.vert2) === -1)
			this.verts.push(edge.vert2);
		edge.addCell(this);
	}

	sortVerts(): void {
		if (this.point == null) {
			console.warn("Tried to sort voronoi verts without TriPoint");
			return;
		}
		let center = this.point;
		this.verts.sort((a, b)=>{
			// blatantly copied from stackoverflow
			// https://stackoverflow.com/a/6989383
			// also inverted so that edges go in ccw order instead of cw
			// it should be ccw, I think, at least. idk
			if (a.x - center.x >= 0 && b.x - center.x < 0)
				return 1;
			if (a.x - center.x < 0 && b.x - center.x >= 0)
				return -1;
			if (a.x - center.x == 0 && b.x - center.x == 0) {
				if (a.y - center.y >= 0 || b.y - center.y >= 0)
					return a.y - b.y;
				return b.y - a.y;
			}

			// compute the cross product of vectors (center -> a) x (center -> b)
			let det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
			return -det;
		});
	}

	getCentroid(): Vec2 {
		if (this.centroid != null) {
			return this.centroid;
		}
		let centroid = new Vec2(0, 0);
		let signedArea = 0;
		for (let i = 0; i < this.verts.length; i++) {
			let x1 = this.verts[i].x;
			let y1 = this.verts[i].y;
			let x2: number, y2: number;
			if (i === this.verts.length-1) {
				x2 = this.verts[0].x;
				y2 = this.verts[0].y;				
			} else {
				x2 = this.verts[i+1].x;
				y2 = this.verts[i+1].y;
			}
			let a = x1*y2 - x2*y1;
			signedArea += a;
			centroid.x += (x1+x2)*a;
			centroid.y += (y1+y2)*a;
		}
		signedArea *= 0.5;
		centroid.x /= (6*signedArea);
		centroid.y /= (6*signedArea);

		this.centroid = centroid;
		return centroid;
	}
}

export class TriPoint extends Vec2 {
	edges: TriEdge[] = [];
	vorCell?: VorCell | null;
	static of(point: Vec2): TriPoint {
		return new TriPoint(point.x, point.y);
	}
	sortEdges(): void {
		this.edges.sort((edgeA, edgeB)=>{
			// blatantly copied from stackoverflow
			// https://stackoverflow.com/a/6989383
			// also inverted so that edges go in ccw order instead of cw
			// it should be ccw, I think, at least. idk
			let a = edgeA.vert1 == this ? edgeA.vert2 : edgeA.vert1;
			let b = edgeB.vert1 == this ? edgeB.vert2 : edgeB.vert1;
			if (a.x - this.x >= 0 && b.x - this.x < 0)
				return 1;
			if (a.x - this.x < 0 && b.x - this.x >= 0)
				return -1;
			if (a.x - this.x == 0 && b.x - this.x == 0) {
				if (a.y - this.y >= 0 || b.y - this.y >= 0)
					return a.y - b.y;
				return b.y - a.y;
			}

			// compute the cross product of vectors (center -> a) x (center -> b)
			let det = (a.x - this.x) * (b.y - this.y) - (b.x - this.x) * (a.y - this.y);
			return -det;
		});
	}
}

export class TriEdge {
	triangle1?: Triangle | null;
	triangle2?: Triangle | null;
	vorEdge?: VorEdge | null;

	private constructor(public vert1: TriPoint, public vert2: TriPoint) {
		vert1.edges.push(this);
		vert2.edges.push(this);
	}

	static of(vert1: TriPoint, vert2: TriPoint): TriEdge {
		// If we used numerical ids we could have a dict instead of doing this check - would it be worth it?
		for (let edge of vert1.edges) {
			if (edge.vert1 === vert1 && edge.vert2 === vert2
					|| edge.vert1 === vert2 && edge.vert2 === vert1) {
				return edge;
			}
		}
		return new TriEdge(vert1, vert2);
	}

	/**
	 * Does *not* handle removal of triangles, so this should only be called by Triangle.
	 */
	destroy(): void {
		let ind = this.vert1.edges.indexOf(this);
		if (ind !== -1) this.vert1.edges.splice(ind, 1);
		ind = this.vert2.edges.indexOf(this);
		if (ind !== -1) this.vert2.edges.splice(ind, 1);
	}

	addTriangle(triangle: Triangle): void {
		if (this.triangle1 == null) {
			this.triangle1 = triangle; return;
		} else if (this.triangle2 == null) {
			this.triangle2 = triangle; return;
		} else {
			throw new Error("edge with three triangles");
		}
	}

	removeTriangle(triangle: Triangle): void {
		if (triangle == this.triangle1) {
			this.triangle1 = this.triangle2;
			this.triangle2 = null;
		} else if (triangle == this.triangle2) {
			this.triangle2 = null;
		} else {
			console.warn("Tried to remove triangle that isn't on edge");
		}
	}
}

export class Triangle {
	vorPoint?: VorPoint;
	constructor(public vert1: TriPoint, public vert2: TriPoint, public vert3: TriPoint,
		public edge1: TriEdge, public edge2: TriEdge, public edge3: TriEdge) {
		// force counterclockwise triangle
		// TODO doesn't seem to work?
		// if ((this.vert2.x - this.vert1.x)
		//    *(this.vert3.y - this.vert1.y)
		//    -(this.vert3.x - this.vert1.x)
		//    *(this.vert2.y - this.vert1.y) <= 0) {
		// 	this.vert2, this.vert3 = this.vert3, this.vert2;
		// }
		edge1.addTriangle(this);
		edge2.addTriangle(this);
		edge3.addTriangle(this);
	}

	destroy(): void {
		let edges = [this.edge1, this.edge2, this.edge3];
		for (let edge of edges) {
			edge.removeTriangle(this);
			if (edge.triangle1 == null) {
				edge.destroy();
			}
		}
	}

	circumcenter(): Vec2 {
		let [ax, ay] = [this.vert1.x, this.vert1.y];
		let [bx, by] = [this.vert2.x, this.vert2.y];
		let [cx, cy] = [this.vert3.x, this.vert3.y];
		let D = 2 * (ax*(by-cy) + bx*(cy-ay) + cx*(ay-by));
		let ad = ax*ax + ay*ay;
		let bd = bx*bx + by*by;
		let cd = cx*cx + cy*cy;
		let x = (ad*(by-cy) + bd*(cy-ay) + cd*(ay-by))/D;
		let y =-(ad*(bx-cx) + bd*(cx-ax) + cd*(ax-bx))/D;
		return new Vec2(x, y);
	}
}

export class DelaunayTriangulator {
	static doTriangulation(points: TriPoint[],
			startX: number, startY: number, endX: number, endY: number): Triangle[] {
		let outerPoints = [
			new TriPoint(startX-1, startY-1),
			new TriPoint(4*endX-3*startX+1, startY-1),
			new TriPoint(startX-1, 4*endY-3*startY+1)
		];
		let outerEdges = [
			TriEdge.of(outerPoints[1], outerPoints[2]),
			TriEdge.of(outerPoints[2], outerPoints[0]),
			TriEdge.of(outerPoints[0], outerPoints[1])
		];
		let baseTriangle = new Triangle(
			outerPoints[0], outerPoints[1], outerPoints[2], outerEdges[0], outerEdges[1], outerEdges[2]);
		let triangles = [baseTriangle];
		for (let point of points) {
			this.retriangulate(triangles, point);
		}
		return triangles; // TODO remove base triangle?
	}

	static retriangulate(triangles: Triangle[], point: TriPoint): void {
		let badTriangles = this.findInvalidatedTriangles(triangles, point);
		let polygonHole = this.makePolygonHole(badTriangles);
		for (let triangle of badTriangles) {
			triangles.splice(triangles.indexOf(triangle), 1);
			triangle.destroy();
		}
		this.fillPolygonHole(triangles, point, polygonHole);
	}

	static pointInCircumcircle(triangle: Triangle, point: Vec2): boolean {
		// black magic
		// assumes that triangle points are listed in counterclockwise order.
		// commented out because it doesn't actually seem to work :shrug:
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

	static findInvalidatedTriangles(triangles: Triangle[], point: Vec2): Triangle[] {
		let badTriangles: Triangle[] = [];
		for (let triangle of triangles) {
			if (this.pointInCircumcircle(triangle, point)) {
				badTriangles.push(triangle);
			}
		}
		return badTriangles;
	}

	static makePolygonHole(badTriangles: Triangle[]): TriEdge[] {
		let polygonHole: TriEdge[] = [];
		for (let triangle of badTriangles) {
			let edges = [triangle.edge1, triangle.edge2, triangle.edge3];
			for (let edge of edges) {
				let sharedEdge = false;
				for (let triangle2 of badTriangles) {
					if (triangle !== triangle2) {
						if (triangle2.edge1 === edge
						 || triangle2.edge2 === edge
						 || triangle2.edge3 === edge) {
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
		return polygonHole;
	}

	static fillPolygonHole(triangles: Triangle[], point: TriPoint, polygonHole: TriEdge[]) {
		for (let edge of polygonHole) {
			let triangle = new Triangle(edge.vert1, edge.vert2, point,
				TriEdge.of(point, edge.vert2), TriEdge.of(point, edge.vert1), edge);
			triangles.push(triangle);
		}
	}
}

export class VoronoiWorldCell {
	points: Vec2[][] = [[]];
	cells?: VorCell[];
	allOverlappingCells?: VorCell[];

	constructor(x: number, y: number, numPoints: number) {
		// FIXME remove debugging seeding, and do it properly
		let rand = seedrandom.alea("a"+x+","+y);
		for (let i = 0; i < numPoints; i++) {
			// TODO seeded random
			let pointX = x+rand.double();
			let pointY = y+rand.double();
			this.points[0].push(new Vec2(pointX, pointY));
		}
	}
}

export class VoronoiWorldMap {
	pointsPerCell: number = 5;
	relaxations: number = 2;
	grid: Map<string, VoronoiWorldCell> = new Map<string, VoronoiWorldCell>();

	private neighbors(x: number, y: number): number[][] {
		return [
			[x-1, y-1],
			[x-1, y],
			[x-1, y+1],
			[x, y-1],
			[x, y+1],
			[x+1, y-1],
			[x+1, y],
			[x+1, y+1]
		];
	}

	getCells(x: number, y: number): VorCell[] {
		let worldCell = this.getWorldCell(x, y);
		if (worldCell.cells != null) return worldCell.cells;

		// console.log("getting cells at " + x + ", " + y);
		
		let allCells = this.getCellsWithRelaxations(x, y, this.relaxations);
		let allNeighborCells: VorCell[] = [];
		// want an identityset here too, in java.
		let allNeighborCellsSet = new Set<VorCell>();
		for (let neighbor of this.neighbors(x, y)) {
			let neighborWorldCell = this.getWorldCell(neighbor[0], neighbor[1]);
			if (neighborWorldCell.allOverlappingCells != null) {
				allNeighborCells.push(...neighborWorldCell.allOverlappingCells);
				// console.log("adding neighbor cells at " + neighbor[0] + ", " + neighbor[1]);
			}
		}

		// Various processing to merge the two graphs together. Lots of room for optimization

		// let processedCells = new Set<VorCell>(); // shouldn't need this, they should all be unique anyway
		// when porting java, do Set.fromMap(IdentityHashMap) or whatever
		let processedNeighborVerts = new Set<VorPoint>();

		// remember to use IdentityHashMap when porting to java!
		let cellsRemap = new Map<VorCell, VorCell>();
		let edgesRemap = new Map<VorEdge, VorEdge>();
		let vertsRemap = new Map<VorPoint, VorPoint>();

		// let cellsToRemap: VorCell[] = [];
		let edgesToRemap: VorEdge[] = [];
		let vertsToRemap: VorPoint[] = [];

		let allCellsOut: VorCell[] = [];
		let withinWorldCellOut: VorCell[] = [];

		for (let cell of allCells) {
			let foundMatch = false;
			let addedCell = cell;
			let processedNeighborCells = new Set<VorCell>();
			for (let neighborCell of allNeighborCells) {
				// TODO this is a stupid way of removing duplicates
				// if (processedNeighborCells.has(neighborCell)) {
				// 	continue;
				// }
				// processedNeighborCells.add(neighborCell);
				if (cell.getCentroid().equals(neighborCell.getCentroid())) {
					addedCell = neighborCell;
					cellsRemap.set(cell, neighborCell);
					// cellsToRemap.push(neighborCell);
					foundMatch = true;
				}
					for (let vert of cell.verts) {
						for (let vert2 of neighborCell.verts) {
							if (vert.equals(vert2)) {
								vertsRemap.set(vert, vert2);
								if (processedNeighborVerts.has(vert2)) {
									break;
								}
								processedNeighborVerts.add(vert2);
								let edgesAdded = false;
								for (let edge of vert.edges) {
									if (vert2.edges.indexOf(edge) === -1) {
										vert2.edges.push(edge);
										edgesAdded = true;
									}
								}
								if (edgesAdded) {
									vertsToRemap.push(vert2);
								}
								break;
							}
						}
					}
					for (let edge of cell.edges) {
						for (let edge2 of neighborCell.edges) {
							let equal = edge.vert1.equals(edge2.vert2) && edge.vert2.equals(edge2.vert1);
							if (equal) {
								edge.vert1, edge.vert2 = edge.vert2, edge.vert1;
							}
							equal = equal || edge.vert1.equals(edge2.vert1) && edge.vert2.equals(edge2.vert2);
							if (equal) {
								edgesRemap.set(edge, edge2);
								if (edge2.cell2 == null/* && (edge.cell1 != edge2.cell1 || edge.cell2 != null)*/) {
									if (edge.cell1 === edge2.cell1) {
										edge2.cell2 = edge.cell2;
									} else {
										edge2.cell2 = edge.cell1;
									}
									edgesToRemap.push(edge2);
								}
								break;
							}
						}
					}

					// break;
				// }
			}
			// if (!foundMatch) {
				// cellsToRemap.push(cell);
			// }
			allCellsOut.push(addedCell);
			if (addedCell.getCentroid().inArea(x, y, x+1, y+1)) {
				withinWorldCellOut.push(addedCell);
			}
		}

		for (let cell of allCellsOut) {
			for (let i = 0; i < cell.verts.length; i++) {
				let vert = cell.verts[i];
				if (vertsRemap.has(vert)) {
					cell.verts[i] = <VorPoint> vertsRemap.get(vert);
				}
			}
			for (let i = 0; i < cell.edges.length; i++) {
				let edge = cell.edges[i];
				if (edgesRemap.has(edge)) {
					cell.edges[i] = <VorEdge> edgesRemap.get(edge);
				}
			}
		}

		for (let edge of edgesToRemap) {
			if (edge.cell1 != null && cellsRemap.has(edge.cell1)) {
				edge.cell1 = cellsRemap.get(edge.cell1);
			}
			if (edge.cell2 != null && cellsRemap.has(edge.cell2)) {
				edge.cell2 = cellsRemap.get(edge.cell2);
			}
			if (vertsRemap.has(edge.vert1)) {
				edge.vert1 = <VorPoint> vertsRemap.get(edge.vert1);
			}
			if (vertsRemap.has(edge.vert2)) {
				edge.vert2 = <VorPoint> vertsRemap.get(edge.vert2);
			}
		}

		for (let vert of vertsToRemap) {
			for (let i = 0; i < vert.edges.length; i++) {
				let edge = vert.edges[i];
				if (edgesRemap.has(edge)) {
					vert.edges[i] = <VorEdge> edgesRemap.get(edge);
				}
			}
		}

		worldCell.allOverlappingCells = allCellsOut;
		worldCell.cells = withinWorldCellOut;

		// FIXME remove debug
		for (let cell of withinWorldCellOut) {
			cell.color = Math.floor(Math.random()*0x1000000);
			for (let edge of cell.edges) {
				if (edge.color == null) {
					edge.color = Math.floor(Math.random()*0x1000000);
				}
			}
		}
		// return allCellsOut; //debug
		return withinWorldCellOut;
	}

	private getPointsWithRelaxations(
			x1: number, y1: number, x2: number, y2: number, relaxations: number): Vec2[] {
		// let worldCells = [];
		let points: Vec2[] = [];
		for (let x = x1; x <= x2; x++) {
			for (let y = y1; y <= y2; y++) {
				let worldCell = this.getWorldCell(x, y);
				if (worldCell.points.length < relaxations+1) {
					// TODO do we want to optimize this by doing an area instead of one cell?
					let cells = this.getCellsWithRelaxations(x, y, relaxations-1);
					let cellPoints = [];
					for (let cell of cells) {
						let centroid = cell.getCentroid();
						if (centroid.x >= x && centroid.y >= y && centroid.x < x+1 && centroid.y < y+1)
								cellPoints.push(cell.getCentroid());
					}
					worldCell.points.push(cellPoints);
					points.push(...cellPoints);
				} else {
					points.push(...worldCell.points[relaxations]);
				}
			}
		}
		return points;
	}

	private getCellsWithRelaxations(x: number, y: number, relaxations: number): VorCell[] {
		let points = this.getPointsWithRelaxations(x-2, y-2, x+2, y+2, relaxations);
		let triPoints = [];
		for (let point of points) {
			triPoints.push(TriPoint.of(point));
		}
		let triangles = DelaunayTriangulator.doTriangulation(triPoints, x-2, y-2, x+2, y+2);
		let cells = [];
		for (let point of triPoints) {
			let cell = VorCell.fromTriPoint(point);
			if (cell != null) {
				cells.push(cell);
			}
		}
		let allOverlappingCells = [];
		// check if rectangle around polygon is within, to prevent missing slightly overlapping polys
		for (let cell of cells) {
			let xWithin = false, yWithin = false;
			for (let vert of cell.verts) {
				if (vert.x >= x && vert.x <= x+1) {
					xWithin = true;
				}
				if (vert.y >= y && vert.y <= y+1) {
					yWithin = true;
				}
				if (xWithin && yWithin) {
					allOverlappingCells.push(cell);
					break;
				}
			}
		}
		return allOverlappingCells;
	}

	private getWorldCell(x: number, y: number): VoronoiWorldCell {
		// when switching to java, use immutable Vec2i as key instead
		let key = x+","+y;
		if (this.grid.has(key)) {
			return <VoronoiWorldCell> this.grid.get(key);
		}
		let cell = new VoronoiWorldCell(x, y, this.pointsPerCell);
		this.grid.set(key, cell);
		return cell;
	}
}