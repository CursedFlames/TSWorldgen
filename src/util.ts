

/**
 * Apply a particular unary operation to all numbers in a 2d array. Mutates the array.
 * @param nums 
 * @param op unary operation
 */
export function unaryOp2d(nums: number[][], op: (n: number)=>number): number[][] {
	for (let x = 0; x < nums.length; x++) {
		let col = nums[x];
		for (let y = 0; y < col.length; y++) {
			col[y] = op(col[y]);
		}
	}
	return nums;
}
/**
 * Constrain the values of a 2d array using a minimum and/or maximum. Mutates the input array.
 * @param nums 2d array to constrain
 * @param minmax object containing `min` and/or `max` parameters.
 */
export function constrain2d(nums: number[][], minmax?: {min?: number, max?: number}): number[][] {
	if (minmax == null || (minmax.min == null && minmax.max == null)) {
		return nums;
	}
	let min: (n: number) => number = 
			typeof minmax.min === "number" ? (n=>Math.max(n, <any>minmax.min)) : (n=>n);
	let max: (n: number) => number = 
			typeof minmax.max === "number" ? (n=>Math.min(n, <any>minmax.max)) : (n=>n);
	let mm = (n: number) => min(max(n));
	return unaryOp2d(nums, mm);
}
/**
 * Evaluate a particular binary operation for all numbers in a pair of 2d arrays.
 * Mutates the first array and returns it.
 * @param a first array
 * @param b second array. it is assumed that this array is not smaller than `a`.
 * @param op binary operation
 */
export function binaryOp2d(a: number[][], b: number[][], op: (a: number, b: number)=>number): number[][] {
	for (let x = 0; x < a.length; x++) {
		let col1 = a[x];
		let col2 = b[x]
		for (let y = 0; y < col1.length; y++) {
			col1[y] = op(col1[y], col2[y]);
		}
	}
	return a;
}

/**
 * Evaluate a particular operation for all numbers in arbitrarily many 2d arrays.
 * Mutates the first array and returns it.
 * @param op operation
 * @param target 2d array that will be mutated
 * @param args other 2d arrays
 */
export function polyOp2d(op: (...args: number[])=>number, target: number[][], ...args: number[][][]) {
	console.log(args);
	for (let x = 0; x < target.length; x++) {
		let col1 = target[x];
		let colRest: number[][] = [];
		for (let i = 0; i < args.length; i++) {
			colRest.push(args[i][x]);
		}
		for (let y = 0; y < col1.length; y++) {
			let rest: number[] = [];
			for (let i = 0; i < colRest.length; i++) {
				rest.push(colRest[i][y]);
			}
			col1[y] = op(col1[y], ...rest);
		}
	}
	return target;
}