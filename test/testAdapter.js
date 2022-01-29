/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/*jshint expr: true*/
var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var fs = require('fs');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}

describe('Test ' + adapterShortName + ' adapter', function() {
    before('Test ' + adapterShortName + ' adapter: Start js-controller', function (_done) {
        this.timeout(45*60*60*1000); // because of first install from npm

        setup.setupController(async function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.protocol = 'D0Protocol';
            config.native.transport = 'LocalFileTransport';
            config.native.transportLocalFilePath = __dirname + '/test.d0';
            config.native.requestInterval = 10;
            config.native.obisFallbackMedium = 6;

            var testData = '/?Bla0!\r\n6.8(0029.055*MWh)6.26(01589.28*m3)9.21(00010213)6.26*01(01563.92*m3)6.8*01(0028.086*MWh)F(0)9.20(64030874)6.35(60*m)6.6(0017.2*kW)6.6*01(0017.2*kW)6.33(001.476*m3ph)9.4(088*C&082*C)6.31(0030710*h)6.32(0000194*h)9.22(R)9.6(000&00010213&0)9.7(20000)6.32*01(0000194*h)6.36(01-01)6.33*01(001.476*m3ph)6.8.1()6.8.2()6.8.3()6.8.4()6.8.5()6.8.1*01()6.8.2*01()6.8.3*01()\r\n6.8.4*01()6.8.5*01()9.4*01(088*C&082*C)6.36.1(2013-11-28)6.36.1*01(2013-11-28)6.36.2(2016-09-24)6.36.2*01(2016-09-24)6.36.3(2015-03-26)6.36.3*01(2015-03-26)6.36.4(2013-09-27)6.36.4*01(2013-09-27)6.36.5(2000-00-00)6.36*02(01)9.36(2017-01-18&01:36:47)9.24(0.6*m3ph)9.17(0)9.18()9.19()9.25()9.1(0&1&0&-&CV&3&2.14)9.2(&&)0.0(00010213)!\r\n';
            fs.writeFileSync(__dirname + '/test.d0', testData);


            await setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function(id, obj) {}, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
                },
                function (_objects, _states) {
                    objects = _objects;
                    states  = _states;
                    _done();
                });
        });
    });

    it('Test ' + adapterShortName + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
            if (res) console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {

                    },
                    type: 'instance'
                },
                function () {
                    states.subscribeMessage('system.adapter.test.0');
                    done();
                });
        });
    });

    it('Test ' + adapterShortName + ' adapter: test stored data', function (done) {
        this.timeout(25000);

        setTimeout(function() {
            states.getState('smartmeter.0.6-0:6_8.value', function (err, state) {
                if (err) console.error(err);
                expect(state).to.exist;
                if (!state) {
                    console.error('state "smartmeter.0.6-0:6_8.value" not set');
                }
                else {
                    console.log('check smartmeter.0.6-0:6_8.value ... ' + state.val);
                    expect(state.val).to.exist;
                    expect(state.val).to.be.equal(29.055);
                }
                states.getState('smartmeter.0.6-0:6_8.rawvalue', function (err, state) {
                    if (err) console.error(err);
                    expect(state).to.exist;
                    if (!state) {
                        console.error('state "smartmeter.0.6-0:6_8.rawvalue" not set');
                    }
                    else {
                        console.log('check smartmeter.0.6-0:6_8.rawvalue ... ' + state.val);
                    }
                    expect(state.val).to.exist;
                    expect(state.val).to.be.equal("0029.055*MWh");
                    states.getState('smartmeter.0.6-0:9_4.value', function (err, state) {
                        if (err) console.error(err);
                        expect(state).to.exist;
                        if (!state) {
                            console.error('state "smartmeter.0.6-0:9_4.value" not set');
                        }
                        else {
                            console.log('check smartmeter.0.6-0:9_4.value ... ' + state.val);
                        }
                        expect(state.val).to.exist;
                        expect(state.val).to.be.equal(88);
                        states.getState('smartmeter.0.6-0:9_4.value2', function (err, state) {
                            if (err) console.error(err);
                            expect(state).to.exist;
                            if (!state) {
                                console.error('state "smartmeter.0.6-0:9_4.value2" not set');
                            }
                            else {
                                console.log('check smartmeter.0.6-0:9_4.value2 ... ' + state.val);
                            }
                            expect(state.val).to.exist;
                            expect(state.val).to.be.equal(82);
                            done();
                        });
                    });
                });
            });
        }, 17000);
    });

    after('Test ' + adapterShortName + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
