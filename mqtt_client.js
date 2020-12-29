const common = require('./common');
const gateway = require('./gateway');
const mqtt = require('mqtt');
const mqtt_client = mqtt.connect(common.config.mqtt_url, common.config.mqtt_options);

mqtt_client.on('connect', () => {
    common.myLog('mqtt_client.connect', common.colors.green);

    // Отправляем состояния устройств
    gateway.getState();
    gateway.getLamp();
    gateway.getIlluminance();
    gateway.getPlay();
    gateway.getVolume();

    mqtt_client.subscribe([common.config.mqtt_topic + '/+/set', common.config.mqtt_topic + '/+/+/set'], function () {
        common.myLog('mqtt_client.subscribe', common.colors.green);
    });
});

mqtt_client.on('message', (topic, message) => {
    common.myLog('Получен topic= ' + topic, common.colors.yellow);
    common.myLog('message = ' + message);
    try {
        switch (topic.split("/")[1]) {
            case 'light':
                // lumi/light/set
                gateway.setLamp(message);
                break;
            case 'audio':
                // lumi/audio/volume/set
                // lumi/audio/play/set
                switch (topic.split("/")[2]) {
                    case 'play':
                        gateway.setPlay(message);
                        break;
                    case 'volume':
                        gateway.setVolume(message);
                        break;
                }
                break;
            case 'say':
                // lumi/say/set
                gateway.setSay(message);
                break;
        }
    } catch (err) {
        common.myLog(err, common.colors.red);
    }
});

mqtt_client.on('error', err => {
    common.myLog(err, common.colors.red);
});

//////////////////

function publish(device) {
    try {
        mqtt_client.publish(device.state_topic, JSON.stringify(device.value), {retain: false});
    } catch (e) {
        common.myLog(e, common.colors.red);
    }
}

function publish_homeassistant(device) {
    try {
        mqtt_client.publish(device.config_topic, JSON.stringify(device.homeassistant), {retain: true});
    } catch (e) {
        common.myLog(e, common.colors.red);
    }
}

module.exports = {
    publish,
    publish_homeassistant
}