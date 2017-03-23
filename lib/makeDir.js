
var	fs				= require('fs'),
	path			= require('path');

function dirCheck (loggerName, pos, dirName) {
	var stats = null;
	
	try {
		stats = fs.statSync(dirName);
		console.log("[Logger] (" + loggerName + ")[" + pos + "] - [" + dirName + "] Check direcoty  ==> " + stats.isDirectory());
		
		if (!stats.isDirectory()) {
			throw new Error(dirName + "is not Directory");
		}
	}
	catch (err) {
		if (err.code === "ENOENT") {
			console.log("[Logger] (" + loggerName + ")[" + pos + "] - [" + dirName + "] Created");
			fs.mkdirSync(err.path, 0755);
		}
		else {
			throw err;
		}
	}
}

function makeAbsolutePath(loggerName, dirName) {
	var dirFullPath = "",
		dirList = path.resolve(dirName).split(path.sep),
		last = dirList.length;
	
	dirList[0] += path.sep;
	console.log("[Logger] (" + loggerName + ") Full path ==> " + dirName + ", Absolute Path ==> " + path.resolve(dirName));
	
	(function run(pos) {
		if (pos === last) {
			return;
		}
		else {
			dirFullPath = path.join(dirFullPath, dirList[pos]);
			
			dirCheck(loggerName, pos, dirFullPath);
			return run(++pos);
		}
	})(0);
	
	return dirFullPath;
}

module.exports = makeAbsolutePath;