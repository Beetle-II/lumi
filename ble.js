const crypto = require('crypto');
const noble = require('@abandonware/noble');
const cp = require('child_process');

const common = require('./common');
const mqtt = require('./mqtt_client');

const BLE_devices = [];
const unit_of_measurement = {
    'temperature': '°C',
    'humidity': '%',
    'battery': '%'
}

if (common.config.use_ble) {
    cp.execSync('hciconfig hci0 up');

    //setInterval(() => {
    //    noble.startScanning([], true);
    //}, 3000);
    noble.startScanning([], true);
}

noble.on('discover', async (peripheral) => {
    try {
        let result = new miParser(peripheral.advertisement.serviceData[0].data, 'e85feb9d97474fcf329b0d611afb4e4a').parse();

        Object.keys(result.event).forEach(function (key) {
            if (!BLE_devices[peripheral.id]) {
                BLE_devices[peripheral.id] = {}
            }
            if (!BLE_devices[peripheral.id][key]) {
                BLE_devices[peripheral.id][key] = {
                    type: key,
                    unit_of_measurement: unit_of_measurement[key],
                    name: peripheral.advertisement.localName,
                    value: result.event[key],
                    lastSeen: Date.now()
                };
                common.myLog('store: ' + peripheral.id + ', ' + key + ' : ' + result.event[key]);
            } else {
                BLE_devices[peripheral.id][key].value = result.event[key];
                BLE_devices[peripheral.id][key].lastSeen = Date.now();
                //common.myLog('update: ' + peripheral.id + ', ' + key + ' : ' + result.event[key]);
            }
        });
    } catch (e) {
        //common.myLog(e, common.colors.res);
    }

});

// Отправляем информацию об устройствах
function getDevices() {
    let devices = {}
    Object.keys(BLE_devices).forEach(device_id => {
        devices.state_topic = common.config.mqtt_topic + '/' + device_id;
        devices.value = {};
        let device = BLE_devices[device_id];
        Object.keys(device).forEach(key => {
            let device_type = device[key].type;
            devices.value[device_type] = device[key].value;
            if (common.config.homeassistant) {
                let device_name = device_id + '_' + device_type;
                let dev = {
                    config_topic: 'homeassistant/sensor/' + device_id + '/' + device_type + '/config',
                    homeassistant: {
                        name: device_name,
                        unique_id: device_name,
                        device_class: device_type,
                        state_topic: devices.state_topic,
                        unit_of_measurement: device[key].unit_of_measurement,
                        value_template: '{{ value_json.' + device_type + ' }}',
                        device: {
                            name: device[key].name,
                            identifiers: [device[key].name],
                            sw_version: '1.0',
                            model: 'Xiaomi Gateway',
                            manufacturer: 'Xiaomi'
                        }
                    }
                };
                mqtt.publish_homeassistant(dev);
            }
        });
        mqtt.publish(devices);
    });
}

/////////////

const FrameControlFlags = {
    isFactoryNew: 1 << 0,
    isConnected: 1 << 1,
    isCentral: 1 << 2,
    isEncrypted: 1 << 3,
    hasMacAddress: 1 << 4,
    hasCapabilities: 1 << 5,
    hasEvent: 1 << 6,
    hasCustomData: 1 << 7,
    hasSubtitle: 1 << 8,
    hasBinding: 1 << 9
};

const CapabilityFlags = {
    connectable: 1 << 0,
    central: 1 << 1,
    secure: 1 << 2,
    io: (1 << 3) | (1 << 4)
};

const EventTypes = {
    temperature: 4100,
    humidity: 4102,
    illuminance: 4103,
    moisture: 4104,
    fertility: 4105,
    battery: 4106,
    temperatureAndHumidity: 4109
};

class miParser {
    constructor(buffer, bindKey = null) {
        this.baseByteLength = 5;
        if (buffer == null) {
            throw new Error("A buffer must be provided.");
        }
        this.buffer = buffer;
        if (buffer.length < this.baseByteLength) {
            throw new Error(
                `Service data length must be >= 5 bytes. ${this.toString()}`
            );
        }
        this.bindKey = bindKey;
    }

    parse = () => {
        this.frameControl = this.parseFrameControl();
        this.version = this.parseVersion();
        this.productId = this.parseProductId();
        this.frameCounter = this.parseFrameCounter();
        this.macAddress = this.parseMacAddress();
        this.capabilities = this.parseCapabilities();

        if (this.frameControl.isEncrypted) {
            this.decryptPayload();
        }

        this.eventType = this.parseEventType();
        this.eventLength = this.parseEventLength();
        this.event = this.parseEventData();
        return {
            frameControl: this.frameControl,
            event: this.event,
            productId: this.productId,
            frameCounter: this.frameCounter,
            macAddress: this.macAddress,
            eventType: this.eventType,
            capabilities: this.capabilities,
            eventLength: this.eventLength,
            version: this.version
        };
    };

