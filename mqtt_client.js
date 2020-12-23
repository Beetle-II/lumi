const common = require('./common');
const gateway = require('./gateway');

common.config.mqtt_options.clientId = 'mqtt_js_' + Math.random().toString(16).substr(2, 8);

const mqtt = require('mqtt');
const mqtt_client = mqtt.connect(common.config.mqtt_url, common.config.mqtt_options);

mqtt_client.on('connect', () => {
    common.myLog('mqtt_client.connect', common.colors.green);

    // Отправляем состояния устройств
    gateway.getStatus();
    gateway.getLamp();
    gateway.getIlluminance();
    gateway.getPlay();
    gateway.getVolume();

    mqtt_client.subscribe([common.config.mqtt_topic + '/+/set', common.config.mqtt_topic + '/+/+/set'], function () {
        common.myLog('mqtt_client.subscribe', common.colors.green);
    });
});

mqtt_client.on('message', (topic, message) => {
    common.myLog('topic= ' + topic + ', message = ' + message);
    try {
        switch (topic.split("/")[1]) {
            case 'light':
                // lumi/light/set
                gateway.setLamp(JSON.parse(message));
                break;
            case 'music':
                // lumi/music/volume/set
                // lumi/music/play/set
                switch (topic.split("/")[2]) {
                    case 'play':
                        gateway.setPlay(message.toString());
                        break;
                    case 'volume':
                        gateway.setVolume(message.toString());
                        break;
                }
                break;
            case 'say':
                // lumi/say/set
                gateway.setSay(message.toString());
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

this.publish_ble_sensor = (sensor) => {
    try {
        let sensor_name = sensor.type + '_' + sensor.id;

        const state_topic = common.config.mqtt_topic + '/ble/' + sensor.id + '/' + sensor.type;
        mqtt_client.publish(state_topic + '/state', sensor.value.toString(), {retain: false});
        mqtt_client.publish(state_topic + '/lastSeen', sensor.lastSeen.toString(), {retain: false});

        if (common.config.homeassistant) {
            const config_topic = 'homeassistant/' + 'sensor' + '/' + sensor.id + '/' + 'ble_' + sensor.type + '/config';
            let anons = {
                'name': sensor_name,
                'state_topic': state_topic,
                'unique_id': sensor_name,
                'device': {
                    'identifiers': [sensor_name],
                    'name': sensor_name,
                    'sw_version': '1.0',
                    'model': 'lumi',
                    'manufacturer': 'lumi'
                },
                'device_class': sensor.type
            };
            mqtt_client.publish(config_topic, JSON.stringify(anons), {retain: true});
        }
        common.myLog('publish sensor: ' + sensor.id + ', ' + sensor.value);
    } catch (e) {
        common.myLog(e, common.colors.red);
    }
}

this.publish_lamp = (lamp) => {
    common.myLog('publish lamp=' + lamp, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/light', lamp, {retain: false});
}

this.publish_illuminance = illuminance => {
    common.myLog('publish illuminance=' + illuminance, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/illuminance', illuminance.toString(), {retain: false});
}

this.publish_button = button => {
    common.myLog('publish button=' + button, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/button', button.toString(), {retain: false});
}

this.publish_status = () => {
    common.myLog('publish status', common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/status', 'online', {retain: false});
};

this.publish_play = name => {
    common.myLog('publish play ' + name, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/music/play', name, {retain: false});
};

this.publish_volume = volume => {
    common.myLog('publish volume ' + volume, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/music/volume', volume, {retain: false});
};