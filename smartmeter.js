/* jshint -W097 */
// jshint strict:true
/*jslint node: true */
/*jslint esversion: 6 */
'use strict';
/**
 *
 * Smartmeter adapter
 *
 * Adapter reading smartmeter data and pushing the values into ioBroker
 *
 */
const Sentry = require('@sentry/node');
const SentryIntegrations = require('@sentry/integrations');
const packageJson = require('./package.json');

const fs = require('fs');
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const SmartmeterObis = require('smartmeter-obis');
let smTransport;
let serialport;

const smValues = {};

let connected = null;
let adapter;

function stopIt(logMessage) {
    setConnected(false);
    adapter.log.error(logMessage);
    adapter.extendForeignObject('system.adapter.' + adapter.namespace, {
        common: {
            enabled: false
        }
    });
    adapter.stop();
}

function setConnected(isConnected) {
    if (connected !== isConnected) {
        connected = isConnected;
        adapter && adapter.setState('info.connection', connected, true, (err) => {
            // analyse if the state could be set (because of permissions)
            if (err && adapter && adapter.log) adapter.log.error('Can not update connected state: ' + err);
            else if (adapter && adapter.log) adapter.log.debug('connected set to ' + connected);
        });
    }
}

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'smartmeter'
    });
    adapter = new utils.Adapter(options);

    adapter.on('ready', () => {
        setConnected(false);
        try {
            serialport = require('serialport');
        } catch (err) {
            stopIt('Cannot load serialport module. Please use "npm rebuild". Stop adapter.');
            return;
        }

        Sentry.init({
            release: packageJson.name + '@' + packageJson.version,
            dsn: 'https://e01aa5e8f38449a880cd61715e1222e1@sentry.io/1834914',
            integrations: [
                new SentryIntegrations.Dedupe()
            ]
        });
        Sentry.configureScope(scope => {
            scope.setTag('version', adapter.common.installedVersion || adapter.common.version);
            if (adapter.common.installedFrom) {
                scope.setTag('installedFrom', adapter.common.installedFrom);
            }
            else {
                scope.setTag('installedFrom', adapter.common.installedVersion || adapter.common.version);
            }
        });

        adapter.getForeignObject('system.config', (err, obj) => {
            if (obj && obj.common && obj.common.diag) {
                adapter.getForeignObject('system.meta.uuid', (err, obj) => {
                    // create uuid
                    if (!err  && obj) {
                        Sentry.configureScope(scope => {
                            scope.setUser({
                                id: obj.native.uuid
                            });
                        });
                    }
                    main();
                });
            }
            else {
                main();
            }
        });
    });

    adapter.on('message', msg => {
        processMessage(msg);
    });

    /*
    adapter.on('stateChange', (id, state) => {
        adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
    });
    */

    adapter.on('unload', callback => {
        setConnected(false);
        if (smTransport) {
            smTransport.stop(callback);
        } else {
            callback();
        }
    });

    return adapter;
}

process.on('SIGINT', () => {
    setConnected(false);
    if (smTransport) smTransport.stop();
});

process.on('uncaughtException', err => {
    setConnected(false);
    if (adapter && adapter.log) {
        adapter.log.warn('Exception: ' + err);
    }
    if (smTransport) smTransport.stop();
});

