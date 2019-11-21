import { constrain2d, unaryOp2d, binaryOp2d, polyOp2d } from "src/util";

import { Color } from "three";
import OpenSimplexNoise from 'open-simplex-noise';
import * as FractalNoise from "fractal-noise";
import * as seedrandom from "seedrandom";

interface WorldgenData {
	width: number;
	height: number;
	heightmap: number[][];
	colormap: Color[][];
}

const snow = new Color(0xEEEEEE);
const grass = new Color(0x30EA17);
const seafloor = new Color(0x333015);

function getColor(height: number): Color {
	if (height < 0) {
		return seafloor.clone().lerpHSL(grass, Math.min(1, Math.max(0, height+1)));
	}
	return grass.clone().lerpHSL(snow, Math.min(1, Math.pow(Math.max(0, height), 1.5)))
}

const conf = {
	base: 0,
	oceanActivator: {
		frequency: 0.004,
		octaves: 4,
		amplitude: 5,
		offset: 0.5,
		min: 0,
		max: 1,
		pow: 3
	},
	oceanOffset: {
		frequency: 0.007,
		octaves: 5,
		amplitude: 64,
		offset: -64 // average ocean floor IRL is apparently around 3.6-4k so this should be 250ish really
	},
	baseHeight: {
		frequency: 0.005,
		octaves: 8,
		amplitude: 16,
		persistence: 0.4,
		offset: 6
	},
	heightMultiplier: {

	},
	ridged: {
		frequency: 0.112,
		amplitude: 3,
		octaves: 5,
		offset: 2,
		min: 0,
		pow: 0.8

	},
	nonRidged: {
		frequency: 0.112,
		amplitude: 3,
		offset: 3,
		octaves: 5
	},
	ridgeLerp: {
		frequency: 0.07,
		amplitude: 1,
		octaves: 4,
		offset: 0.5,
		pow: 2,
		min: 0,
		max: 1
	},
	heat: {
		bandMax: 27,
		bandMin: -4
	}
};

export class Board {
	heightmap: number[][] = [];
	colormap: Color[][] = [];
	random: seedrandom.prng = new (<any>seedrandom)(this.seed);
	noises = {
		// oceanActivator: new OpenSimplexNoise(this.random.int32()),
		// oceanOffset: new OpenSimplexNoise(this.random.int32()),
		// baseHeightmap: new OpenSimplexNoise(this.random.int32()),
		// ridged: new OpenSimplexNoise(this.random.int32()),
		// nonRidged: new OpenSimplexNoise(this.random.int32()),
		// ridgeLerp: new OpenSimplexNoise(this.random.int32())
		continentBase: new OpenSimplexNoise(this.random.int32())
	};
	genHeightmap() {
		let noise = (noise: OpenSimplexNoise,
			         opts: FractalNoise.Options): number[][] => <any>FractalNoise.makeRectangle(
			this.width, this.height, (x,y)=>noise.noise2D(x,y), opts
		);
		let ridgedNoise = (noise: OpenSimplexNoise,
		                   opts: FractalNoise.Options): number[][] => <any>FractalNoise.makeRectangle(
			this.width, this.height, (x,y)=>2*(0.5-Math.abs(noise.noise2D(x,y))), opts
		);
		let offset = (a: number[][], b: number)=>unaryOp2d(a, c=>c+b);
		let scale = (a: number[][], b: number)=>unaryOp2d(a, c=>c*b);
		let pow = (a: number[][], b: number)=>unaryOp2d(a, c=>Math.pow(c, b));
		let powAbsMulSign = (a: number[][], b: number)=>unaryOp2d(a, c=>Math.sign(c)*Math.pow(Math.abs(c), b));
		let lerp = (a: number[][], b: number[][], c: number[][])=>polyOp2d((d, e, f)=>{
			d = Math.min(1, Math.max(0, d));
			return d*f+(1-d)*e;
		}, a, b, c);
		let add = (a: number[][], b: number[][])=>binaryOp2d(a,b,(a,b)=>a+b);
		let mul = (a: number[][], b: number[][])=>binaryOp2d(a,b,(a,b)=>a*b);

		// let oceanActivator = noise(this.noises.oceanActivator, conf.oceanActivator);
		// offset(oceanActivator, conf.oceanActivator.offset);
		// constrain2d(oceanActivator, conf.oceanActivator);
		// pow(oceanActivator, conf.oceanActivator.pow);

		// let oceanOffset = noise(this.noises.oceanOffset, conf.oceanOffset);
		// offset(oceanOffset, conf.oceanOffset.offset);
		// mul(oceanOffset, oceanActivator);

		// let baseHeightmap = noise(this.noises.baseHeightmap, conf.baseHeight);
		// offset(baseHeightmap, conf.baseHeight.offset);

		// let ridgeLerp = noise(this.noises.ridgeLerp, conf.ridgeLerp);
		// constrain2d(ridgeLerp, {min: conf.ridgeLerp.min});
		// pow(ridgeLerp, conf.ridgeLerp.pow);
		// constrain2d(ridgeLerp, {max: conf.ridgeLerp.max});
		// let nonRidged = noise(this.noises.nonRidged, conf.nonRidged);
		// let ridged = ridgedNoise(this.noises.nonRidged, conf.nonRidged);
		// constrain2d(ridged, conf.ridged);
		// pow(ridged, conf.ridged.pow);
		// lerp(ridgeLerp, nonRidged, ridged);

		// this.heightmap = oceanOffset;
		// add(this.heightmap, baseHeightmap);
		// add(this.heightmap, ridgeLerp);
		// offset(this.heightmap, conf.base);

		let continentBase = noise(this.noises.continentBase, {
			frequency: 0.00025*16,
			amplitude: 1, // used as modifier, so we don't need amplitude
			octaves: 5,
			persistence: 0.6
		});
		// for (let i = 0; i < this.width; i++) {
		// 	for (let j = 0; j < this.width; j++) {
		// 		continentBase[j][i] = 2*(i/this.width)-1;
		// 	}
		// }
		scale(continentBase, 1/0.7); //because this noise lib doesn't feel like normalizing correctly, apparently
		constrain2d(continentBase, {min: -1, max: 1}); // in case the fractal noise library does this wrong
		powAbsMulSign(continentBase, 1.3);
		unaryOp2d(continentBase, n=>{
			return 1/(1+Math.exp(10*(-0.3-n))) + 1/(1+Math.exp(15*(0.8-n))) - 1;
		});
		constrain2d(continentBase, {min: -1, max: 1}); // just in case. should be within (-1, 1) already
		offset(continentBase, 0.01); // for testing this by itself
		scale(continentBase, 32);
		this.heightmap = continentBase;
	}
	constructor(private seed: string, public width: number, public height: number) {
		this.genHeightmap();
		for (let x = 0; x < width; x++) {
			let col = [];
			for (let y = 0; y < height; y++) {
				col.push(getColor(this.heightmap[x][y]/20));
			}
			this.colormap.push(col);
		}
	}
}