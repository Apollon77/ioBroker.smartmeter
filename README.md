![Logo](admin/smartmeter.png)
# ioBroker.smartmeter

[![NPM version](http://img.shields.io/npm/v/iobroker.smartmeter.svg)](https://www.npmjs.com/package/iobroker.smartmeter)
[![Downloads](https://img.shields.io/npm/dm/iobroker.smartmeter.svg)](https://www.npmjs.com/package/iobroker.smartmeter)
[![Dependency Status](https://gemnasium.com/badges/github.com/Apollon77/ioBroker.smartmeter.svg)](https://gemnasium.com/github.com/Apollon77/ioBroker.smartmeter)
[![Code Climate](https://codeclimate.com/github/Apollon77/ioBroker.smartmeter/badges/gpa.svg)](https://codeclimate.com/github/Apollon77/ioBroker.smartmeter)

**Tests:** Linux/Mac: [![Travis-CI](http://img.shields.io/travis/Apollon77/ioBroker.smartmeter/master.svg)](https://travis-ci.org/Apollon77/ioBroker.smartmeter)
Windows: [![AppVeyor](https://ci.appveyor.com/api/projects/status/github/Apollon77/ioBroker.smartmeter?branch=master&svg=true)](https://ci.appveyor.com/project/Apollon77/ioBroker-smartmeter/)

[![NPM](https://nodei.co/npm/iobroker.smartmeter.png?downloads=true)](https://nodei.co/npm/iobroker.smartmeter/)

This adapter for ioBroker allows the reading and parsing of smartmeter protocols that follow the OBIS number logic to make their data available.

***The Adapter needs node 4.x or higher to work!***

## Description of parameters

### Data Protocol
Supported Protocols:
* **Sml**: SML (SmartMeterLanguage) as binary format
* **D0**: D0 (based on IEC 62056-21:2002/IEC 61107/EN 61107) as ASCII format (binary protocol mode E not supported currently)
* **Json-Efr**: OBIS data from EFR Smart Grid Hub (JSON format)

### Data Transfer
* **Serial Receiving**: receive through serial push data (smartmeter send data without any request on regular intervals). Mostly used for SML
* **Serial Bi-Directional Communication**: D0 protocol in modes A, B, C and D (mode E curently NOT supported!) with Wakeup-, Signon-, pot. ACK- and Data-messages to read out data (programing/write mode not implemented so far)
* **Http-Requests**: Read data via HTTP by requesting an defined URL
* **Local Files**: Read data from a local file

### Data request interval
Number of seconds to wait for next request or pause serial receiving, value 0 possible to restart directly after finishing one message,

Default: is 300 (=5 Minutes)

### Serial Device Baudrate
baudrate for initial serial connection, if not defined default values per Transport type are used (9600 for SerialResponseTransprt and 300 for SerialRequestResponseTransport)

### D0: SignOn-Message Command
command for SignIn-Message, default "?" to query mandatory fields, other values depending on device

## changelog
### 0.3.x
* Add possibility to overwrite serial connections settings and also D0 Mode for devices that send a wrong identification
* update smartmeter-obis library for memory optimizations

### 0.2.x
* Public release of Adapter after forum Tests
* remove all additional logging
* enhance Adapter config screenxw

### 0.1.1
* Update smartmeter-obis library to 0.2.5 to add Serial Timeout for Request/Response protocol

### 0.1.0
* Initial version for public testing

### 0.0.1
* Initial version for internal testing


## License

The MIT License (MIT)

Copyright (c) 2015-2017 Apollon77 <ingo@fischer-ka.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
