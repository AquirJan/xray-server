const path = require('path')
function setupLogger(){
    try {
        const LOGFOLDER = 'logs'
        const opts = {
            timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
            errorEventName:'error',
            logDirectory: path.resolve(LOGFOLDER), // NOTE: folder must exist and be writable...
            fileNamePattern:'<DATE>.log',
            dateFormat:'YYYY-MM-DD'
        };
        return require('simple-node-logger').createRollingFileLogger( opts );
    } catch(error) {
        console.log(`setup logger error : ${error.message}`)
        return false;
    }
}

exports = module.exports = setupLogger