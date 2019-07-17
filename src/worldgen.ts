import { Color } from "three";
import OpenSimplexNoise from 'open-simplex-noise';
import * as FractalNoise from "fractal-noise";

const noise = new OpenSimplexNoise(Date.now());

interface WorldgenData {
	width: number;
	height: number;
	heightmap: number[][];
	colormap: Color[][];
}

const snow = new Color(0xEEEEEE);
const grass = new Color(0x22AA11);

export class Board {
	heightmap: number[][] = [];
	colormap: Color[][] = [];
	constructor(public width: number, public height: number) {
		this.heightmap = <any>FractalNoise.makeRectangle(width, height, (x,y)=>noise.noise2D(x,y),
				{octaves: 8, persistence: 0.5, frequency: 0.05});
		for (let x = 0; x < width; x++) {
			let col = [];
			for (let y = 0; y < height; y++) {
				col.push(grass.clone().lerpHSL(snow, Math.min(1, Math.pow(Math.max(0, this.heightmap[x][y]), 1.5))));
			}
			this.colormap.push(col);
		}
	}
}