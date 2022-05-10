const ENV = process.env.NODE_ENV;
const INITSQLS = [
    "CREATE TABLE IF NOT EXISTS `users` ( `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户名', `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', `passwd` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '密码', `last_time` datetime DEFAULT NULL COMMENT '上次登录时间', `off_time` datetime DEFAULT NULL COMMENT '截止时间', `remark` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `clients` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户名', `uuid` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户id', `port` int DEFAULT NULL COMMENT '端口', `off_date` datetime DEFAULT NULL COMMENT '结束时间', `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '备注', `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间', `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间', `up` bigint DEFAULT '0' COMMENT '上行数据量', `down` bigint DEFAULT '0' COMMENT '下行数据量', `traffic` int DEFAULT '0' COMMENT '可用流量', `price` float DEFAULT '0' COMMENT '每月费用', PRIMARY KEY (`id`), UNIQUE KEY `email_UNIQUE` (`email`) ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
]
const CREATEDBSQL = "create database if not exists `vpndb`;"

// const io = require("socket.io-client");
const { exec, execSync } = require('child_process');
// const {mergeDeep} = require('./util')

const {
    connectDB,
    closeDB,
    // queryPromise,
    queryPromise
} = require('./mysql')

const fetch = require('node-fetch');
const fs = require('fs')
const path = require('path')
const nodemailer = require("nodemailer");
const schedule = require('node-schedule');
const QRCode = require('qrcode')


let Tokens = []
const {
  dev,
  prod
} = require('../configs.js')
// const nodelogger = require('node-logger')
let mailerTransporter = undefined;
const LOGFOLDER = 'logs'
let logger = undefined;
let scheduleJobList = {}

function getConfigs() {
  return ENV === 'production' ? prod : dev;
}

function isDevEnv() {
  return ENV !== 'production';
}

function initAction() {
  return new Promise(async resolve=>{
    let _result = {
      success: false,
      data: null,
      message: ''
    }
    try {
      if (!fs.existsSync(path.resolve(LOGFOLDER))) {
        fs.mkdirSync(path.resolve(LOGFOLDER))
      }
      const opts = {
        timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
        errorEventName:'error',
        logDirectory: path.resolve(LOGFOLDER), // NOTE: folder must exist and be writable...
        fileNamePattern:'<DATE>.log',
        dateFormat:'YYYY-MM-DD'
      };
      logger = require('simple-node-logger').createRollingFileLogger( opts );
      // initMailer()
      // 每日任务
      // schedule.scheduleJob('0 0 9 * * *', ()=>{
      //   logger.info('每日任务')
      //   autoDeleteLog()
      // });
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
      console.log(`执行自动创建数据库${_cdbres.success?'成功':'失败:'+JSON.stringify(_cdbres.data)}`)
      logger.info(`执行自动创建数据库${_cdbres.success?'成功':'失败:'+JSON.stringify(_cdbres.data)}`)
      await closeDB()
      const _resSheet = await connectDB()
      if (_resSheet.success) {
        for await (const [index, item] of INITSQLS.entries()) {
          const _res = await queryPromise(item)
          logger.info(`执行自动创建${index}表${_res.success?'成功':'失败:'+JSON.stringify(_res.data)}`)
          if (!_res.success) {
            break;
          }
        }
      }
      if (!isDevEnv()) {
        recombineConfigFile()
      }
      _result.success = true;
      _result.mesasge = '初始化完成'
      resolve(_result)
    } catch(err) {
      _result.message = err.message
      resolve(_result)
    }
  })
}

const initMailer = async function() {
  mailerTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'wing.free0@gmail.com',
      pass: 'Aquir239'
    }
  });
  // mailerTransporter.verify().then((e)=>{
  //   console.log('nodemailer verify')
  //   console.log(e)
  // }).catch((err) => {
  //   console.error(err)
  // });
  mailerTransporter.sendMail({
    from: 'wing.free0@gmail.com', // sender address
    to: "aquirjan@icloud.com", // list of receivers
    subject: "Medium @edigleyssonsilva ✔", // Subject line
    text: "There is a new article. It's about sending emails, check it out!", // plain text body
    html: "<b>There is a new article. It's about sending emails, check it out!</b>", // html body
  }).then(info => {
    console.log({info});
  }).catch(console.error);
  
}

