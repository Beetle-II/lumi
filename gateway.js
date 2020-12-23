const fs = require('fs');
const http = require('http');
const googleTTS = require('google-tts-api');

myLog = require('./common').myLog;
color = require('./common').colors;

//////////////////

// Начальные параметры лампы
let lamp =
    {
        "color": {
            "r": 0,
            "g": 0,
            "b": 0
        },
        "state": "OFF",
        "brightness": 0,

        "path": {
            "r": "/sys/class/backlight/lumi_r/brightness",
            "g": "/sys/class/backlight/lumi_g/brightness",
            "b": "/sys/class/backlight/lumi_b/brightness"
        }
    }

// Получаем текущее состояние лампы
this.getLamp = () => {
    lamp.color.r = parseInt(fs.readFileSync(lamp.path.r).toString());
    lamp.color.g = parseInt(fs.readFileSync(lamp.path.g).toString());
    lamp.color.b = parseInt(fs.readFileSync(lamp.path.b).toString());

    if (lamp.color.r + lamp.color.g + lamp.color.b > 0) {
        lamp.state = 'ON';
    } else {
        lamp.state = 'OFF';
    }
    lamp.brightness = Math.round(0.2126 * lamp.color.r + 0.7152 * lamp.color.g + 0.0722 * lamp.color.b);

    // Публикуем, исключая path
    let l = JSON.stringify(lamp, ["color", "r", "g", "b", "state", "brightness"]);
    require('./mqtt_client').publish_lamp(l);
}

// Меняем состояние лампы в зависимости от полученных данных
this.setLamp = obj => {
    try {
        if (obj.state === 'OFF') {
            fs.writeFileSync(lamp.path.r, 0);
            fs.writeFileSync(lamp.path.g, 0);
            fs.writeFileSync(lamp.path.b, 0);
        } else {
            if (obj.color.r !== lamp.color.r) {
                fs.writeFileSync(lamp.path.r, obj.color.r);
            }
            if (obj.color.g !== lamp.color.g) {
                fs.writeFileSync(lamp.path.g, obj.color.g);
            }
            if (obj.color.b !== lamp.color.b) {
                fs.writeFileSync(lamp.path.b, obj.color.b);
            }
        }
    } catch (e) {
        myLog(e, color.red);
    }

    this.getLamp();
}

// Отправляем данные датчика освещенности
this.getIlluminance = () => {
    require('./mqtt_client').publish_illuminance(parseInt(fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage5_raw').toString()));
}

// Отправляем данные о статусе шлюза
this.getStatus = () => {
    require('./mqtt_client').publish_status();
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

//////////////////

// Получаем состояние проигрывателя
this.getPlay = () => {
    require('./mqtt_client').publish_play(require('child_process').execSync("mpc current --format '%name% - %artist% - %title%'").toString().replace(/ -  -/g, ' -'));
}

// Включаем/выключаем проигрыватель
this.setPlay = (url) => {
    //require('child_process').execSync('mpg123 ' + obj);
    console.log('setPlay ' + url);
    if (url == '') {
        require('child_process').execSync('mpc stop');
    } else {
        require('child_process').execSync('mpc clear && mpc add ' + url + ' && mpc play');
    }

    this.getPlay();
}

// Получаем состояние о громкости
this.getVolume = () => require('./mqtt_client').publish_volume(require('child_process').execSync("amixer get Master | awk '$0~/%/{print $4}' | tr -d '[]%'").toString().split(require('os').EOL)[0]);

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
let device = '/dev/input/event0';
const options = {
    flags: 'r',
    encoding: null,
    fd: null,
    autoClose: true
};

fd = fs.createReadStream(device, options);

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
        console.log(event);
        if (event.type == 1 && event.code == 256) {
            require('./mqtt_client').publish_button(event.value);
        }
    }
});

fd.on('error', function (e) {
    console.error(e);
});