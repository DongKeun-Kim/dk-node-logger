
require('date-utils');

const	LOGGER_LEVELS = {
		"silly" : 0,
		"debug" : 1,
		"verbose" : 2,
		"info" : 3,
		"warn" : 4,
		"error" : 5,
};

var fs				= require('fs'),
	morgan			= require('morgan'),
	winston			= require('winston'),
	moment			= require('moment'),
	urlencode		= require('urlencode'),
	dailyFile		= require('winston-daily-rotate-file'),
	makeDir			= require('./makeDir'),
	middlewares		= {},
	container		= null,
	defaultLogger	= null;


(function init(options){
	container		= new winston.Container({
		level : options.level || 'silly',
		json : options.json || false,
		colorize : options.colorize || false,
		handleExceptions: true,
	});
	
	defaultLogger = container.add('default', {
		transports: [
		             new (winston.transports.Console)({
		            	 	level : options.level || 'silly',
			            	name : 'default-logger',
			             }),
		             ],
			  	});
	
	defaultLogger.level = options.level || 'silly';
})({});
	

function formatSetting (format) {
	return function (options){
		var newLog = format;
		
		newLog = newLog.replace(":msg", options.message);
		newLog = newLog.replace(":level", options.level.toUpperCase());
		newLog = newLog.replace(":time",  options.timestamp());
		return newLog;
	};
}

function makeMiddleware (format, loggerName){
	var compiler = morgan.compile(format);
	
	return function(req, res, next){
		container.get(loggerName).info(urlencode.decode(compiler(morgan, req, res)));
		next();
	};
}

function makeTransports(options, useConsole) {
	var transports = [];
	
	if (useConsole || !options.transport || options.transport === "consonle") {
		transports.push(new (winston.transports.Console)({
				        	 level : options.level,
				        	 colorize : options.colorize || false,
				        	 formatter : formatSetting(options.format),
				        	 timestamp : function(){ 
				        		 return moment().format(options.timestamp || "HH:mm:ss");
				        	 },
				         }));
	}
	
	if (options.transport === "file") {
		transports.push(new dailyFile({
			            	level : options.level,
			            	colorize : options.colorize || false,
			            	json : false,
			            	formatter : formatSetting(options.format),
			            	dirname : makeDir(options.name, options.filePath),
			            	datePattern : options.datePattern,
			            	filename : options.fileName,
			            	timestamp : function() {
			            		return moment().format(options.timestamp || "HH:mm:ss");
			            	},
			            }));
	}
	
	return transports;
}

function setup (){
	var config = null,
		middleware = null,
		logger = null,
		args = null,
		filePath = null,
		options = null;
	
	args = Array.prototype.slice.call(arguments);
	
	filePath = typeof args[0] === 'string' ? args.shift() : null;
	options = typeof args[0] === 'object' ? args.shift() : null;
	
	console.log("[Logger] setup File Path ==> " + filePath);
	console.log("[Logger] setup options ==> " + JSON.stringify(options));
	
	if (filePath) {
		config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		console.log('[Logger] Config ==> ' + JSON.stringify(config));
		
		if (config.loggers && Array.isArray(config.loggers)) {
			for (logger of config.loggers) {
				
				console.log('[Logger] Create Logger ==> ' + JSON.stringify(logger));
				container.add(logger.name, {
					transports: makeTransports(logger, (config.rootLogger === logger.name && process.env.NODE_ENV === "debug") ),
				});
				container.get(logger.name).level = logger.level || 'debug';
			}
		}
		
		if (config.middlewares && Array.isArray(config.middlewares)) {
			for (middleware of config.middlewares) {
				middlewares[middleware.name] = makeMiddleware(middleware.format, middleware.logger);
			}
		}
		
		if (config.rootLogger) {
			defaultLogger = container.get(config.rootLogger);
		}
	}
	
	if (options) {
		init();
	}
	
	return main;
};

var getMiddleware = name => {
	return middlewares[name];
}


function makeFunc(method) {
	return function() {
		var temp = "",
			args = Array.prototype.slice.call(arguments),
			logger = this.name && container.has(this.name) ? container.get(this.name) : defaultLogger;
			
		for (var i = 0 ; i < args.length; i++) {
			if (typeof args[i] === 'object') {
				try {
					temp = args[i].toString();
					if (temp.indexOf("[object Object]") >= 0) {
						temp = JSON.stringify(args[i]);
					}
					
					args[i] = temp;
				}
				catch(e) {
					args[i] = "[Unknown Object]";
				}
			}
		}	
		
		if (logger && LOGGER_LEVELS[method] >= LOGGER_LEVELS[logger.level] && LOGGER_LEVELS[method] >= LOGGER_LEVELS[container.options.level]) {
			logger[method].apply(logger, args);
		}
	};
}


var getLogger = name => {
	var levels = winston.levels,
		logger = Object.create(defaultLogger),
		method = null;
	
	logger.name = name;
	
	for (method in LOGGER_LEVELS) {
		logger[method] = makeFunc( method);
	}
	
	return logger;
}

var main = module.exports = setup;

main.setup = setup;

main.getMiddleware = getMiddleware;

main.getLogger = getLogger;