function execCommand(command) {
  return new Promise(resolve=>{
    try {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // console.error(`exec error: ${error}`);
          throw new Error(`exec command failure`)
        }
        resolve({
          success: true,
          data: {
            stdout,
            stderr
          },
          message: `exec command success`
        })
      });
    } catch(err) {
      resolve({
        success: false,
        data: err,
        error: true,
        message: `execCommand error: ${err.message}`
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
            _sql.push('or')
          }
          _sql.push(`${key} like '%${conditions[key]}%'`)
        }
      }
    }
    _sql.push(`order by create_time desc limit ${size} offset ${(page-1)*size};`)
    _sql = _sql.join(' ')
    const _res = await queryPromise(_sql)
    resolve(_res)
  })
}

function login({name, password}) {
  return new Promise(async resolve => {
    const { data, message, success} = await queryPromise(`select * from users where name = '${name}'`)
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
      if (_matchUserIndex !== undefined) {
        // 触发单点登陆/另一台机器登陆/删除匹配信息
        logger.info('触发单点登陆/另一台机器登陆/删除匹配信息')
        Tokens.splice(_matchUserIndex, 1)
      } 
      const _offtime = (new Date()).getTime() + 86400 * 1000 * 2 // token有效期2天
      await queryPromise(`update users set last_time='${(new Date()).format('yyyy-MM-dd hh:mm:ss')}', off_time='${(new Date(_offtime)).format('yyyy-MM-dd hh:mm:ss')}' where id=${_user.id}`)
      const _token = (Buffer.from(JSON.stringify({"name":name, "off_time": _offtime}))).toString('base64')
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

function getRemainTraffic(id) {
  return new Promise(async resolve=>{
    try {
      if (!id) {
        throw new Error('miss necessary param [id]')
      }
      let _sql = `select * from clients where id=${id}`
      const _res = await queryPromise(_sql)
      if (!_res.success) {
        throw new Error(`getRemainTraffic db query error: ${_res.message}`)
      }
      if (!_res.data || !_res.data.length) {
        throw new Error(`getRemainTraffic db query error no datas: ${_res.message}`)
      }
      let _data = _res?.data?.[0]
      // console.log(_data)
      let _traffic = _data.traffic*Math.pow(1024, 3)
      let _remain = _traffic - (_data.up+_data.down)
      _remain = _remain > 0 ? -_remain : 0
      resolve({
        success: true,
        data: _remain,
        message: '查询成功'
      })
    } catch(err) {
      resolve({
        success: false,
        error: true,
        data: err,
        message: err.message
      })
    }
  })
}

function setupClientSchedule({email, off_date, id}) {
  let _off_date = new Date(off_date);
  if ((Date.now()) > (new Date(off_date).getTime())) {
    return;
  }
  if (!scheduleJobList) {
    scheduleJobList = {}
  }
  
  // schedule 功能对应时间点参数（秒，分，时，日，月，星期）
  let _scheduleTime = `${_off_date.format('ss')} ${_off_date.format('mm')} ${_off_date.format('hh')} ${_off_date.format('dd')} */1 *`
  console.log(`${email} setup off_date schedule action`)
  console.log(_scheduleTime)
  if (isDevEnv()) {
    _scheduleTime = `00 * * * * *`
  }
  console.log(_scheduleTime)
  const _scheduleName = email.replace(/\.|\@/gi, '_')
  console.log(_scheduleName)
  // const _scheduleNameDaily = `${_scheduleName}_daily`
  if (scheduleJobList[_scheduleName]){
    scheduleJobList[_scheduleName].cancel()
    delete scheduleJobList[_scheduleName];
  }
  const newScheduleJob = schedule.scheduleJob(_scheduleTime, async ()=>{
    // console.log(`${email} excute off_date schedule action`)
    const _remainTrafficRes = await getRemainTraffic(id)
    console.log(`\n${email} ${JSON.stringify(_remainTrafficRes)}`)
    _remainTraffic = _remainTrafficRes?.data || 0
    console.log(`${email} 账号剩余流量：${_remainTraffic}`)
    logger.info(`${email} 账号剩余流量：${_remainTraffic}`)
    restartService({email, id, remainTraffic: _remainTraffic})
    console.log(`今天月份 ${new Date().format('MM')}， 用户到期月份 ${new Date(off_date).format('MM')}`)
    logger.info(`今天月份 ${new Date().format('MM')}， 用户到期月份 ${new Date(off_date).format('MM')}`)
    if ((new Date().format('yyyy-MM')) >= (new Date(off_date).format('yyyy-MM'))) {
      if (scheduleJobList[_scheduleNameDaily]) {
        logger.info(`执行到期注销计划任务`)
        scheduleJobList[_scheduleNameDaily].cancel()
        delete scheduleJobList[_scheduleNameDaily];
      }
    }
  })
  scheduleJobList[_scheduleName] = newScheduleJob
}

async function addClient({email, uuid, port, off_date, price, traffic, remark}){
  return new Promise(async resolve=> {
    let _sql = `INSERT INTO clients ( email, uuid, port, off_date, price, traffic, remark ) VALUES ( '${email}', '${uuid}', '${port}', '${off_date}', '${price}', '${traffic}', '${remark}' );`
    const _res = await queryPromise(_sql)
    if (_res.success) {
      setupClientSchedule({email, off_date, id})
    }
    resolve(_res)
  })
}

async function updateClient({id, email, uuid, port, off_date, price, traffic, remark}){
  return new Promise(async resolve=> {
    let _sql = `update clients set email='${email}', uuid='${uuid}', port='${port}', off_date='${off_date}', price='${price}', traffic='${traffic}', remark='${remark}' where id=${id};`
    const _res = await queryPromise(_sql)
    if (_res.success) {
      setupClientSchedule({email, off_date, id})
    }
    resolve(_res)
  })
}

async function detectDuplicateAccount({email, uuid}){
  return new Promise(async resolve=> {
    let _sql = `select * from clients where email='${email}' or uuid='${uuid}';`
    const _res = await queryPromise(_sql)
    resolve(_res)
  })
}

async function deleteClient({id, email}) {
  return new Promise(async resolve=> {
    let _sql = `delete from clients where id=${id};`
    const _res = await queryPromise(_sql)
    if (_res.success) {
      if (scheduleJobList[email]){
        scheduleJobList[email].cancel()
        delete scheduleJobList[email];
      }
    }
    resolve(_res)
  })
}

function findOutOverdueClient() {
  return new Promise(async resolve => {
    let  _result = {
      success: false,
      data: null,
      message: ''
    }
    try {
      const _current_file = path.resolve(`current-clients.json`);
      if (fs.existsSync(_current_file)) {
        let _current_clients = fs.readFileSync(_current_file, {encoding:'utf-8'});
        _current_clients = JSON.parse(_current_clients)
        let _sql = `SELECT * FROM clients where traffic*POW(1024,3) > up+down;`
        const {success, data} = await queryPromise(_sql)
        if (!success) {
          logger.info(`查询可用账号出错`)
          throw new Error(`查询可用账号出错`)
        }
        let _current_emails = _current_clients.map(val => val.email).sort();
        let _overdue_emails = data.map(val => val.email).sort()
        logger.info('比较账号是否一致')
        resolve({
          success: true,
          data: _overdue_emails,
          result: JSON.stringify(_current_emails) === JSON.stringify(_overdue_emails)
        })
      } else {
        logger.info('current-clients.json 文件不存在')
        resolve({
          success: false,
          message: 'current-clients.json 文件不存在',
          result: true
        })
      }
    } catch(err) {
      _result.error = true;
      _result.message = err.message;
      _result.data = err;
      return resolve(_result)
    }
  })
}

async function statisticTraffic(reset=false) {
  return new Promise(async resolve=> {
    try {
      if (!isDevEnv()) {
        let _reset = reset ? ' -reset' : '' 
        // xray api statsquery --server=127.0.0.1:10088 -pattern "" > xray-stats.json
        const _cmd = `xray api statsquery --server=127.0.0.1:10088${_reset} -pattern "" > xray-stats.json`
        // console.log(_cmd)
        const {success, data, message} = await execCommand(_cmd)
        if (!success) {
          logger.info(`统计命令执行出错: ${message}`)
          throw new Error(`统计命令执行出错: ${message}`)
        }
      }
      let _xray_statistic_file = path.resolve('xray-stats.json')
      if (!fs.existsSync(_xray_statistic_file)) {
        logger.info(`xray-stats.json 统计文件不存在`)
        throw new Error('xray-stats.json 统计文件不存在')
      }
      let _statObj = fs.readFileSync(_xray_statistic_file, {encoding: 'utf-8'});
      // logger.info(_statObj)
      _statObj = JSON.parse(_statObj)
      if (!_statObj || !_statObj.stat) {
        logger.info(`统计流量数据体缺失stat对象`)
        throw new Error('统计流量数据体缺失stat对象')
      }
      let _obj = _statObj.stat.map(val => {
        if (val.name && val.name.match(/user/gi) && val.value) {
          let _value = Number(val.value)
          _value = isNaN(_value) ? 0 : _value;
          let _name_array = val.name.split('>>>')
          let _email = _name_array[1]
          let _direction = _name_array[3]
          let _tmpObj = {
            email: _email,
            direction: _direction,
            value: _value
          }
          return _tmpObj
        }
      })
      _obj = _obj.filter(val=>val!==undefined)
      // update vpndb.clients set up=(case when email = 'aquirjan@icloud.com' then up+1 end) where email in('wing.free0@gmail.com', 'aquirjan@icloud.com');
      if (_obj.length) {
        let _down_statements = []
        let _up_statements = []
        let _recombineStatObj = {}
        let _emails = []
        _obj.forEach(val => {
          _recombineStatObj[val.email] = _recombineStatObj[val.email] === undefined ? {} : _recombineStatObj[val.email];
          let _nums = Number(val.value);
          _nums = isNaN(_nums) ? 0 : _nums;
          if (val.direction === 'uplink') {
            _recombineStatObj[val.email]['up'] = _recombineStatObj[val.email]['up'] === undefined ? _nums : _recombineStatObj[val.email]['up']+_nums
          }
          if (val.direction === 'downlink') {
            _recombineStatObj[val.email]['down'] = _recombineStatObj[val.email]['down'] === undefined ? _nums : _recombineStatObj[val.email]['down']+_nums
          }
          _emails.push(`'${val.email}'`)
        })
        
        let _emailSet = Array.from(new Set(_emails)); 
        _emailSet.forEach(val => {
          let _item = _recombineStatObj[val.replace(/\'|\"/gi, '')]
          if (_item){
            if (_item.up !== undefined) {
              _up_statements.push(`when email = ${val} then up+${_item.up}`)
            } else {
              _up_statements.push(`when email = ${val} then up+0`)
            }
            if (_item.down !== undefined) {
              _down_statements.push(`when email = ${val} then down+${_item.down}`)
            } else {
              _down_statements.push(`when email = ${val} then down+0`)
            }
          }
        })
        if (!_down_statements.length && !_up_statements.length) {
          return resolve({
            success: true,
            message: '没有需要更新的数据'
          })
        }
        if (_up_statements.length) {
          _up_statements = `up=( case ${_up_statements.join(' ')} end )`
        } else {
          _up_statements = ``
        }
        if (_down_statements.length) {
          _down_statements = `down=( case ${_down_statements.join(' ')} end )`
        } else {
          _down_statements = ``
        }
        _emails = `email in(${Array.from(new Set(_emails)).join(',')})`
        
        let _setColumns = [_up_statements, _down_statements].join(',')
        let _sql = `update clients set ${_setColumns} where ${_emails};`
        logger.info('更新流量数据')
        logger.info(_sql)
        const _res = await queryPromise(_sql)
        resolve(_res)
      } else {
        logger.info('没有需要更新的流量统计数据')
        resolve({
          success: true,
          message: '没有需要更新的流量统计数据'
        })
      }
    } catch(err) {
      logger.info('statisticTraffic Error: '+err.message)
      resolve({
        success: false,
        data: err,
        error: true,
        message: `statisticTraffic Error: ${err.message}`
      })
    }
  })
}

function resetTraffic({email, id, remainTraffic=0}) {
  return new Promise(async resolve => {
    try {
      if (!isDevEnv()) {
        const {success, data, message} = await execCommand(`xray api statsquery --server=127.0.0.1:10088 -pattern "${email}" -reset`)
        if (!success) {
          logger.info(`重置流量命令执行出错: ${message}`)
          throw new Error(`重置流量命令执行出错: ${message}`)
        }
      }
      console.log(`重置流量命令成功`)
      logger.info(`重置流量命令成功`)
      let _sql = `update clients set up=0, down=${remainTraffic} where email='${email}' and id=${id};`
      const _res = await queryPromise(_sql)
      console.log(`重置流量${_res.success?'成功': '失败'}`)
      logger.info(`重置流量${_res.success?'成功': '失败'}`)
      resolve(_res)
    } catch(err) {
      logger.info('resetTraffic Error: '+err.message)
      resolve({
        success: false,
        data: err,
        error: true,
        message: `resetTraffic Error: ${err.message}`
      })
    }
  })
}

function restartService(params) {
  return new Promise(async resolve => {
    try {
      logger.info('重启服务开始')
      const _res_backupConfigFile = await backupConfigFile()
      if (!_res_backupConfigFile.success) {
        throw new Error(`${_res_backupConfigFile.message}`)
      }
      const _res_recombine = await recombineConfigFile()
      if (!_res_recombine.success) {
        throw new Error(`${_res_recombine.message}`)
      }
      if (params) {
        const {email, id, remainTraffic} = params;
        const _res_resetTraffic = await resetTraffic({email, id, remainTraffic})
        if (!_res_resetTraffic.success) {
          throw new Error(`${_res_resetTraffic.message}`)
        }
      }
      if (!isDevEnv()) {
        const _res_changeConfig = await execCommand(`cp xray-config.json /usr/local/etc/xray/config.json`)
        logger.info(`覆盖xray配置文件${_res_changeConfig.success?'成功':'失败'}`)
        if (!_res_changeConfig.success) {
          throw new Error(`覆盖xray配置文件失败`)
        }
        const _res = await execCommand(`systemctl restart xray`)
        logger.info(`重启xray服务结果：${_res.success?'成功': '失败'}, ${_res.message}`)
        return resolve(_res)
      } else {
        logger.info('开发环境，重启服务成功')
        resolve({
          success: true,
          message: '开发环境，重启服务成功'
        })
      }
    } catch(err) {
      logger.info('重启服务catch异常')
      logger.info(err.message)
      resolve({
        success: false,
        data: err,
        error: true,
        message: `重启服务catch异常: ${err.message}`
      })
    }
  })
}

function setDailySchedule() {
  try {
    schedule.scheduleJob('0 0 8 * * *',  ()=>{
      logger.info('每日任务')
      dailySchedule();
      //删除日志文件
      autoDeleteLog();
    });
    let _time = isDevEnv() ? '0 */10 * * * *' : '0 0 */1 * * *';
    schedule.scheduleJob(_time,  async ()=>{
      logger.info('统计流量计划任务')
      await statisticTraffic(true)
      const {success, result, message} = await findOutOverdueClient()
      if (success && result) {
        if (result) {
          logger.info('需要更新xray配置文件')
          restartService()
        } else {
          logger.info('不需要更新xray配置文件')
        }
      } else {
        logger.info(message)
      }
    });
  } catch(e) {
    logger.info(`error dailyScheduleAction ${e.message}`)
  }
}

function dailySchedule() {
  return new Promise(async resolve => {
    try {
      const _res_backupDataBase = await backupDataBase()
      if (!_res_backupDataBase.success) {
        throw new Error(_res_backupDataBase.message)
      }
      const _res_statisticTraffic = await statisticTraffic(true)
      if (!_res_statisticTraffic.success) {
        throw new Error(_res_statisticTraffic.message)
      }
      if (!isDevEnv()) {
        const _res_restartService = await restartService()
        _res_restartService.message =  '每日任务执行结果：'+(_res_restartService.success ? '成功' : '失败')+ ' '+_res_restartService.message
        resolve(_res_restartService)
      } else {
        resolve({
          success: true,
          message: '每日任务执行成功'
        })
      }
    } catch(e) {
      resolve({
        success: false,
        data: e,
        message: '每日任务catch异常'
      })
    }
  })
}

function backupDataBase(){
  return new Promise(async resolve => {
    try {
      const {database} = getConfigs()
      const {success, data, message} = await execCommand(`mysqldump -u${database.user} -p${database.password} ${database.database} > ${database.database}_backup.sql`)
      resolve({
        success,
        data,
        message: success ? '备份数据库成功' : '备份数据库出错: '+ message
      })
    } catch(err) {
      resolve({
        success: false,
        error: true,
        data: err,
        message: '备份数据库异常: '+ err.message
      })
    }
    
  })
}

function backupConfigFile(){
  return new Promise(async resolve => {
    try {
      let _path = `/usr/local/etc/xray/config.json`
      if (isDevEnv()) {
        _path = './xray-config.json'
      }
      logger.info('备份配置文件')
      const _configFile = path.resolve(_path)
      if (!fs.existsSync(_configFile)){
        throw new Error('需要备份的配置文件不存在')
      }
      const {success, data, message} = await execCommand(`cp ${_path} ./xray-config_backup.json`)
      resolve({
        success,
        data,
        message: success ? '备份配置文件成功' : '备份配置文件出错: '+message
      })
    } catch(err) {
      resolve({
        success: false,
        data: err,
        error: true,
        message: '备份配置文件异常: '+err.message
      })
    }
  })
}

async function autoSetupSchedule() {
  try {
    console.log(`run autoSetupSchedule`)
    let _sql = `SELECT * FROM clients where off_date > now();`
    const {success, data} = await queryPromise(_sql)
    if (!success || !data || !data.length) {
      console.log(`没有需要设定定时任务的client`)
      logger.info(`没有需要设定定时任务的client`)
      return;
    }
    for (let item of data) {
      setupClientSchedule(item)
    }
  } catch(err) {
    console.log('autoSetupSchedule Error: '+err.message)
    logger.info('autoSetupSchedule Error: '+err.message)
  }
}

function recombineConfigFile() {
  return new Promise(async resolve => {
    let _result = {
      success: false,
      data: null,
      message: ''
    }
    try {
      const _tplConfig = path.resolve('xray-config-template.json');
      console.log('重组配置文件')
      if (!fs.existsSync(_tplConfig)) {
        logger.info(`配置模板文件丢失`)
        throw new Error(`配置模板文件丢失`)
      }
      
      let _sql = `SELECT * FROM clients where now() < off_date and traffic*POW(1024,3) > up+down;`
      const {success, data} = await queryPromise(_sql)
      if (!success) {
        logger.info(`查询可用账号出错`)
        throw new Error(`查询可用账号出错`)
      }
      if (!data || !data.length) {
        _result.success = true;
        _result.data = data;
        _result.message = '没有可用账号'
        return resolve(_result)
      }
      let _clients = data.map(val => {
        return {
          "id": val.uuid,
          "level": 0,
          "flow": "xtls-rprx-direct",
          "email": val.email
        }
      })
      let _configObj = fs.readFileSync(_tplConfig, {encoding:'utf-8'})
      _configObj = JSON.parse(_configObj)
      _configObj.inbounds[0].settings['clients'] = _clients
      fs.writeFileSync(path.resolve(`current-clients.json`), JSON.stringify(_clients), {encoding: 'utf-8'})
      fs.writeFileSync(path.resolve(`xray-config.json`), JSON.stringify(_configObj), {encoding: 'utf-8'})
      _result.success = true;
      _result.message = '重组配置文件成功';
      return resolve(_result)
    } catch(err) {
      _result.success = false;
      _result.error = true;
      _result.data = err;
      _result.message = err.message
      logger.info(`recombineConfigFile Error: ${err.message}`)
      resolve(_result)
    }
    
  })
}

function addUser({name, password, remark}) {
  return new Promise(async resolve => {
    try {
      if (!name || !password) {
        resolve({
          success: false, 
          message: `请传入必要参数 name, password`,
        })
        return;
      }
      const _remark = remark ? remark : ''
      const _res = await queryPromise(`select * from users where name='${name}';`);
      if (_res.success) {
        if (_res.data && _res.data.length) {
          resolve({
            success: false,
            message: '该账号已存在'
          })
        } else {
          let _sql = `insert into users ( name, passwd, remark ) VALUES ( '${name}', '${password}', '${_remark}' );`
          const {success, data} = await queryPromise(_sql)
          resolve({
            success,
            data,
            message: success ? '添加用户成功' : '添加用户失败'
          })
        }
      } else {
        resolve(_res)
      }
    } catch(err) {
      resolve({
        success: false,
        data: err,
        message: '添加用户catch异常'
      })
    }
  })
}

function updateUser({id, name, password, remark}) {
  return new Promise(async resolve => {
    try {
      if (!id) {
        resolve({
          success: false, 
          message: `请传入必要参数 id`,
        })
        return;
      }
      const _remark = remark ? remark : ''
      const _password = password ? password : ''
      const _res = await queryPromise(`select * from users where id=${id};`);
      if (_res.success && _res.data && _res.data.length) {
        const _updateRes = await queryPromise(`update users set passwd='${_password}', remark='${_remark}' where id=${id};`);
        resolve({
          success: _updateRes.success,
          data: _updateRes.data,
          message: _updateRes.success ? `更新用户[${name}]成功` : `更新用户[${name}]失败`
        })
      } else {
        resolve({
          success: _res.success,
          data: _res.data,
          message: _res.success ? `找不到用户[ ${name} ]` : `查找需要更新的用户[ ${name} ]失败`
        })
      }
    } catch(err) {
      resolve({
        success: false,
        data: err,
        message: '更新用户catch异常'
      })
    }
  })
}

function deleteUser({id}) {
  return new Promise(async resolve => {
    try {
      if (!id) {
        resolve({
          success: false, 
          message: `请传入必要参数 id`,
        })
        return;
      }
      const _res = await queryPromise(`delete from users where id=${id};`);
      resolve(_res)
    } catch(err) {
      resolve({
        success: false,
        data: err,
        message: '删除用户catch异常'
      })
    }
  })
}

function genQrcode({email}) {
  return new Promise(async resolve => {
    let _sql = `select * from clients where email = '${email}'`;
    const {success, data} = await queryPromise(_sql)
    if (!success || !data || (success && data && !data.length)) {
      resolve({
        success,
        data,
        message: '不存在该用户'
      })
    }
    const _client = data[0]
    let _config = `vless://${_client.uuid}@www.samojum.ml:443?flow=xtls-rprx-direct&encryption=none&security=tls&type=ws&path=%2fwsxray#${_client.email}`
    QRCode.toDataURL(_config)
    .then(url => {
      resolve({
        success: true,
        data: {
          url,
          config: _config
        },
        message: `生成成功`
      })
    })
    .catch(err => {
      resolve({
        success: false,
        data: err,
        message: `生成失败`
      })
    })
  })
}

function queryClientTraffic({email}) {
  return new Promise(async resolve => {
    try {
      let _sql = `select up, down, traffic, off_date from clients where email='${email}'`
      const {success, data} = await queryPromise(_sql)

      if (data && data.length) {
        resolve({
          success,
          data: data[0],
          message: success ? `查询 ${email} 流量成功` : `查询 ${email} 流量失败`
        })
      } else {
        resolve({
          success,
          data,
          message: `没有 ${email} 的相关信息`
        })
      }
      
    } catch(err) {
      resolve({
        success: false,
        data: err,
        message: `查询 ${email} 流量异常`
      })
    }
  })
}

exports = module.exports = {
  queryClientTraffic,
  genQrcode,
  restartService,
  execCommand,
  statisticTraffic,
  resetTraffic,
  detectDuplicateAccount,
  listClients,
  deleteClient,
  addClient,
  updateClient,
  verifyToken,
  initAction,
  getConfigs,
  isDevEnv,
  getRandomIntInclusive,
  autoSetupSchedule,
  sleep,
  backupConfigFile,
  backupDataBase,
  recombineConfigFile,
  setDailySchedule,
  dailySchedule,
  addUser,
  deleteUser,
  updateUser,
  login
}