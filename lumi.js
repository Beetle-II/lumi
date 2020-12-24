myLog = require('./common').myLog;
color = require('./common').colors;
sensor_debounce_period = require('./common').config.sensor_debounce_period;

const gateway = require('./gateway');
const ble = require('./ble');
const mqtt = require('./mqtt_client');

// Запускаем таймер на 60 секунд
setInterval(() => {
    myLog('timer 1', color.purple);
    // Отправляем состояния устройств
    gateway.getIlluminance();
}, 60 * 1000);

// Запускаем таймер для публикации состояний датчиков
let timer_ID = setTimeout( function tick() {
    myLog('timer 2', color.cyan);

    // Отправляем состояния устройств
    gateway.getState();
    ble.getDevices();

    timer_ID = setTimeout(tick, sensor_debounce_period * 1000);
}, sensor_debounce_period * 1000);
