# Lumi

MQTT агент для шлюза Xiaomi DGNWG05LM с прошивкой [OpenWRT](https://github.com/openlumi/xiaomi-gateway-openwrt).  
Позволяет взаимодействовать со шлюзом через MQTT.

Взаимодействие | MQTT topic, получение | MQTT topic, управление
--- | --- | ---
Встроенный датчик освещения | lumi/illumination
Подсветка | lumi/lamp | lumi/lamp/set
Кнопка | lumi/button
Воспроизводимый url, volume | lumi/audio/play | lumi/audio/play/set
Громкость | lumi/audio/volume | lumi/audio/volume/set
Голосовое уведомление |  | lumi/say/set
BLE устройства | lumi/{MAC} |

{MAC} - адрес bluetooth устройства.

Для скачивания и работы необходимы пакеты node.js, git, mpc

Добавляем репозиторий со свежими версиями Node и устанавливаем необходимые пакеты:

```
wget https://openlumi.github.io/openwrt-packages/public.key -O /tmp/public.key
opkg-key add /tmp/public.key
echo 'src/gz openlumi https://openlumi.github.io/openwrt-packages/packages/19.07/arm_cortex-a9_neon' >> /etc/opkg/customfeeds.conf

opkg update && opkg install node git-http mpc
```

Скачиваем:

```
сd /opt
git clone https://github.com/Beetle-II/lumi.git
cd lumi
```

Изменяем конфигурационный файл config.json Указываем адрес своего сервера, логин и пароль

```json
{
  "homeassistant": true,
  "sensor_debounce_period": 300,
  "mqtt_url": "mqtt://адрес вашего сервера",
  "mqtt_topic": "lumi",
  "mqtt_options": {
    "port": 1883,
    "username": "логин сюда",
    "password": "пароль сюда",
    "keepalive": 60,
    "reconnectPeriod": 1000,
    "clean": true,
    "encoding": "utf8"
  }
}
```

Параметр | Описание
--- | ---
"homeassistant": true | уведомлять MQTT брокер об устройствах шлюза. Помогает добавлять устройства в HomeAssistant
"sensor_debounce_period": 300 | период отправки данных о состоянии устройств (в секундах)

Запускаем:

```
node /opt/lumi/lumi.js
```

Проверяем что пошли данные от датчиков и добавляем в автозапуск:

```
chmod +x lumi
cp lumi /etc/init.d/lumi
/etc/init.d/lumi enable
/etc/init.d/lumi start
```

### Примеры команд:

Топик | Значение | Описание
--- | --- | ---
lumi/light/set | {"color":{"r":50,"g":50,"b":50},"state":"ON"} | Включить подсветку
lumi/light/set | {"state":"OFF"} | Выключить подсветку
 | |
lumi/audio/play/set | {"url": "http://ep128.hostingradio.ru:8030/ep128"} | Включить Радио Европа+
lumi/audio/play/set | {"url": "https://air.radiorecord.ru:805/rr_320", "volume": 50} | Включить Радио рекорд с громкостью 50
lumi/audio/play/set | {"url": ""} | Выключить воспроизведение
| |
lumi/audio/volume/set | 30 | Именить громкость на 30
| |
lumi/say/set | {"text": "Привет"} | Произнести 'Привет'
lumi/say/set | {"text": "Привет", "volume": 80} | Произнести 'Привет' с громкостью 80
| |
