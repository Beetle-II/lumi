myLog = require('./common').myLog;
color = require('./common').colors;
sensor_debounce_period = require('./common').config.sensor_debounce_period;

const mqtt = require('./mqtt_client');
const ble = require('./ble');
const gateway = require('./gateway');

// Запускаем таймер на 60 секунд
setInterval(() => {
    myLog('timer', color.purple);
    // Отправляем состояния устройств
    gateway.illuminance();
}, 60 * 1000);

// Запускаем таймер для публикации состояний датчиков
let timer_ID = setTimeout( function tick() {
    myLog('timer', color.cyan);

    // Отправляем состояния устройств
    gateway.lamp();
    ble.devices();

    timer_ID = setTimeout(tick, sensor_debounce_period * 1000);
}, sensor_debounce_period * 1000);
