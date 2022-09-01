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

const fs = require('fs');
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
let smTransport;
const { SerialPort } = require('serialport');

let connected = null;
let adapter;

let Sentry;
let SentryIntegrations;
function initSentry(callback) {
    if (!adapter.ioPack.common || !adapter.ioPack.common.plugins || !adapter.ioPack.common.plugins.sentry) {
        return callback && callback();
    }
    const sentryConfig = adapter.ioPack.common.plugins.sentry;
    if (!sentryConfig.dsn) {
        adapter.log.warn('Invalid Sentry definition, no dsn provided. Disable error reporting');
        return callback && callback();
    }
    // Require needed tooling
    Sentry = require('@sentry/node');
    SentryIntegrations = require('@sentry/integrations');
    // By installing source map support, we get the original source
    // locations in error messages
    require('source-map-support').install();

    let sentryPathWhitelist = [];
    if (sentryConfig.pathWhitelist && Array.isArray(sentryConfig.pathWhitelist)) {
        sentryPathWhitelist = sentryConfig.pathWhitelist;
    }
    if (adapter.pack.name && !sentryPathWhitelist.includes(adapter.pack.name)) {
        sentryPathWhitelist.push(adapter.pack.name);
    }
    let sentryErrorBlacklist = [];
    if (sentryConfig.errorBlacklist && Array.isArray(sentryConfig.errorBlacklist)) {
        sentryErrorBlacklist = sentryConfig.errorBlacklist;
    }
    if (!sentryErrorBlacklist.includes('SyntaxError')) {
        sentryErrorBlacklist.push('SyntaxError');
    }

    Sentry.init({
        release: adapter.pack.name + '@' + adapter.pack.version,
        dsn: sentryConfig.dsn,
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
        scope.addEventProcessor(function (event, hint) {
            // Try to filter out some events
            if (event.exception && event.exception.values && event.exception.values[0]) {
                const eventData = event.exception.values[0];
                // if error type is one from blacklist we ignore this error
                if (eventData.type && sentryErrorBlacklist.includes(eventData.type)) {
                    return null;
                }
                if (eventData.stacktrace && eventData.stacktrace.frames && Array.isArray(eventData.stacktrace.frames) && eventData.stacktrace.frames.length) {
                    // if last exception frame is from an nodejs internal method we ignore this error
                    if (eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename && (eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename.startsWith('internal/') || eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename.startsWith('Module.'))) {
                        return null;
                    }
                    // Check if any entry is whitelisted from pathWhitelist
                    const whitelisted = eventData.stacktrace.frames.find(frame => {
                        if (frame.function && frame.function.startsWith('Module.')) {
                            return false;
                        }
                        if (frame.filename && frame.filename.startsWith('internal/')) {
                            return false;
                        }
                        if (frame.filename && !sentryPathWhitelist.find(path => path && path.length && frame.filename.includes(path))) {
                            return false;
                        }
                        return true;
                    });
                    if (!whitelisted) {
                        return null;
                    }
                }
            }

            return event;
        });

        adapter.getForeignObject('system.config', (err, obj) => {
            if (obj && obj.common && obj.common.diag) {
                adapter.getForeignObject('system.meta.uuid', (err, obj) => {
                    // create uuid
                    if (!err && obj) {
                        Sentry.configureScope(scope => {
                            scope.setUser({
                                id: obj.native.uuid
                            });
                        });
                    }
                    callback && callback();
                });
            }
            else {
                callback && callback();
            }
        });
    });
}

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

        if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
            main();
        }
        else {
            initSentry(main);
        }
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
        if (adapter.config.transportSerialStopBits !== null && adapter.config.transportSerialStopBits !== undefined && adapter.config.transportSerialStopBits !== "") {
            adapter.config.transportSerialStopBits = parseInt(adapter.config.transportSerialStopBits, 10);

            if ((adapter.config.transportSerialStopBits !== 1) && (adapter.config.transportSerialStopBits !== 2)) {
                adapter.log.error('Serial port stopbits ' + adapter.config.transportSerialStopBits + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialStopBits = adapter.config.transportSerialStopBits;
        }
        if (adapter.config.transportSerialParity !== null && adapter.config.transportSerialParity !== undefined && adapter.config.transportSerialParity !== "") {
            if ((adapter.config.transportSerialParity !== "none") && (adapter.config.transportSerialParity !== "even") &&
                (adapter.config.transportSerialParity !== "mark") && (adapter.config.transportSerialParity !== "odd") &&
                (adapter.config.transportSerialParity !== "space")) {

                adapter.log.error('Serial port parity ' + adapter.config.transportSerialParity + ' invalid, check your configuration!');
                return;
            }
            smOptions.transportSerialParity = adapter.config.transportSerialParity;
        }
        if (adapter.config.transportSerialMessageTimeout !== null && adapter.config.transportSerialMessageTimeout !== undefined) {
            adapter.config.transportSerialMessageTimeout = parseInt(adapter.config.transportSerialMessageTimeout, 10) * 1000;
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
    else if (adapter.config.transport === 'LocalFileTransport') { // we have a LocalFile connection
        if (!adapter.config.transportLocalFilePath) {
            adapter.log.error('HTTP Request URL is undefined, check your configuration!');
            return;
        }
        smOptions.transportLocalFilePath = adapter.config.transportLocalFilePath;
    }
    else if (adapter.config.transport === 'TCPTransport') { // we have a TCP connection
        if (!adapter.config.transportTcpHost) {
            adapter.log.error('TCP Host is undefined, check your configuration!');
            return;
        }
        if (!adapter.config.transportTcpPort) {
            adapter.log.error('TCP Port is undefined, check your configuration!');
            return;
        }
        smOptions.transportTcpHost = adapter.config.transportTcpHost;
        smOptions.transportTcpPort = adapter.config.transportTcpPort;
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
        if (adapter.config.protocolD0BaudrateChangeoverOverwrite !== null && adapter.config.protocolD0BaudrateChangeoverOverwrite !== undefined && adapter.config.protocolD0BaudrateChangeoverOverwrite !== "") {
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
        if (adapter.config.protocolSmlInputEncoding) {
            smOptions.protocolSmlInputEncoding = adapter.config.protocolSmlInputEncoding;
        }
    }
    if (adapter.config.obisFallbackMedium !== null && adapter.config.obisFallbackMedium !== undefined) {
        adapter.config.obisFallbackMedium = parseInt(adapter.config.obisFallbackMedium, 10);
        if (adapter.config.obisFallbackMedium < 0 || adapter.config.obisFallbackMedium > 18) {
            adapter.log.error('OBIS Fallback medium code ' + adapter.config.obisFallbackMedium + ' invalid, check your configuration!');
            return;
        }
        smOptions.obisFallbackMedium = adapter.config.obisFallbackMedium;
    }
    adapter.log.debug('Smartmeter options: ' + JSON.stringify(smOptions));

    if (smOptions.protocol === 'TicProtocol') {
        const TicCollector = require('./lib/ticcollector');
        smTransport = TicCollector.init(adapter, setConnected, smOptions);
    } else {
        // OBIS by default
        const ObisCollector = require('./lib/obiscollector');
        smTransport = ObisCollector.init(adapter, setConnected, smOptions);
    }

    smTransport.process();
}

function processMessage(obj) {
    if (!obj) return;

    adapter.log.debug('Message received = ' + JSON.stringify(obj));

    switch (obj.command) {
        case 'listUart':
            if (obj.callback) {
                if (SerialPort) {
                    // read all found serial ports
                    SerialPort.list().then(ports => {
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
                        adapter.sendTo(obj.from, obj.command, [{ path: 'Not available' }], obj.callback);
                    });
                } else {
                    adapter.log.warn('Module serialport is not available');
                    adapter.sendTo(obj.from, obj.command, [{ path: 'Not available' }], obj.callback);
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
