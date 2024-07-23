"use strict";
var exec = require("child_process").exec;

module.exports = function (callback, options) { 
  var buildScript = __dirname + "\\validate.ps1";
  console.log('Found: ' + buildScript);
  
  var commandScript = "powershell.exe " + "\"" + buildScript + "\" " + options.solution;
  console.log('Starting: ' + commandScript);
  
  return exec(commandScript, function (err, stdout, stderr) {
    if (err !== null) {
    	throw err;
    console.log(stdout);
    callback();
    }else{
    	
    	console.log(stdout);
    	console.log("Solution is clean!");
        callback();
    }
  });
};
