const fs = require('fs');

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
    "state" : "OFF",
    "brightness": 0,

    "path": {
        "r": "/sys/class/backlight/lumi_r/brightness",
        "g": "/sys/class/backlight/lumi_g/brightness",
        "b": "/sys/class/backlight/lumi_b/brightness"
    }
}

// Получаем текущее состояние лампы
this.lamp = () => {
    lamp.color.r = parseInt(fs.readFileSync(lamp.path.r).toString());
    lamp.color.g = parseInt(fs.readFileSync(lamp.path.g).toString());
    lamp.color.b = parseInt(fs.readFileSync(lamp.path.b).toString());
    lampSend();
}

// Меняем состояние лампы в зависимости от полученных данных
this.lampSet = obj => {
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
        myLog(e,color.red);
    }
    lampSend();
}

// Публикуем состояние лампы
function lampSend() {
    if (lamp.color.r + lamp.color.g + lamp.color.b > 0) {
        lamp.state = 'ON';
    } else {
        lamp.state = 'OFF';
    }
    lamp.brightness = Math.round(0.2126 * lamp.color.r + 0.7152 * lamp.color.g + 0.0722 * lamp.color.b);
    // Публикуем, исключая path
    require('./mqtt_client').publish_lamp(JSON.stringify(lamp, ["color", "r", "g", "b", "state", "brightness"]));
}

// Отправляем данные датчика освещенности
this.illuminance = () => {
    let illuminance = parseInt(fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage5_raw').toString());
    require('./mqtt_client').publish_illuminance(illuminance);
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

// Получаем состояние о громкости
this.volume = () => require('child_process').execSync("amixer get Master | awk '$0~/%/{print $4}' | tr -d '[]%'").toString().split(require('os').EOL)[0]

// Устанавливаем громкость
this.volumeSet = volume => {
    require('child_process').execSync("amixer sset 'Master' ${volume}%");
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