function main() {
    const smOptions = {};
    if (adapter.common.loglevel === 'debug') {
        smOptions.debug = 2;
        smOptions.logger = adapter.log.debug;
    }
    else if (adapter.common.loglevel === 'info') {
        smOptions.debug = 1;
        smOptions.logger = adapter.log.info;
    }
    else {
        smOptions.debug = 0;
        smOptions.logger = adapter.log.warn;
    }
    if (!adapter.config.protocol) {
        adapter.log.error('Smartmeter Protocol is undefined, check your configuration!');
        return;
    }
    smOptions.protocol = adapter.config.protocol;
    if (!adapter.config.transport) {
        adapter.log.error('Smartmeter Transfer is undefined, check your configuration!');
        return;
    }
    smOptions.transport = adapter.config.transport;
    smOptions.requestInterval = adapter.config.requestInterval = adapter.config.requestInterval || 300;
    if (adapter.config.anotherQueryDelay) smOptions.anotherQueryDelay = adapter.config.anotherQueryDelay;
    if (adapter.config.transport.indexOf('Serial') === 0) { // we have a Serial connection
        if (!adapter.config.transportSerialPort) {
            adapter.log.error('Serial port device is undefined, check your configuration!');
            return;
        }
        smOptions.transportSerialPort = adapter.config.transportSerialPort;
        if (adapter.config.transportSerialBaudrate !== null && adapter.config.transportSerialBaudrate !== undefined) {
            adapter.config.transportSerialBaudrate = parseInt(adapter.config.transportSerialBaudrate, 10);

            if (adapter.config.transportSerialBaudrate < 300) {
                adapter.log.error('Serial port baudrate invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialBaudrate = adapter.config.transportSerialBaudrate;
        }
        if (adapter.config.transportSerialDataBits !== null && adapter.config.transportSerialDataBits !== undefined && adapter.config.transportSerialDataBits !== "") {
            adapter.config.transportSerialDataBits = parseInt(adapter.config.transportSerialDataBits, 10);

            if ((adapter.config.transportSerialDataBits < 5) || (adapter.config.transportSerialDataBits > 8)) {
                adapter.log.error('Serial port data bits ' + adapter.config.transportSerialDataBits + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialDataBits = adapter.config.transportSerialDataBits;
        }
        if (adapter.config.transportSerialStopBits !== null && adapter.config.transportSerialStopBits !== undefined  && adapter.config.transportSerialStopBits !== "") {
            adapter.config.transportSerialStopBits = parseInt(adapter.config.transportSerialStopBits, 10);

            if ((adapter.config.transportSerialStopBits !== 1) && (adapter.config.transportSerialStopBits !== 2)) {
                adapter.log.error('Serial port stopbits ' + adapter.config.transportSerialStopBits + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialStopBits = adapter.config.transportSerialStopBits;
        }
        if (adapter.config.transportSerialParity !== null && adapter.config.transportSerialParity !== undefined  && adapter.config.transportSerialParity !== "") {
            if ((adapter.config.transportSerialParity !== "none") && (adapter.config.transportSerialParity !== "even") &&
                (adapter.config.transportSerialParity !== "mark") && (adapter.config.transportSerialParity !== "odd") &&
                (adapter.config.transportSerialParity !== "space")) {

                adapter.log.error('Serial port parity ' + adapter.config.transportSerialParity + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialParity = adapter.config.transportSerialParity;
        }
        if (adapter.config.transportSerialMessageTimeout !== null && adapter.config.transportSerialMessageTimeout !== undefined) {
            adapter.config.transportSerialMessageTimeout = parseInt(adapter.config.transportSerialMessageTimeout, 10)*1000;
            if (adapter.config.transportSerialMessageTimeout < 1000) {
                adapter.log.error('HTTP Request timeout ' + adapter.config.transportSerialMessageTimeout + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialMessageTimeout = adapter.config.transportSerialMessageTimeout;
        }

        //adapter.config.transportSerialMaxBufferSize
    }
    else if (adapter.config.transport === 'HttpRequestTransport') { // we have a Serial connection
        if (!adapter.config.transportHttpRequestUrl) {
            adapter.log.error('HTTP Request URL is undefined, check your configuration!');
            return;
        }
        smOptions.transportHttpRequestUrl = adapter.config.transportHttpRequestUrl;
        if (adapter.config.transportHttpRequestTimeout !== null && adapter.config.transportHttpRequestTimeout !== undefined) {
            adapter.config.transportHttpRequestTimeout = parseInt(adapter.config.transportHttpRequestTimeout, 10);
            if (adapter.config.transportHttpRequestTimeout < 500) {
                adapter.log.error('HTTP Request timeout ' + adapter.config.transportHttpRequestTimeout + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportHttpRequestTimeout = adapter.config.transportHttpRequestTimeout;
        }
    }
    else if (adapter.config.transport === 'LocalFileTransport') { // we have a Serial connection
        if (!adapter.config.transportLocalFilePath) {
            adapter.log.error('HTTP Request URL is undefined, check your configuration!');
            return;
        }
        smOptions.transportLocalFilePath = adapter.config.transportLocalFilePath;
    }

    if (adapter.config.protocol === 'D0Protocol') { // we have a Serial connection
        if (adapter.config.protocolD0WakeupCharacters !== null && adapter.config.protocolD0WakeupCharacters !== undefined) {
            adapter.config.protocolD0WakeupCharacters = parseInt(adapter.config.protocolD0WakeupCharacters, 10);
            if (adapter.config.protocolD0WakeupCharacters < 0) {
                adapter.log.error('D0 Number of Wakeup NULL characters ' + adapter.config.protocolD0WakeupCharacters + ' invalid, check your configuration!');
                return;
            }
            smOptions.protocolD0WakeupCharacters = adapter.config.protocolD0WakeupCharacters;
        }
        if (adapter.config.protocolD0DeviceAddress) smOptions.protocolD0DeviceAddress = adapter.config.protocolD0DeviceAddress;
        if (adapter.config.protocolD0SignOnMessage) smOptions.protocolD0SignOnMessage = adapter.config.protocolD0SignOnMessage;
        if (adapter.config.protocolD0SignOnMessage) smOptions.protocolD0SignOnMessage = adapter.config.protocolD0SignOnMessage;
        if (adapter.config.protocolD0BaudrateChangeoverOverwrite !== null && adapter.config.protocolD0BaudrateChangeoverOverwrite !== undefined  && adapter.config.protocolD0BaudrateChangeoverOverwrite !== "") {
            adapter.config.protocolD0BaudrateChangeoverOverwrite = parseInt(adapter.config.protocolD0BaudrateChangeoverOverwrite, 10);

            if (adapter.config.protocolD0BaudrateChangeoverOverwrite < 300) {
                adapter.log.error('D0 baudrate changeover overwrite ' + adapter.config.protocolD0BaudrateChangeoverOverwrite + ' invalid, check your configuration!');
                return;
            }
            smOptions.protocolD0BaudrateChangeoverOverwrite = adapter.config.protocolD0BaudrateChangeoverOverwrite;
        }
    }
    if (adapter.config.protocol === 'SmlProtocol') { // we have a Serial connection
        smOptions.protocolSmlIgnoreInvalidCRC = adapter.config.protocolSmlIgnoreInvalidCRC = adapter.config.protocolSmlIgnoreInvalidCRC === 'true' || adapter.config.protocolSmlIgnoreInvalidCRC === true;
    }
    if (adapter.config.obisFallbackMedium !== null && adapter.config.obisFallbackMedium !== undefined) {
        adapter.config.obisFallbackMedium = parseInt(adapter.config.obisFallbackMedium, 10);
        if (adapter.config.obisFallbackMedium < 0 || adapter.config.obisFallbackMedium > 18 ) {
            adapter.log.error('OBIS Fallback medium code ' + adapter.config.obisFallbackMedium + ' invalid, check your configuration!');
            return;
        }
        smOptions.obisFallbackMedium = adapter.config.obisFallbackMedium;
    }
    adapter.log.debug('SmartmeterObis options: ' + JSON.stringify(smOptions));

    smTransport = SmartmeterObis.init(smOptions, storeObisData);

    smTransport.process();
}

function storeObisData(err, obisResult) {
    if (err) {
        adapter.log.warn(err.message);
        adapter.log.debug(err);
        setConnected(false);
        return;
    }
    setConnected(true);
    let updateCount = 0;
    for (const obisId in obisResult) {
        if (!obisResult.hasOwnProperty(obisId)) continue;

        adapter.log.debug(obisResult[obisId].idToString() + ': ' + SmartmeterObis.ObisNames.resolveObisName(obisResult[obisId], adapter.config.obisNameLanguage).obisName + ' = ' + obisResult[obisId].valueToString());
        let i;
        let ioChannelId = obisResult[obisId].idToString().replace(/[\]\[*,;'"`<>\\?]/g, '__');
        ioChannelId = ioChannelId.replace(/\./g, '_');
        if (!smValues[obisId]) {
            let ioChannelName = SmartmeterObis.ObisNames.resolveObisName(obisResult[obisId], adapter.config.obisNameLanguage).obisName;
            adapter.log.debug('Create Channel ' + ioChannelId + ' with name ' + ioChannelName);
            adapter.setObjectNotExists(ioChannelId, {
                type: 'channel',
                common: {
                    name: ioChannelName
                },
                native: {}
            }, err => {
                if (err) {
                    adapter.log.error('Error creating Channel: ' + err);
                }
            });

            if (obisResult[obisId].getRawValue() !== undefined) {
                adapter.log.debug('Create State ' + ioChannelId + '.rawvalue');
                adapter.setObjectNotExists(ioChannelId + '.rawvalue', {
                    type: 'state',
                    common: {
                        name: ioChannelId + '.rawvalue',
                        type: 'string',
                        read: true,
                        role: 'value',
                        write: false
                    },
                    native: {
                        id: ioChannelId + '.rawvalue'
                    }
                }, err => {
                    if (err) {
                        adapter.log.error('Error creating State: ' + err);
                    }
                });
            }

            adapter.log.debug('Create State ' + ioChannelId + '.value');
            adapter.setObjectNotExists(ioChannelId + '.value', {
                type: 'state',
                common: {
                    name: ioChannelId + '.value',
                    type: (typeof obisResult[obisId].getValue(0).value),
                    read: true,
                    unit: obisResult[obisId].getValue(0).unit,
                    role: 'value',
                    write: false
                },
                native: {
                    id: ioChannelId + '.value'
                }
            }, err => {
                if (err) {
                    adapter.log.error('Error creating State: ' + err);
                }
            });

            if (obisResult[obisId].getValueLength() > 1) {
                for (i = 1; i < obisResult[obisId].getValueLength(); i++) {
                    adapter.log.debug('Create State ' + ioChannelId + '.value' + (i + 1));
                    adapter.setObjectNotExists(ioChannelId + '.value' + (i + 1), {
                        type: 'state',
                        common: {
                            name: ioChannelId + '.value' + (i + 1),
                            type: (typeof obisResult[obisId].getValue(i).value),
                            read: true,
                            unit: obisResult[obisId].getValue(i).unit,
                            role: 'value',
                            write: false
                        },
                        native: {
                            id: ioChannelId + '.value' + (i + 1)
                        }
                    }, err => {
                        if (err) {
                            adapter.log.error('Error creating State: ' + err);
                        }
                    });
                }
            }
        }
        if (!smValues[obisId] || smValues[obisId].valueToString() !== obisResult[obisId].valueToString()) {
            if (obisResult[obisId].getRawValue() !== "") {
                adapter.log.debug('Set State ' + ioChannelId + '.rawvalue = ' + obisResult[obisId].getRawValue());
                adapter.setState(ioChannelId + '.rawvalue', {ack: true, val: obisResult[obisId].getRawValue()});
            }

            adapter.log.debug('Set State ' + ioChannelId + '.value = ' + obisResult[obisId].getValue(0).value);
            adapter.setState(ioChannelId + '.value', {ack: true, val: obisResult[obisId].getValue(0).value});

            if (obisResult[obisId].getValueLength() > 1) {
                for (i = 1; i < obisResult[obisId].getValueLength(); i++) {
                    adapter.log.debug('Set State '+ ioChannelId + '.value' + (i + 1) + ' = ' + obisResult[obisId].getValue(i).value);
                    adapter.setState(ioChannelId + '.value' + (i + 1), {ack: true, val: obisResult[obisId].getValue(i).value});

                }
            }
            smValues[obisId] = obisResult[obisId];
            updateCount++;
        }
        else {
            adapter.log.debug('Data for '+ ioChannelId + ' unchanged');
        }
    }
    adapter.log.info('Received ' + Object.keys(obisResult).length + ' values, ' + updateCount + ' updated');
}

function processMessage(obj) {
    if (!obj) return;

    adapter.log.debug('Message received = ' + JSON.stringify(obj));

    switch (obj.command) {
        case 'listUart':
            if (obj.callback) {
                if (serialport) {
                    // read all found serial ports
                    serialport.list().then(ports => {
                        adapter.log.info('List of port: ' + JSON.stringify(ports));
                        if (process.platform !== 'win32') {
                            ports.forEach(port => {
                                if (port.pnpId) {
                                    try {
                                        const pathById = '/dev/serial/by-id/' + port.pnpId;
                                        if (fs.existsSync(pathById)) {
                                            port.realPath = port.path;
                                            port.path = pathById;
                                        }
                                    } catch (err) {
                                        adapter.log.debug('pnpId ' + port.pnpId + ' not existing: ' + err);
                                    }
                                    return port;
                                }
                            });
                        }
                        adapter.sendTo(obj.from, obj.command, ports, obj.callback);
                    }).catch(err => {
                        adapter.log.warn('Can not get Serial port list: ' + err);
                        adapter.sendTo(obj.from, obj.command, [{path: 'Not available'}], obj.callback);
                    });
                } else {
                    adapter.log.warn('Module serialport is not available');
                    adapter.sendTo(obj.from, obj.command, [{path: 'Not available'}], obj.callback);
                }
            }
            break;
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}