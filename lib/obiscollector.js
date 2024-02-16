// Thought about making this a class, but... meh.

'use strict';

const SmartmeterObis = require('smartmeter-obis');

let adapter;
let setConnected;
let stopInProgress = false;
const smValues = {};

function init(adapterIn, setConnectedIn, smOptions) {
    adapter = adapterIn;

    setConnected = setConnectedIn;
    const smTransport = SmartmeterObis.init(smOptions, storeObisData);

    return {
        process: () => {
            smTransport.process()
        },
        stop: () => {
            stopInProgress = true;
        }
    };
}

async function storeObisData(err, obisResult) {
    if (stopInProgress) return;
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
            try {
                await adapter.setObjectNotExistsAsync(ioChannelId, {
                    type: 'channel',
                    common: {
                        name: ioChannelName
                    },
                    native: {}
                });
            } catch (err) {
                adapter.log.error('Error creating Channel: ' + err);
            }

            if (obisResult[obisId].getRawValue() !== undefined) {
                adapter.log.debug('Create State ' + ioChannelId + '.rawvalue');
                try {
                    await adapter.setObjectNotExistsAsync(ioChannelId + '.rawvalue', {
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
                } catch (err) {
                    adapter.log.error('Error creating State: ' + err);
                }
            }

            adapter.log.debug('Create State ' + ioChannelId + '.value');
            try {
                await adapter.setObjectNotExistsAsync(ioChannelId + '.value', {
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
            } catch (err) {
                adapter.log.error('Error creating State: ' + err);
            }

            if (obisResult[obisId].getValueLength() > 1) {
                for (i = 1; i < obisResult[obisId].getValueLength(); i++) {
                    adapter.log.debug('Create State ' + ioChannelId + '.value' + (i + 1));
                    try {
                        await adapter.setObjectNotExistsAsync(ioChannelId + '.value' + (i + 1), {
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
                    } catch (err) {
                        adapter.log.error('Error creating State: ' + err);
                    }
                }
            }
        }
        if (!smValues[obisId] || smValues[obisId].valueToString() !== obisResult[obisId].valueToString()) {
            if (obisResult[obisId].getRawValue() !== undefined) {
                adapter.log.debug('Set State ' + ioChannelId + '.rawvalue = ' + obisResult[obisId].getRawValue());
                await adapter.setStateAsync(ioChannelId + '.rawvalue', { ack: true, val: obisResult[obisId].getRawValue() });
            }

            adapter.log.debug('Set State ' + ioChannelId + '.value = ' + obisResult[obisId].getValue(0).value);
            await adapter.setStateAsync(ioChannelId + '.value', { ack: true, val: obisResult[obisId].getValue(0).value });

            if (obisResult[obisId].getValueLength() > 1) {
                for (i = 1; i < obisResult[obisId].getValueLength(); i++) {
                    adapter.log.debug('Set State ' + ioChannelId + '.value' + (i + 1) + ' = ' + obisResult[obisId].getValue(i).value);
                    await adapter.setStateAsync(ioChannelId + '.value' + (i + 1), { ack: true, val: obisResult[obisId].getValue(i).value });
                }
            }
            smValues[obisId] = obisResult[obisId];
            updateCount++;
        }
        else {
            adapter.log.debug('Data for ' + ioChannelId + ' unchanged');
        }
    }
    adapter.log.info('Received ' + Object.keys(obisResult).length + ' values, ' + updateCount + ' updated');
}

module.exports = {
    init: init
}