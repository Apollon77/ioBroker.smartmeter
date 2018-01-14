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
var path = require('path');
var utils = require(path.join(__dirname,'lib','utils')); // Get common adapter utils
var SmartmeterObis = require('smartmeter-obis');
var smTransport;

var smValues = {};

var adapter = utils.Adapter('smartmeter');

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

process.on('uncaughtException', function (err) {
    if (adapter && adapter.log) {
        adapter.log.warn('Exception: ' + err);
    }
    if (smTransport) smTransport.stop();
});

function main() {
    var smOptions = {};
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
        throw Error('Smartmeter Protocol is undefined, check your configuration!');
    }
    smOptions.protocol = adapter.config.protocol;
    if (!adapter.config.transport) {
        throw Error('Smartmeter Transfer is undefined, check your configuration!');
    }
    smOptions.transport = adapter.config.transport;
    smOptions.requestInterval = adapter.config.requestInterval = adapter.config.requestInterval || 300;
    if (adapter.config.transport.indexOf('Serial') === 0) { // we have a Serial connection
        if (!adapter.config.transportSerialPort) {
            throw Error('Serial port device is undefined, check your configuration!');
        }
        smOptions.transportSerialPort = adapter.config.transportSerialPort;
        if (adapter.config.transportSerialBaudrate !== null && adapter.config.transportSerialBaudrate !== undefined) {
            adapter.config.transportSerialBaudrate = parseInt(adapter.config.transportSerialBaudrate, 10);

            if (adapter.config.transportSerialBaudrate < 300) {
                throw Error('Serial port baudrate invalid, check your configuration!');
            }
            smOptions.transportSerialBaudrate = adapter.config.transportSerialBaudrate;
        }
        if (adapter.config.transportSerialDataBits !== null && adapter.config.transportSerialDataBits !== undefined && adapter.config.transportSerialDataBits !== "") {
            adapter.config.transportSerialDataBits = parseInt(adapter.config.transportSerialDataBits, 10);

            if ((adapter.config.transportSerialDataBits < 5) || (adapter.config.transportSerialDataBits > 8)) {
                throw Error('Serial port data bits ' + adapter.config.transportSerialDataBits + ' invalid, check your configuration!');
            }
            smOptions.transportSerialDataBits = adapter.config.transportSerialDataBits;
        }
        if (adapter.config.transportSerialStopBits !== null && adapter.config.transportSerialStopBits !== undefined  && adapter.config.transportSerialStopBits !== "") {
            adapter.config.transportSerialStopBits = parseInt(adapter.config.transportSerialStopBits, 10);

            if ((adapter.config.transportSerialStopBits !== 1) && (adapter.config.transportSerialStopBits !== 2)) {
                throw Error('Serial port stopbits ' + adapter.config.transportSerialStopBits + ' invalid, check your configuration!');
            }
            smOptions.transportSerialStopBits = adapter.config.transportSerialStopBits;
        }
        if (adapter.config.transportSerialParity !== null && adapter.config.transportSerialParity !== undefined  && adapter.config.transportSerialParity !== "") {
            if ((adapter.config.transportSerialParity !== "none") && (adapter.config.transportSerialParity !== "even") &&
                (adapter.config.transportSerialParity !== "mark") && (adapter.config.transportSerialParity !== "odd") &&
                (adapter.config.transportSerialParity !== "space")) {

                throw Error('Serial port parity ' + adapter.config.transportSerialParity + ' invalid, check your configuration!');
            }
            smOptions.transportSerialParity = adapter.config.transportSerialParity;
        }
        if (adapter.config.transportSerialMessageTimeout !== null && adapter.config.transportSerialMessageTimeout !== undefined) {
            adapter.config.transportSerialMessageTimeout = parseInt(adapter.config.transportSerialMessageTimeout, 10)*1000;
            if (adapter.config.transportSerialMessageTimeout < 1000) {
                throw Error('HTTP Request timeout ' + adapter.config.transportSerialMessageTimeout + ' invalid, check your configuration!');
            }
            smOptions.transportSerialMessageTimeout = adapter.config.transportSerialMessageTimeout;
        }

        //adapter.config.transportSerialMaxBufferSize
    }
    else if (adapter.config.transport === 'HttpRequestTransfer') { // we have a Serial connection
        if (!adapter.config.transportHttpRequestUrl) {
            throw Error('HTTP Request URL is undefined, check your configuration!');
        }
        smOptions.transportHttpRequestUrl = adapter.config.transportHttpRequestUrl;
        if (adapter.config.transportHttpRequestTimeout !== null && adapter.config.transportHttpRequestTimeout !== undefined) {
            adapter.config.transportHttpRequestTimeout = parseInt(adapter.config.transportHttpRequestTimeout, 10);
            if (adapter.config.transportHttpRequestTimeout < 500) {
                throw Error('HTTP Request timeout ' + adapter.config.transportHttpRequestTimeout + ' invalid, check your configuration!');
            }
            smOptions.transportHttpRequestTimeout = adapter.config.transportHttpRequestTimeout;
        }
    }
    else if (adapter.config.transport === 'LocalFileTransport') { // we have a Serial connection
        if (!adapter.config.transportLocalFilePath) {
            throw Error('HTTP Request URL is undefined, check your configuration!');
        }
        smOptions.transportLocalFilePath = adapter.config.transportLocalFilePath;
    }

    if (adapter.config.protocol === 'D0Protocol') { // we have a Serial connection
        if (adapter.config.protocolD0WakeupCharacters !== null && adapter.config.protocolD0WakeupCharacters !== undefined) {
            adapter.config.protocolD0WakeupCharacters = parseInt(adapter.config.protocolD0WakeupCharacters, 10);
            if (adapter.config.protocolD0WakeupCharacters < 0) {
                throw Error('D0 Number of Wakeup NULL characters ' + adapter.config.protocolD0WakeupCharacters + ' invalid, check your configuration!');
            }
            smOptions.protocolD0WakeupCharacters = adapter.config.protocolD0WakeupCharacters;
        }
        if (adapter.config.protocolD0DeviceAddress) smOptions.protocolD0DeviceAddress = adapter.config.protocolD0DeviceAddress;
        if (adapter.config.protocolD0SignOnMessage) smOptions.protocolD0SignOnMessage = adapter.config.protocolD0SignOnMessage;
        if (adapter.config.protocolD0ModeOverwrite) smOptions.protocolD0ModeOverwrite = adapter.config.protocolD0ModeOverwrite;
        if (adapter.config.protocolD0BaudrateChangeoverOverwrite !== null && adapter.config.protocolD0BaudrateChangeoverOverwrite !== undefined  && adapter.config.protocolD0BaudrateChangeoverOverwrite !== "") {
            adapter.config.protocolD0BaudrateChangeoverOverwrite = parseInt(adapter.config.protocolD0BaudrateChangeoverOverwrite, 10);

            if (adapter.config.protocolD0BaudrateChangeoverOverwrite < 300) {
                throw Error('D0 baudrate changeover overwrite ' + adapter.config.protocolD0BaudrateChangeoverOverwrite + ' invalid, check your configuration!');
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
            throw Error('OBIS Fallback medium code ' + adapter.config.obisFallbackMedium + ' invalid, check your configuration!');
        }
        smOptions.obisFallbackMedium = adapter.config.obisFallbackMedium;
    }
    adapter.log.debug('SmartmeterObis options: ' + JSON.stringify(smOptions));

    smTransport = SmartmeterObis.init(smOptions, storeObisData);

    smTransport.process();
}

function storeObisData(err, obisResult) {
    if (err) {
        adapter.log.error(err.message);
        adapter.log.debug(err);
        return;
    }
    var updateCount = 0;
    for (var obisId in obisResult) {
        if (!obisResult.hasOwnProperty(obisId)) continue;

        adapter.log.debug(obisResult[obisId].idToString() + ': ' + SmartmeterObis.ObisNames.resolveObisName(obisResult[obisId], adapter.config.obisNameLanguage).obisName + ' = ' + obisResult[obisId].valueToString());
        var i;
        var ioChannelId = obisResult[obisId].idToString().replace(/\./g, "_");
        if (!smValues[obisId]) {
            var ioChannelName = SmartmeterObis.ObisNames.resolveObisName(obisResult[obisId], adapter.config.obisNameLanguage).obisName;
            adapter.log.debug('Create Channel ' + ioChannelId + ' with name ' + ioChannelName);
            adapter.setObjectNotExists(ioChannelId, {
                type: 'channel',
                common: {
                    name: ioChannelName
                },
                native: {}
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

function processMessage(message) {
    if (!message) return;

    adapter.log.info('(Unhandled) Message received = ' + JSON.stringify(message));
}
