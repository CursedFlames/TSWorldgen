

export class Vec2 {
	constructor(public x: number, public y: number) {}
}

export class VorPoint extends Vec2 {
	edges: VorEdge[] = [];
	// TODO do we want a ref to the Triangle here?
	// static of(point: Vec2): VorPoint {
	// 	return new VorPoint(point.x, point.y);
	// }
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
	// TODO do we want a ref to the TriEdge here?

	private constructor(public vert1: VorPoint, public vert2: VorPoint) {
		vert1.edges.push(this);
		vert2.edges.push(this);
	}

	// static of(vert1: VorPoint, vert2: VorPoint): VorEdge {
	// 	// If we used numerical ids we could have a dict instead of doing this check - would it be worth it?
	// 	for (let edge of vert1.edges) {
	// 		if (edge.vert1 === vert1 && edge.vert2 === vert2
	// 				|| edge.vert1 === vert2 && edge.vert2 === vert1) {
	// 			return edge;
	// 		}
	// 	}
	// 	return new VorEdge(vert1, vert2);
	// }

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

	// /**
	//  * Does *not* handle removal of cells, so this should only be called by VorCell.
	//  */
	// destroy(): void {
	// 	let ind = this.vert1.edges.indexOf(this);
	// 	if (ind !== -1) this.vert1.edges.splice(ind, 1);
	// 	ind = this.vert2.edges.indexOf(this);
	// 	if (ind !== -1) this.vert2.edges.splice(ind, 1);
	// }

	addCell(cell: VorCell): void {
		if (this.cell1 == null) {
			this.cell1 = cell; return;
		} else if (this.cell2 == null) {
			this.cell2 = cell; return;
		} else {
			throw new Error("edge with three cells");
		}
	}
	// Probably don't need this?
	// removeCell(cell: VorCell): void {
	// 	if (cell == this.cell1) {
	// 		this.cell1 = this.cell2;
	// 		this.cell2 = null;
	// 	} else if (cell == this.cell2) {
	// 		this.cell2 = null;
	// 	} else {
	// 		console.warn("Tried to cell triangle that isn't on edge");
	// 	}
	// }
}

export class VorCell {
	edges: VorEdge[] = [];
	verts: VorPoint[] = [];
	isComplete: boolean = true;
	private constructor(public point?: TriPoint) {}
	static fromTriPoint(point: TriPoint): VorCell | null {
		if (point.vorCell !== undefined) {
			console.warn("Tried to make Voronoi cell for point that already had a cell");
			return point.vorCell;
		}
		let cell = new VorCell(point);
		point.vorCell = cell;
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
}

export class TriPoint extends Vec2 {
	edges: TriEdge[] = [];
	vorCell?: VorCell | null;
	static of(point: Vec2): TriPoint {
		return new TriPoint(point.x, point.y);
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
		if ((this.vert2.x - this.vert1.x)
		   *(this.vert3.y - this.vert1.y)
		   -(this.vert3.x - this.vert1.x)
		   *(this.vert2.y - this.vert1.y) <= 0) {
			this.vert2, this.vert3 = this.vert3, this.vert2;
		}
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
	doTriangulation(points: TriPoint[], startX: number, startY: number, endX: number, endY: number): Triangle[] {
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

	retriangulate(triangles: Triangle[], point: TriPoint): void {
		let badTriangles = this.findInvalidatedTriangles(triangles, point);
		let polygonHole = this.makePolygonHole(badTriangles);
		for (let triangle of badTriangles) {
			triangles.splice(triangles.indexOf(triangle), 1);
			triangle.destroy();
		}
		this.fillPolygonHole(triangles, point, polygonHole);
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

	findInvalidatedTriangles(triangles: Triangle[], point: Vec2): Triangle[] {
		let badTriangles: Triangle[] = [];
		for (let triangle of triangles) {
			if (this.pointInCircumcircle(triangle, point)) {
				badTriangles.push(triangle);
			}
		}
		return badTriangles;
	}

	makePolygonHole(badTriangles: Triangle[]): TriEdge[] {
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

	fillPolygonHole(triangles: Triangle[], point: TriPoint, polygonHole: TriEdge[]) {
		for (let edge of polygonHole) {
			let triangle = new Triangle(edge.vert1, edge.vert2, point,
				TriEdge.of(point, edge.vert2), TriEdge.of(point, edge.vert1), edge);
			triangles.push(triangle);
		}
	}
}