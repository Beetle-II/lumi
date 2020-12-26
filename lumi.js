const common = require('./common');
const gateway = require('./gateway');
const ble = require('./ble');
const mqtt = require('./mqtt_client');

gateway.setVolume(50);

// Запускаем таймер на 60 секунд
setInterval(() => {
    common.myLog('timer 1', common.colors.purple);
    // Отправляем состояния устройств
    gateway.getIlluminance(common.config.sensor_treshhold);
}, 1 * 1000);

// Запускаем таймер для публикации состояний датчиков
let timer_ID = setTimeout( function tick() {
    common.myLog('timer 2', common.colors.cyan);

    // Отправляем состояния устройств
    gateway.getState();
    ble.getDevices();

    timer_ID = setTimeout(tick, common.config.sensor_debounce_period * 1000);
}, common.config.sensor_debounce_period * 1000);