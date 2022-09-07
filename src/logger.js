const path = require('path')
const fs = require('fs')
const LOGFOLDER = 'logs'
const logsFolder = path.resolve(LOGFOLDER)
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
const logger = require('simple-node-logger').createRollingFileLogger(opts)

module.exports = logger;
