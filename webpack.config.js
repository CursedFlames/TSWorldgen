const WrapperPlugin = require('wrapper-webpack-plugin');
const path = require('path');
// const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
	entry: {
		"main": "./build/main.js",
		"voronoi": "./build/voronoi_main.js"
	},
	output: {
		path: __dirname + "/build",
		filename: "_bundle.[name].js"
	},
	mode: "production",
	optimization: {
		minimize: false,
		namedModules: true,
		namedChunks: true
	},
	performance: {
		maxEntrypointSize: 400000,
		maxAssetSize: 400000
	},
	resolve: {
		modules: [
			path.resolve("./build"),
			// path.resolve("./rot.js/dist"),
			path.resolve("./node_modules")
		],
		alias: {
			"three-examples": path.join(__dirname, "./node_modules/three/examples/js")
		}
	},
	plugins: [
		// new CircularDependencyPlugin({
		// 	// exclude detection of files based on a RegExp
		// 	exclude: /node_modules/,
		// 	// add errors to webpack instead of warnings
		// 	// failOnError: true,
		// 	// set the current working directory for displaying module paths
		// 	cwd: process.cwd(),
		// }),
// 		new WrapperPlugin({
// 			test: /\.js$/,
// 			header: `/** Original source code available at [TODO put github link here] */
// `,
// 			footer: ''
// 		})
	],
	module: {
		rules: [
			{
				test: /three\/examples\/js/,
				use: "imports-loader?THREE=three"
			}
				//left this here commented out because I'm too lazy to google documentation when I need this again
			// {
			// 	test: /\.js$/,
			// 	loader: "string-replace-loader",
			// 	options: {
			// 		search: ``,
			// 		replace: ``
			// 	}
			// }
		]
	}
};