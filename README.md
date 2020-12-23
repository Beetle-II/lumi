# Lumi
MQTT агент для шлюза Xiaomi DGNWG05LM с прошивкой [OpenWRT](https://github.com/openlumi/xiaomi-gateway-openwrt).  
Позволяет отправлять информацию о BLE датчиках на MQTT сервер.  
Позволяет получать информацию со встроенного датчика освещения.  
Позволяет получать информацию и управлять встроенной подсветкой шлюза.  
Для скачивания и запуска необходимы дополнительно git и node.js

Добавляем репозиторий со свежими версиями и обновляем их:
```
echo 'src/gz openlumi https://openlumi.github.io/openwrt-packages/packages' >> /etc/opkg/customfeeds.conf
opkg update && opkg install git-http node
```
Скачиваем:
```
сd /opt
git clone https://github.com/Beetle-II/lumi.git
cd lumi
```
Изменяем конфигурационный файл config.json
Указываем адрес своего сервера, логин и пароль
```json
{
	"homeassistant": true,
	"sensor_debounce_period": 300,

	"mqtt_url": "mqtt://адрес вашего сервера",
	"mqtt_topic": "lumi",
	"mqtt_options": {
		"port": 1883,
		"username":"логин сюда",
		"password": "пароль сюда",
		"keepalive": 60,
		"reconnectPeriod": 1000,
		"clean": true,
		"encoding": "utf8"
	}
}
```
Параметр|Описание
------------ | -------------
"homeassistant": true|уведомлять MQTT брокер об устройствах шлюза. Помогает добавлять устройства в HomeAssistant
"sensor_debounce_period": 60|период отправки данных о состоянии устройств (в секундах)

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