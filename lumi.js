const common = require('./common');
if (common.config.use_mac_in_mqtt_topic) {
    common.mac = '_' + require('os').networkInterfaces().wlan0[0].mac.replace(/:/g,'').toUpperCase();
    common.config.mqtt_topic = common.config.mqtt_topic + common.mac;
}
common.config.mqtt_options.clientId = 'mqtt_js_' + Math.random().toString(16).substr(2, 8);

const gateway = require('./gateway');
const mqtt = require('./mqtt_client');
const ble = require('./ble');

gateway.setVolume(50);

// Запускаем таймер 1
setInterval(() => {
    gateway.getIlluminance(common.config.sensor_treshhold);
}, 1 * 1000);

// Запускаем таймер 2 для публикации состояний датчиков
let timer_ID = setTimeout( function tick() {
    common.myLog('timer 2', common.colors.cyan);

    // Отправляем состояния устройств
    gateway.getState();
    if (common.config.use_ble) {
        ble.getDevices();
    }

    timer_ID = setTimeout(tick, common.config.sensor_debounce_period * 1000);
}, common.config.sensor_debounce_period * 1000);