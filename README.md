# Lumi MQTT

MQTT агент для шлюза Xiaomi DGNWG05LM с прошивкой [OpenWRT 21.02.2](https://github.com/openlumi/openwrt/tags).  
Позволяет взаимодействовать со шлюзом через MQTT.

Взаимодействие | MQTT topic, получение | MQTT topic, управление
--- | --- | ---
Встроенный датчик освещения | lumi/illumination
Подсветка | lumi/lamp | lumi/lamp/set
Уведомление подсветкой |  | lumi/alarm/set
Кнопка | lumi/button/action
Воспроизводимый url, volume | lumi/audio/play | lumi/audio/play/set
Громкость | lumi/audio/volume | lumi/audio/volume/set
Голосовое уведомление |  | lumi/say/set

[Примеры команд](#примеры-команд)

---
Вопросы и обсуждение - https://t.me/lumi_mqtt

---
Для скачивания и работы необходимы пакеты node.js, git, mpc

Устанавливаем необходимые пакеты:

```
opkg update && opkg install node git-http mpc mpd-full
```

Скачиваем lumi:

```
mkdir /opt
cd /opt
git clone https://github.com/Beetle-II/lumi.git
cd lumi
cp config_example.json config.json
```

Изменяем конфигурационный файл config.json Указываем адрес своего сервера, логин и пароль

```json
{
  "sensor_debounce_period": 300,
  "sensor_treshhold": 50,
  "button_click_duration": 300,
          
  "homeassistant": true,
  "tts_cache": true,
  "sound_channel": "Master",
  "sound_volume": 50,
  "mqtt_url": "mqtt://адрес вашего сервера",
  "mqtt_topic": "lumi",
  "use_mac_in_mqtt_topic": false,
  "mqtt_options": {
    "port": 1883,
    "username": "логин сюда",
    "password": "пароль сюда",
    "keepalive": 60,
    "reconnectPeriod": 1000,
    "clean": true,
    "encoding": "utf8",
    "will": {
      "topic": "lumi/state",
      "payload": "offline",
      "qos": 1,
      "retain": true
    }
  }
}
```

Параметр | Описание
--- | ---
"homeassistant": true | уведомлять MQTT брокер об устройствах шлюза. Помогает добавлять устройства в HomeAssistant
||
"tts_cache": true | кешировать файлы TTS после воспроизведения
||
"sound_channel": "Master" | канал для вывода звука
"sound_volume": 50 | громкость, задаваемая по умолчанию
||
"sensor_debounce_period": 300 | период отправки данных о состоянии устройств (в секундах)
"sensor_treshhold": 50 | порог изменения состояния датчика, для моментальной отправки данных
"button_click_duration": 300 | время в мс между кликами кнопкой.
||
"use_mac_in_mqtt_topic": true | добавить MAC шлюза в MQTT топики

Запускаем:

```
node /opt/lumi/lumi.js
```

Проверяем что пошли данные от датчиков и добавляем в автозапуск:

```
cd /opt/lumi
chmod +x lumi
cp lumi /etc/init.d/lumi
/etc/init.d/lumi enable
/etc/init.d/lumi start
```

---

### Обновить до актуальной версии:

```
/etc/init.d/lumi stop
cd /opt/lumi
git pull
/etc/init.d/lumi start
```

---

### Примеры команд:

Топик | Значение | Описание
---|---|---
lumi/light/set | {"state":"ON"} | Включить подсветку
lumi/light/set | {"state":"ON", "color":{"r":50,"g":50,"b":50}} | Включить подсветку с указанным цветом
lumi/light/set | {"state":"ON", "timeout": 30} | Включить подсветку и выключить через указанное время (сек)
lumi/light/set | {"state":"OFF"} | Выключить подсветку
||
lumi/audio/play/set | "http://ep128.hostingradio.ru:8030/ep128" | Включить Радио Европа+
lumi/audio/play/set | "/tmp/test.mp3" | Воспроизвести локальный звуковой файл
lumi/audio/play/set | {"url": "https://air.radiorecord.ru:805/rr_320", "volume": 50} | Включить Радио рекорд с громкостью 50
lumi/audio/play/set | "STOP" | Выключить воспроизведение
||
lumi/audio/volume/set | 30 | Именить громкость на 30
||
lumi/say/set | "Привет" | Произнести 'Привет'
lumi/say/set | {"text": "Привет", "volume": 80} | Произнести 'Привет' с громкостью 80
lumi/say/set | {"text": "Hello", "lang": "en"} | Произнести 'Hello'
||
lumi/alarm/set | {"state":"ON"} | Включить мигание лампой
lumi/alarm/set | {"state":"ON", "color":{"r":50,"g":50,"b":50}} | Включить мигание лампой указанным цветом
lumi/alarm/set | {"state":"ON", "time": 1} | Включить мигание лампой с частотой 1 сек
lumi/alarm/set | {"state":"ON", "count": 5} | Включить мигание лампой 5 раз, после отключить
lumi/alarm/set | {"state":"OFF"} | Выключить мигание лампой