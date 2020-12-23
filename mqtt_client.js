const common = require('./common');
const gateway = require('./gateway');

common.config.mqtt_options.clientId = 'mqtt_js_' + Math.random().toString(16).substr(2, 8);

const mqtt = require('mqtt');
const mqtt_client = mqtt.connect(common.config.mqtt_url, common.config.mqtt_options);

mqtt_client.on('connect', () => {
    common.myLog('mqtt_client.connect', common.colors.green);

    // Отправляем состояния устройств
    gateway.lamp();
    gateway.illuminance();

    mqtt_client.subscribe([common.config.mqtt_topic + '/+/set'], function () {
        common.myLog('mqtt_client.subscribe', common.colors.green);
    });
});

mqtt_client.on('message', (topic, message) => {
    common.myLog('topic= ' + topic + ', message = ' + message);
    try {
        msg = JSON.parse(message);
        let obj = topic.split("/")[1];
        common.myLog('obj= ' + obj);
        common.myLog(msg);
        switch (obj) {
            // lumi/light/set
            case 'light':
                gateway.lampSet(msg);
                break;
            case 'music':
                //zesp32/playSound/00158D000317C9FB/kill/set
                //exec("killall mpg123");

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

this.publish_lamp = lamp => {
    common.myLog('publish lamp=' + lamp, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/light', lamp, {retain: false});
}

this.publish_illuminance = illuminance => {
    common.myLog('publish illuminance=' + illuminance, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/illuminance', illuminance.toString(), {retain: false});
}

this.publish_button = button => {
    common.myLog('publish button=' + button, common.colors.yellow);
    mqtt_client.publish(common.config.mqtt_topic + '/button', button.toString(), {retain: false}, function () {
    });
}