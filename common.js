const config = require('./config.json');

const colors = {
    "black": "\x1b[30m",
    "red": "\x1b[31m",
    "green": "\x1b[32m",
    "yellow": "\x1b[33m",
    "blue": "\x1b[34m",
    "purple": "\x1b[35m",
    "cyan": "\x1b[36m",
    "white": "\x1b[37m",
    "reset": "\x1b[0m"
}

function myLog(message, color = "\x1b[37m") {
    console.log(color, message, '\x1b[0m');
}

const mac = ''

module.exports = {
    config,
    colors,
    myLog,
    mac
}
