/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';
/**
 *
 * Smartmeter adapter
 *
 * Adapter reading smartmeter data and pushing the values into ioBroker
 *
 */
var path = require('path');
var utils = require(path.join(__dirname,'lib','utils')); // Get common adapter utils
var SmartmeterObis = require('smartmeter-obis');
var smTransport;

var adapter = utils.adapter('smartmeter');

adapter.on('ready', function (obj) {
    main();
});

adapter.on('message', function (msg) {
    processMessage(msg);
});

adapter.on('stateChange', function (id, state) {
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
});

adapter.on('unload', function (callback) {
    if (smTransport) smTransport.stop();
});

process.on('SIGINT', function () {
    if (smTransport) smTransport.stop();
});

function main() {
    var smOptions = {};
    if (adapter.common.loglevel === 'debug') {
        smOptions.debug = 2;
        smOptions.logger = adapter.log.debug;
    }
    else if (adapter.common.loglevel === 'info') {
        smOptions.debug = 2; // TODO to 1
        smOptions.logger = adapter.log.info;
    }
    else {
        smOptions.debug = 2; // TODO to 0
        smOptions.logger = adapter.log.info;
    }
    if (!adapter.config.protocol) {
        adapter.log.error('Smartmeter Protocol is undefined, check your configuration!');
        process.exit();
    }
    smOptions.protocol = adapter.config.protocol;
    if (!adapter.config.transport) {
        adapter.log.error('Smartmeter Transfer is undefined, check your configuration!');
        process.exit();
    }
    smOptions.requestInterval = adapter.config.requestInterval = adapter.config.requestInterval || 300;
    if (adapter.config.transport.indexOf('Serial') === 0) { // we have a Serial connection
        if (!adapter.config.transportSerialPort) {
            adapter.log.error('Serial port device is undefined, check your configuration!');
            process.exit();
        }
        smOptions.transportSerialPort = adapter.config.transportSerialPort;
        if (adapter.config.transportSerialBaudrate !== null && adapter.config.transportSerialBaudrate !== undefined) {
            adapter.config.transportSerialBaudrate = parseInt(adapter.config.transportSerialBaudrate, 10);

            if (adapter.config.transportSerialBaudrate < 300) {
                adapter.log.error('Serial port baudrate invalid, check your configuration!');
                process.exit();
            }
            smOptions.transportSerialBaudrate = adapter.config.transportSerialBaudrate;
        }
        // maybe we add them later
        //adapter.config.transportSerialDataBits
        //adapter.config.transportSerialStopBits
        //adapter.config.transportSerialParity
        //adapter.config.transportSerialMaxBufferSize
    }
    else if (adapter.config.transport === 'HttpRequestTransfer') { // we have a Serial connection
        if (!adapter.config.transportHttpRequestUrl) {
            adapter.log.error('HTTP Request URL is undefined, check your configuration!');
            process.exit();
        }
        smOptions.transportHttpRequestUrl = adapter.config.transportHttpRequestUrl;
        if (adapter.config.transportHttpRequestTimeout !== null && adapter.config.transportHttpRequestTimeout !== undefined) {
            adapter.config.transportHttpRequestTimeout = parseInt(adapter.config.transportHttpRequestTimeout, 10);
            if (adapter.config.transportHttpRequestTimeout < 500) {
                adapter.log.error('HTTP Request timeout invalid, check your configuration!');
                process.exit();
            }
            smOptions.transportHttpRequestTimeout = adapter.config.transportHttpRequestTimeout;
        }
    }
    else if (adapter.config.transport === 'LocalFileTransport') { // we have a Serial connection
        if (!adapter.config.transportLocalFilePath) {
            adapter.log.error('HTTP Request URL is undefined, check your configuration!');
            process.exit();
        }
        smOptions.transportLocalFilePath = adapter.config.transportLocalFilePath;
    }

    if (adapter.config.protocol === 'D0Protocol') { // we have a Serial connection
        if (adapter.config.protocolD0WakeupCharacters !== null && adapter.config.protocolD0WakeupCharacters !== undefined) {
            adapter.config.protocolD0WakeupCharacters = parseInt(adapter.config.protocolD0WakeupCharacters, 10);
            if (adapter.config.protocolD0WakeupCharacters < 0) {
                adapter.log.error('D0 Number of Wakeup NULL characters invalid, check your configuration!');
                process.exit();
            }
            smOptions.protocolD0WakeupCharacters = adapter.config.protocolD0WakeupCharacters;
        }
        if (adapter.config.protocolD0DeviceAddress) smOptions.protocolD0DeviceAddress = adapter.config.protocolD0DeviceAddress;
        if (adapter.config.protocolD0SignOnMessage) smOptions.protocolD0SignOnMessage = adapter.config.protocolD0SignOnMessage;
    }
    if (adapter.config.protocol === 'SmlProtocol') { // we have a Serial connection
        smOptions.protocolSmlIgnoreInvalidCRC = adapter.config.protocolSmlIgnoreInvalidCRC = adapter.config.protocolSmlIgnoreInvalidCRC === 'true' || adapter.config.protocolSmlIgnoreInvalidCRC === true;
    }
    if (adapter.config.obisFallbackMedium !== null && adapter.config.obisFallbackMedium !== undefined) {
        adapter.config.obisFallbackMedium = parseInt(adapter.config.obisFallbackMedium, 10);
        if (adapter.config.obisFallbackMedium < 0 || adapter.config.obisFallbackMedium > 18 ) {
            adapter.log.error('OBIS Fallback medium code invalid, check your configuration!');
            process.exit();
        }
        smOptions.obisFallbackMedium = adapter.config.obisFallbackMedium;
    }
    adapter.log.info('SmartmeterObis options: ' + JSON.stringify(smOptions)); //TODO to debug

    smTransport = SmartmeterObis.init(smOptions, storeObisData);

    smTransport.process();
}

function storeObisData(obisResult) {
    for (var obisId in obisResult) {
        adapter.log.info(obisResult[obisId].idToString() + ': ' + SmartmeterObis.ObisNames.resolveObisName(obisResult[obisId], adapter.config.obisNameLanguage).obisName + ' = ' + obisResult[obisId].valueToString());
    }
/*
    adapter.setObjectNotExists(stateName, {
        type: 'state',
        common: {name: stateName, type: 'string', read: true, write: false},
        native: {id: stateName}
    });
    adapter.log.debug('Set State '+stateName+' = '+varlist[key]);
    adapter.setState(stateName, {ack: true, val: varlist[key]});


    adapter.setObjectNotExists('status.severity', {
      type: 'state',
      common: {
          name: 'status.severity',
          role: 'indicator',
          type: 'number',
          read: true,
          write: false,
          def:4,
          states: '0:idle;1:operating;2:operating_critical;3:action_needed;4:unknown'
      },
      native: {id: 'status.severity'}
    });

    adapter.log.info('All Nut values set');
*/
}

function processMessage(message) {
    if (!message) return;

    adapter.log.info('(Unhandled) Message received = ' + JSON.stringify(message));
}
