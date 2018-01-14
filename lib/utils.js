/* jshint -W097 */
// jshint strict:true
/*jslint node: true */
/*jslint esversion: 6 */
'use strict';

const fs = require('fs');
const path = require('path');

let controllerDir;
let appName;

function getAppName() {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 2].split('.')[0];
}

/**
 * @param {boolean} isInstall
 * @returns {string}
 */
function getControllerDir(isInstall) {
	// Find the js-controller location
	const possibilities = [
		'iobroker.js-controller',
		'ioBroker.js-controller',
    ];
    /** @type {string} */
	let controllerPath;
	for (const pkg of possibilities) {
		try {
			const possiblePath = require.resolve(pkg);
			if (fs.existsSync(possiblePath)) {
				controllerPath = possiblePath;
				break;
			}
		} catch (e) { /* not found */ }
	}
	if (controllerPath == null) {
		if (!isInstall) {
			console.log('Cannot find js-controller');
			process.exit(10);
		} else {
			process.exit();
		}
	}
	// we found the controller
	return path.dirname(controllerPath);
}

// Read controller configuration file
function getConfig() {
    let configPath;
    if (fs.existsSync(
        configPath = path.join(controllerDir, 'conf', appName + '.json')
    )) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(
        configPath = path.join(controllerDir, 'conf', + appName.toLowerCase() + '.json')
    )) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
        throw new Error('Cannot find ' + controllerDir + '/conf/' + appName + '.json');
    }
}
appName       = getAppName();
controllerDir = getControllerDir(typeof process !== 'undefined' && process.argv && process.argv.indexOf('--install') !== -1);
const adapter = require(path.join(controllerDir, 'lib/adapter.js'));

exports.controllerDir = controllerDir;
exports.getConfig =     getConfig;
exports.Adapter =       adapter;
exports.appName =       appName;
