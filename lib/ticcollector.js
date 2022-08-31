// Types, units of TIC fields
// TODO: add descriptions with translations
// TODO: add tri-phase
// TODO: add 'standard' mode
const ticStateCommon = {
    'ADCO': { type: 'string' },
    'OPTARIF': { type: 'string' },
    'ISOUSC': { type: 'number', unit: 'A', role: 'value.current' },
    'BASE': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },

    'HCHC': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'HCHP': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },

    'EJPHN': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'EJPHPM': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },

    'BBRHCJB': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'BBRHPJB': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'BBRHCJW': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'BBRHPJW': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'BBRHCJR': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },
    'BBRHPJR': { type: 'number', unit: 'Wh', role: 'value.power.consumption' },

    'PEJP': { type: 'number' /* In minutes */ },

    'PTEC': { type: 'string' },
    'DEMAIN': { type: 'string' },

    'IINST': { type: 'number', unit: 'A', role: 'value.current' },
    'ADPS': { type: 'number', unit: 'A', role: 'value.current' },
    'IMAX': { type: 'number', unit: 'A', role: 'value.current' },

    'PAPP': { type: 'number', unit: 'VA' }, // TODO: no role for VA documented

    'HHPHC': { type: 'string' },
    'MOTDETAT': { type: 'string' }
};

function processTic(smOptions) {
    const adapter = smOptions.adapter;
    adapter.log.debug('Starting TIC processing');

    var adco = false;

    const port = new smOptions.SerialPort({
        path: smOptions.transportSerialPort,
        baudRate: smOptions.transportSerialBaudrate,
        // TODO: there are options to override this which we currently ignore. Maybe handle them?
        dataBits: 7,
        parity: 'even'
    });
    // TODO: clean up port, etc. on termination

    const { ReadlineParser } = require('@serialport/parser-readline');
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    var nameValueCache = [];
    parser.on('data', (data) => {
        // data is a string
        adapter.log.silly(data);

        const parts = data.split(/\s+/);
        const name = parts.shift();
        // convert string value to number if necessary
        const value = parts.shift();
        const checksum = parts.shift();
        // TODO: verify checksum;

        // TODO: Does the protocol cater for multiple ADCO values in the same stream?
        if (name === 'ADCO') {
            adco = value;
            adapter.log.info('Found ID ' + adco);
            smOptions.setConnected(true);
        }

        if (ticStateCommon[name] == undefined) {
            // We don't know what this field is so ignore it
            adapter.log.warn('Unknown label (ignoring): ' + name);
        } else if (nameValueCache[name] === value) {
            // Nothing has changed since the last time, do nothing
        } else if (adco) {
            // Label known & new value so create channel/state  set value
            nameValueCache[name] = value;

            // Only create/set objects if the channel (adco) is known.
            // TODO: this needs cleaning up
            adapter.setObjectNotExists(adco, {
                type: 'channel',
                common: {
                    name: adco,
                },
                native: {}
            }, (err) => {
                if (err) {
                    adapter.log.error('Failed to create channel ' + adco);
                } else {
                    const stateName = adco + '.' + name;
                    adapter.setObjectNotExists(stateName, {
                        type: 'state',
                        common: ticStateCommon[name]
                        // TODO: other attributes?
                    }, (err) => {
                        if (err) {
                            adapter.log.error('Failed to create state ' + stateName);
                        } else {
                            // convert string value to number if necessary
                            adapter.setState(stateName, {
                                ack: true,
                                val: ticStateCommon[name].type == 'number' ? Number(value) : value
                            }, (err) => {
                                if (err) {
                                    adapter.log.error('Failed to set state ' + stateName);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

module.exports = processTic;