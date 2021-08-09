const ENV = process.env.NODE_ENV;
const INITSQLS = [
    "CREATE TABLE IF NOT EXISTS `users` ( `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户名', `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', `passwd` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '密码', `last_time` datetime DEFAULT NULL COMMENT '上次登录时间', `off_time` datetime DEFAULT NULL COMMENT '截止时间', PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `clients` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户名', `uuid` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户id', `port` int DEFAULT NULL COMMENT '端口', `off_date` datetime DEFAULT NULL COMMENT '结束时间', `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '备注', `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间', `up` bigint DEFAULT '0' COMMENT '上行数据量', `down` bigint DEFAULT '0' COMMENT '下行数据量', `is_last_day` tinyint DEFAULT '0' COMMENT '是否最后一天结算', `traffic` int DEFAULT '0' COMMENT '可用流量', `price` float DEFAULT '0' COMMENT '每月费用', PRIMARY KEY (`id`), UNIQUE KEY `email_UNIQUE` (`email`) ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
]
const CREATEDBSQL = "create database if not exists `vpndb`;"

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
const schedule = require('node-schedule');
const LOGFOLDER = 'logs'
let Tokens = []
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

function getConfigs() {
    return ENV === 'production' ? prod : dev;
}

const initAction = async function() {
    if (!fs.existsSync(path.resolve(LOGFOLDER))) {
        fs.mkdirSync(path.resolve(LOGFOLDER))
    }
    // 每日任务
    schedule.scheduleJob('0 0 6 * * *', ()=>{
      logger.info('每日任务')
      autoDeleteLog()
    });
    autoDeleteLog()
    
    // console.log('连接数据库')
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

    logger.info(`执行自动创建数据库${_cdbres.success?'成功':'失败:'+JSON.stringify(_cdbres.data)}`)
    await closeDB()
    const _resSheet = await connectDB()
    if (_resSheet.success) {
        for (let i = 0; i < INITSQLS.length; i++) {
            const _res = await queryPromise(INITSQLS[i])
            logger.info(`执行自动创建${i}表${_res.success?'成功':'失败:'+JSON.stringify(_res.data)}`)
        }
        await closeDB()
    }
    
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

function findOutToken(name) {
  if (!name || !Tokens || !Tokens.length) {
    return undefined;
  }
  let _matchUserIndex = undefined;
  for(let i=0;i<Tokens.length;i++) {
    if (Tokens[i].name === name) {
      _matchUserIndex = i;
      break;
    }
  }
  return _matchUserIndex
}

function listClients({page, size, conditions}) {
  return new Promise(async resolve => {
    let _sql = [`select * from clients`]
    const _keyMap = ['email', 'remark', 'off_date', 'uuid', 'port', 'traffic', 'price']
    if (conditions) {
      for (let key in conditions) {
        if (_keyMap.includes(key)) {
          if (_sql.length === 1) {
            _sql.push('where')
          } else {
            _sql.push('and')
          }
          _sql.push(`${key} like '%${conditions[key]}%'`)
        }
      }
    }
    _sql.push(`order by create_time desc limit ${size} offset ${(page-1)*size};`)
    _sql = _sql.join(' ')
    const _res = await mysqlPromise(_sql)
    resolve(_res)
  })
}

function login({name, password}) {
  return new Promise(async resolve => {
    const { data, message, success} = await mysqlPromise(`select * from users where name = '${name}'`)
    if (!success) {
      resolve({
        success: false, 
        message, 
        data
      })
      return;
    }
    if (!data || !data.length) {
      resolve({
        success: false,
        message: `login failure : can not found user [${name}]`
      })
      return;
    }
    const _user = data[0];
    if (password === _user.passwd) {
      const _matchUserIndex = findOutToken(name)
      if (_matchUserIndex) {
        // 触发单点登陆/另一台机器登陆/删除匹配信息
        // console.log('触发单点登陆/另一台机器登陆/删除匹配信息')
        Tokens.splice(_matchUserIndex, 1)
      } 
      const _offtime = (new Date()).getTime() + 86400 * 1000 * 2 // token有效期2天
      await mysqlPromise(`update users set lastTime = '${(new Date()).format('yyyy-MM-dd hh:mm:ss')}', offTime = '${(new Date(_offtime)).format('yyyy-MM-dd hh:mm:ss')}' where id = ${_user.id}`)
      const _token = (Buffer.from(JSON.stringify({"name":name, "offTime": _offtime}))).toString('base64')
      Tokens.push({
        token: _token,
        name: name,
        offTime: _offtime
      })
      resolve({
        token: _token,
        success: true,
        message:  'login success'
      })
      return;
    } else {
      resolve({
        success: false,
        message:  'login failure: password error'
      })
    }
  })
}

function verifyToken(_realToken) {
  return new Promise(resolve => {
    let matchIndex = undefined;
    for (let i = 0; i<Tokens.length;i++) {
      const _item = Tokens[i]
      if (_item.token === _realToken) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex !== undefined) {
      const _realTokenObj = JSON.parse((Buffer.from(_realToken, 'base64')).toString())
      const _userOfftime = (new Date(_realTokenObj.off_time)).getTime()
      const _now = (new Date()).getTime()
      if (_now > _userOfftime) {
        Tokens.splice(matchIndex, 1);
        matchIndex = undefined;
        resolve({
          success: false,
          code: 401,
          message:  'user token over time'
        })
      } else {
        resolve({
          success: true,
          code: 200,
          message: 'verify token pass'
        })
      }
    } else {
      resolve({
        success: false,
        code: 401,
        message:  'operation forbidden, can not found token'
      })
    }
  })
}

async function addClient({email, uuid, port, off_date, price, traffic}){
  return new Promise(async resolve=> {
    let _sql = `INSERT INTO clients
     ( email, uuid, port, off_date, price, traffic ) 
     VALUES 
     ( '${email}', '${uuid}', '${port}', '${off_date}', '${price}', '${traffic}' );`
    const _res = await mysqlPromise(_sql)
    resolve(_res)
  })
}

async function updateClient({id, email, uuid, port, off_date, price, traffic}){
  return new Promise(async resolve=> {
    let _sql = `update clients set 
     email='${email}', uuid='${uuid}', port='${port}', off_date='${off_date}', 
     price='${price}', traffic='${traffic}' where id=${id};`
    const _res = await mysqlPromise(_sql)
    resolve(_res)
  })
}

async function deleteClient({id}) {
  return new Promise(async resolve=> {
    let _sql = `delete from clients where id=${id};`
    const _res = await mysqlPromise(_sql)
    resolve(_res)
  })
}

exports = module.exports = {
    // 初始化
    listClients,
    deleteClient,
    addClient,
    updateClient,
    verifyToken,
    initAction,
    getConfigs,
    getRandomIntInclusive,
    sleep,
    login
}