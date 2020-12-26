const common = require('./common');
const gateway = require('./gateway');
const ble = require('./ble');
const mqtt = require('./mqtt_client');

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
    ble.getDevices();

    timer_ID = setTimeout(tick, common.config.sensor_debounce_period * 1000);
}, common.config.sensor_debounce_period * 1000);