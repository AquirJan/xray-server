const path = require('path')
const fs = require('fs')
const logsFolder = path.resolve(global.LOGFOLDER)
if (fs.existsSync(logsFolder)) {
    fs.mkdirSync(logsFolder, {recursive: true})
}
const opts = {
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
    errorEventName:'error',
    logDirectory: logsFolder, // NOTE: folder must exist and be writable...
    fileNamePattern:'<DATE>.log',
    dateFormat:'YYYY-MM-DD'
}
const _logger = require('simple-node-logger').createRollingFileLogger(opts)

const logger = {
    info: function(logs){
        console.log(logs)
        _logger.info(logs)
    },
    warn: function(logs){
        console.warn(logs)
        _logger.warn(logs)
    }
}

module.exports = logger;
