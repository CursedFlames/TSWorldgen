

export class Vec2 {
	constructor(public x: number, public y: number) {}
}

export class TriPoint extends Vec2 {
	edges: Edge[] = [];
	static of(point: Vec2): TriPoint {
		return new TriPoint(point.x, point.y);
	}
}

export class Edge {
	triangle1?: Triangle | null;
	triangle2?: Triangle | null;
	private constructor(public vert1: TriPoint, public vert2: TriPoint) {
		vert1.edges.push(this);
		vert2.edges.push(this);
	}

	static of(vert1: TriPoint, vert2: TriPoint): Edge {
		// If we used numerical ids we could have a dict instead of doing this check - would it be worth it?
		for (let edge of vert1.edges) {
			if (edge.vert1 === vert1 && edge.vert2 === vert2
					|| edge.vert1 === vert2 && edge.vert2 === vert1) {
				return edge;
			}
		}
		return new Edge(vert1, vert2);
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
	constructor(public vert1: TriPoint, public vert2: TriPoint, public vert3: TriPoint,
		public edge1: Edge, public edge2: Edge, public edge3: Edge) {
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
	doTriangulation(points: Vec2[], startX: number, startY: number, endX: number, endY: number): Triangle[] {
		let outerPoints = [
			new TriPoint(startX-1, startY-1),
			new TriPoint(4*endX-3*startX+1, startY-1),
			new TriPoint(startX-1, 4*endY-3*startY+1)
		];
		let outerEdges = [
			Edge.of(outerPoints[1], outerPoints[2]),
			Edge.of(outerPoints[2], outerPoints[0]),
			Edge.of(outerPoints[0], outerPoints[1])
		];
		let baseTriangle = new Triangle(
			outerPoints[0], outerPoints[1], outerPoints[2], outerEdges[0], outerEdges[1], outerEdges[2]);
		let triangles = [baseTriangle];
		for (let point of points) {
			this.retriangulate(triangles, TriPoint.of(point));
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

	makePolygonHole(badTriangles: Triangle[]): Edge[] {
		let polygonHole: Edge[] = [];
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

	fillPolygonHole(triangles: Triangle[], point: TriPoint, polygonHole: Edge[]) {
		for (let edge of polygonHole) {
			let triangle = new Triangle(edge.vert1, edge.vert2, point,
				Edge.of(point, edge.vert2), Edge.of(point, edge.vert1), edge);
			triangles.push(triangle);
		}
	}
}