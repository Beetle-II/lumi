const fs = require('fs');
const http = require('http');
const googleTTS = require('google-tts-api');
const common = require('./common');

//const mac = require('os').networkInterfaces().wlan0[0].mac.replace(/:/g,'').toUpperCase();

//////////////////
let device = {
    identifiers: [ 'xiaomi_gateway' ],
    name: 'xiaomi_gateway',
    sw_version: '1.0',
    model: 'Xiaomi Gateway',
    manufacturer: 'Xiaomi'
}

let state = {
    state_topic: common.config.mqtt_topic + '/state',
    value: 'online'
}

// Начальные параметры лампы
let lamp = {
    state_topic: common.config.mqtt_topic + '/light',
    value: {
        color: {
            r: 0,
            g: 0,
            b: 0
        },
        state: 'OFF',
        brightness: 0
    },

    path: {
        r: '/sys/class/backlight/lumi_r/brightness',
        g: '/sys/class/backlight/lumi_g/brightness',
        b: '/sys/class/backlight/lumi_b/brightness'
    },

    config_topic: 'homeassistant/light/lumi_light/config',
    homeassistant: {
        name: 'Lumi Light',
        uniq_id: 'lumi_light',
        schema: 'json',
        rgb: true,
        stat_t: common.config.mqtt_topic + '/light',
        cmd_t: common.config.mqtt_topic + '/light/set',
        device: device
    }
}

let illuminance = {
    state_topic: common.config.mqtt_topic + '/illuminance',
    value: 0,

    config_topic: 'homeassistant/sensor/lumi_illuminance/config',
    homeassistant: {
        name: 'Lumi Illuminance',
        uniq_id: 'lumi_illuminance',
        dev_cla: 'illuminance',
        unit_of_meas: 'lx',
        stat_t: common.config.mqtt_topic + '/illuminance',
        device: device
    }
}

let button = {
    state_topic: common.config.mqtt_topic + '/button',
    value: 0,

    device: '/dev/input/event0',
    options: {
        flags: 'r',
        encoding: null,
        fd: null,
        autoClose: true
    },

    config_topic: 'homeassistant/device_automation/lumi_button/config',
    homeassistant: {
        automation_type: 'trigger',
        topic: common.config.mqtt_topic + '/button',
        type: 'button_short_press',
        subtype: 'button_1',
        device: device
    }
}

let music = {
    url: {
        state_topic: common.config.mqtt_topic + '/music/url',
        value: ''
    },
    volume: {
        state_topic: common.config.mqtt_topic + '/music/volume',
        value: 0
    }
}

///////////////

// Отправляем данные о статусе шлюза
this.getState = () => {
    require('./mqtt_client').publish(state);
    this.getIlluminance();
    this.getLamp();
    this.getPlay();
    this.getVolume();

    if (common.config.homeassistant) {
        require('./mqtt_client').publish_homeassistant(lamp);
        require('./mqtt_client').publish_homeassistant(illuminance);
        require('./mqtt_client').publish_homeassistant(button);
    }
}

// Получаем текущее состояние лампы
this.getLamp = () => {
    lamp.value.color.r = parseInt(fs.readFileSync(lamp.path.r).toString());
    lamp.value.color.g = parseInt(fs.readFileSync(lamp.path.g).toString());
    lamp.value.color.b = parseInt(fs.readFileSync(lamp.path.b).toString());

    if (lamp.value.color.r + lamp.value.color.g + lamp.value.color.b > 0) {
        lamp.value.state = 'ON';
    } else {
        lamp.value.state = 'OFF';
    }
    lamp.brightness = Math.round(0.2126 * lamp.value.color.r + 0.7152 * lamp.value.color.g + 0.0722 * lamp.value.color.b);
    require('./mqtt_client').publish(lamp);
}

// Меняем состояние лампы в зависимости от полученных данных
this.setLamp = obj => {
    try {
        if (obj.state === 'OFF') {
            fs.writeFileSync(lamp.path.r, 0);
            fs.writeFileSync(lamp.path.g, 0);
            fs.writeFileSync(lamp.path.b, 0);
        } else {
            if (obj.color.r !== lamp.value.color.r) {
                fs.writeFileSync(lamp.path.r, obj.color.r);
            }
            if (obj.color.g !== lamp.value.color.g) {
                fs.writeFileSync(lamp.path.g, obj.color.g);
            }
            if (obj.color.b !== lamp.value.color.b) {
                fs.writeFileSync(lamp.path.b, obj.color.b);
            }
        }
    } catch (e) {
        myLog(e, color.red);
    }
    this.getLamp();
}

// Мониторим данные яркости лампы
/*
fs.watch(lamp.path.r, (eventType) => {
    lamp.color.r = parseInt(fs.readFileSync(lamp.path.r).toString());
    lampSend();
});

fs.watch(lamp.path.g, (eventType) => {
    lamp.color.g = parseInt(fs.readFileSync(lamp.path.g).toString());
    lampSend();
});

fs.watch(lamp.path.b, (eventType) => {
    lamp.color.b = parseInt(fs.readFileSync(lamp.path.b).toString());
    lampSend();
});
*/


// Отправляем данные датчика освещенности
this.getIlluminance = () => {
    illuminance.value = parseInt(fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage5_raw').toString());
    require('./mqtt_client').publish(illuminance);
}

// Получаем состояние проигрывателя
this.getPlay = () => {
    music.url.value = require('child_process').execSync("mpc current --format '%name% - %artist% - %title%'").toString().replace(/ -  -/g, ' -');
    require('./mqtt_client').publish(music.url);
}

// Включаем/выключаем проигрыватель
this.setPlay = (url) => {
    if (url == '') {
        require('child_process').execSync('mpc stop');
    } else {
        require('child_process').execSync('mpc clear && mpc add ' + url + ' && mpc play');
    }
    setTimeout(() => {
        this.getPlay();
    }, 1 * 1000);
}

// Получаем состояние о громкости
this.getVolume = () => {
    music.volume.value = require('child_process').execSync("amixer get Master | awk '$0~/%/{print $4}' | tr -d '[]%'").toString().split(require('os').EOL)[0];
    require('./mqtt_client').publish(music.volume);
}

// Устанавливаем громкость
this.setVolume = volume => {
    require('child_process').execSync("amixer sset Master " + volume + "%");
    this.getVolume();
}

// Произнести указанный текст
this.setSay = (text) => {
    // googleTTS(text, 'ru', 1) // speed normal = 1 (default), slow = 0.24
    //     .then((url) => {
    //         let file = fs.createWriteStream('/tmp/google-tts.mp3');
    //         http.get(url, function(response) {
    //             response.pipe(file);
    //         });
    //         this.setPlay('/tmp/google-tts.mp3'); // https://translate.google.com/translate_tts?...
    //     })
    //     .catch((err) => {
    //         console.error(err.stack);
    //     });
}

//////////////////

// Получаем данные о кнопке

fd = fs.createReadStream(button.device, button.options);
fd.on('data', function (buf) {
    let i, j, chunk = 16;
    for (i = 0, j = buf.length; i < j; i += chunk) {
        let event = {
            tssec: buf.readUInt32LE(i),
            tsusec: buf.readUInt32LE(i + 4),
            type: buf.readUInt16LE(i + 8),
            code: buf.readUInt16LE(i + 10),
            value: buf.readUInt32LE(i + 12)
        };
        if (event.type == 1 && event.code == 256) {
            button.value = event.value;
            require('./mqtt_client').publish(button);
        }
    }
});

fd.on('error', function (e) {
    console.error(e);
});