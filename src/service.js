const ENV = process.env.NODE_ENV;
const INITSQLS = [
    "CREATE TABLE `clients` ( `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户名', `uuid` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户id', `port` int DEFAULT NULL COMMENT '端口', `offDate` datetime DEFAULT NULL COMMENT '结束时间', `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '备注', `createTime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', `updateTime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间', `up` bigint DEFAULT '0' COMMENT '上行数据量', `down` bigint DEFAULT '0' COMMENT '下行数据量', `isLastDay` tinyint DEFAULT '0' COMMENT '是否最后一天结算', `traffic` int DEFAULT '0' COMMENT '流量', `price` float DEFAULT '0' COMMENT '每月费用', PRIMARY KEY (`id`), UNIQUE KEY `email_UNIQUE` (`email`)) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;"
]
const CREATEDBSQL = "create database if not exists `vpn`;"

const io = require("socket.io-client");
const { exec } = require('child_process');
const {mergeDeep} = require('./util')

const {
    connectDB,
    closeDB,
    queryPromise,
    mysqlPromise
} = require('./mysql')

const fetch = require('node-fetch');
const fs = require('fs')
const path = require('path')
const nodemailer = require("nodemailer");
const LOGFOLDER = 'logs'
const {
    dev,
    prod
} = require('../configs.js')
// const nodelogger = require('node-logger')
const opts = {
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
    errorEventName:'error',
    logDirectory: path.resolve(LOGFOLDER), // NOTE: folder must exist and be writable...
    fileNamePattern:'<DATE>.log',
    dateFormat:'YYYY-MM-DD'
};
const logger = require('simple-node-logger').createRollingFileLogger( opts );

const selfParams = require(path.resolve('params.js'))

const schedule = require('node-schedule');

let scheduleJobs = []
let ACCESSTOKEN = undefined
// let mailIns = undefined
let socketClient = undefined
let scheduleTimeCof = selfParams.scheduleTime
// let logger = undefined;

function getConfigs() {
    return ENV === 'production' ? prod : dev;
}

const initAction = async function() {
    if (!fs.existsSync(path.resolve(LOGFOLDER))) {
        fs.mkdirSync(path.resolve(LOGFOLDER))
    }
    await autoDeleteLog()
    
    console.log('连接数据库')
    const _configs = getConfigs();
    const _dbset = _configs.database
    const _fdbset = {
        host: _dbset.host,
        user: _dbset.user,
        password: _dbset.password,
        port: _dbset.port
    };
    await connectDB(_fdbset)
    const _cdbres = await queryPromise(CREATEDBSQL)
    logger.info(`执行自动创建数据库${_cdbres.success?'成功':'失败:'+JSON.stringify(_cdbres)}`)
    await closeDB()
    await connectDB()
    for (let i = 0; i < INITSQLS.length; i++) {
        const _res = await queryPromise(INITSQLS[i])
        logger.info(`执行自动创建${i}表${_res.success?'成功':'失败:'+JSON.stringify(_res)}`)
    }
    await closeDB()
}
function execCommand(command) {
    return new Promise(resolve=>{
        try {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                if (stdout) {
                    // fs.writeFileSync(path.resolve('pm2list.txt'), stdout, {encoding: 'utf-8'})
                    resolve({
                        success: true,
                        message: `exec command success`
                    })
                } else {
                    resolve({
                        success: false,
                        message: `exec command failure`
                    })
                }
            });
        } catch(err) {
            resolve({
                success: false,
                message: `error : ${JSON.stringify(err)}`
            })
        }
    })
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function autoDeleteLog() {
    const logFolder = path.resolve(LOGFOLDER)
    if (fs.existsSync(logFolder) && fs.statSync(logFolder) && fs.statSync(logFolder).isDirectory()) {
        const _files = fs.readdirSync(logFolder)
        if (_files.length) {
            // 5天前
            const _spDateAgo = new Date().getTime() - 86400 * 1000 * 5
            _files.forEach(val=>{
                const _filePath = path.resolve(logFolder+'/'+val)
                if (fs.existsSync(_filePath)) {
                    const _fileStat = fs.statSync(_filePath)
                    if (_fileStat.isFile() && new Date(_fileStat.birthtime).getTime() < _spDateAgo) {
                        fs.unlinkSync(_filePath)
                    }
                }  
            })
        }
    }
}

function sleep(_start=9000, _end=12000) {
    const _time = getRandomIntInclusive(_start, _end)
    return new Promise(resolve => {
        setTimeout(()=>{
            resolve()
        }, _time)
    })
}

async function login(params) {
    
}

exports = module.exports = {
    // 初始化
    initAction,
    getRandomIntInclusive,
    sleep,
    login
}