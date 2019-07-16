import { Color } from "three";

interface WorldgenData {
    width: number;
    height: number;
    heightmap: number[][];
    colormap: Color[][];
}

class Board {
    heightmap: number[][];
    constructor(public width: number, public height: number) {
        for (let y = 0; y < height; y++) {
            let row = [];
            for (let x = 0; x < width; x++) {
                row.push(0);
            }
            this.heightmap.push(row);
        }
    }
}