    parseFrameControl = () => {
        const frameControl = this.buffer.readUInt16LE(0);
        return Object.keys(FrameControlFlags).reduce((map, flag) => {
            map[flag] = (frameControl & FrameControlFlags[flag]) !== 0;
            return map;
        }, {});
    };

    parseVersion = () => this.buffer.readUInt8(1) >> 4;

    parseProductId = () => this.buffer.readUInt16LE(2);

    parseFrameCounter = () => this.buffer.readUInt8(4);

    parseMacAddress = () => {
        if (!this.frameControl.hasMacAddress) {
            return null;
        }
        const macBuffer = this.buffer.slice(
            this.baseByteLength,
            this.baseByteLength + 6
        );
        return Buffer.from(macBuffer)
            .reverse()
            .toString("hex");
    };

    get capabilityOffset() {
        if (!this.frameControl.hasMacAddress) {
            return this.baseByteLength;
        }
        return 11;
    }

    parseCapabilities = () => {
        if (!this.frameControl.hasCapabilities) {
            return null;
        }
        const capabilities = this.buffer.readUInt8(this.capabilityOffset);
        return Object.keys(CapabilityFlags).reduce((map, flag) => {
            map[flag] = (capabilities & CapabilityFlags[flag]) !== 0;
            return map;
        }, {});
    };

    get eventOffset() {
        let offset = this.baseByteLength;
        if (this.frameControl.hasMacAddress) {
            offset = 11;
        }
        if (this.frameControl.hasCapabilities) {
            offset += 1;
        }

        return offset;
    }

    parseEventType = () => {
        if (!this.frameControl.hasEvent) {
            return null;
        }
        return this.buffer.readUInt16LE(this.eventOffset);
    };

    parseEventLength = () => {
        if (!this.frameControl.hasEvent) {
            return null;
        }
        return this.buffer.readUInt8(this.eventOffset + 2);
    };

    decryptPayload = () => {
        const msgLength = this.buffer.length;
        const eventLength = msgLength - this.eventOffset;

        if (eventLength < 3) {
            return;
        }
        if (this.bindKey == null) {
            throw Error("Sensor data is encrypted. Please configure a bindKey.");
        }

        const encryptedPayload = this.buffer.slice(this.eventOffset, msgLength);

        const nonce = Buffer.concat([
            this.buffer.slice(5, 11), //mac_reversed
            this.buffer.slice(2, 4), //device_type
            this.buffer.slice(4, 5), //frame_cnt
            encryptedPayload.slice(-7, -4) //ext_cnt
        ]);

        const decipher = crypto.createDecipheriv(
            "aes-128-ccm",
            Buffer.from(this.bindKey, "hex"), //key
            nonce, //iv
            {authTagLength: 4}
        );

        const ciphertext = encryptedPayload.slice(0, -7);

        decipher.setAuthTag(encryptedPayload.slice(-4));
        decipher.setAAD(Buffer.from("11", "hex"), {
            plaintextLength: ciphertext.length
        });

        const receivedPlaintext = decipher.update(ciphertext);

        decipher.final();

        this.buffer = Buffer.concat([
            this.buffer.slice(0, this.eventOffset),
            receivedPlaintext
        ]);
    };

    parseEventData = () => {
        if (!this.frameControl.hasEvent) {
            return null;
        }
        switch (this.eventType) {
            case EventTypes.temperature: {
                return this.parseTemperatureEvent();
            }
            case EventTypes.humidity: {
                return this.parseHumidityEvent();
            }
            case EventTypes.battery: {
                return this.parseBatteryEvent();
            }
            case EventTypes.temperatureAndHumidity: {
                return this.parseTemperatureAndHumidityEvent();
            }
            case EventTypes.fertility: {
                return this.parseFertilityEvent();
            }
            case EventTypes.moisture: {
                return this.parseMoistureEvent();
            }
            case EventTypes.illuminance: {
                return this.parseIlluminanceEvent();
            }
            default: {
                throw new Error(
                    `Unknown event type: ${this.eventType}. ${this.toString()}`
                );
            }
        }
    };

    parseTemperatureEvent = () => ({temperature: this.buffer.readInt16LE(this.eventOffset + 3) / 10});

    parseHumidityEvent = () => ({humidity: this.buffer.readUInt16LE(this.eventOffset + 3) / 10});

    parseBatteryEvent = () => ({battery: this.buffer.readUInt8(this.eventOffset + 3)});

    parseTemperatureAndHumidityEvent = () => {
        const temperature = this.buffer.readInt16LE(this.eventOffset + 3) / 10;
        const humidity = this.buffer.readUInt16LE(this.eventOffset + 5) / 10;
        return {temperature, humidity};
    };

    parseIlluminanceEvent = () => ({illuminance: this.buffer.readUIntLE(this.eventOffset + 3, 3)});

    parseFertilityEvent = () => ({fertility: this.buffer.readInt16LE(this.eventOffset + 3)});

    parseMoistureEvent = () => ({moisture: this.buffer.readInt8(this.eventOffset + 3)});

    toString = () => this.buffer.toString();
}

module.exports = {
    getDevices
}