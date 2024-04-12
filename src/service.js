const ENV = process.env.NODE_ENV;
const INITSQLS = [
  "CREATE TABLE IF NOT EXISTS `users` ("
    +"`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',"
    +"`name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户名',"
    +"`create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',"
    +"`passwd` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '密码',"
    +"`last_time` datetime DEFAULT NULL COMMENT '上次登录时间',"
    +"`off_time` datetime DEFAULT NULL COMMENT '截止时间',"
    +"`remark` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,"
    +"PRIMARY KEY (`id`)"
  +") ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci",
  "CREATE TABLE IF NOT EXISTS `clients` ("
    +"`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',"
    +"`email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户名',"
    +"`uuid` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户id',"
    +"`port` int DEFAULT NULL COMMENT '端口',"
    +"`off_date` datetime DEFAULT NULL COMMENT '结束时间',"
    +"`remark` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',"
    +"`create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',"
    +"`update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',"
    +"`up` bigint DEFAULT '0' COMMENT '上行数据量',"
    +"`down` bigint DEFAULT '0' COMMENT '下行数据量',"
    +"`traffic` int DEFAULT '0' COMMENT '可用流量',"
    +"`price` float DEFAULT '0' COMMENT '每月费用',"
    +"`api` varchar(255) DEFAULT '/web3' COMMENT '配置文件内的api地址',"
    +"PRIMARY KEY (`id`),"
    +"UNIQUE KEY `email_UNIQUE` (`email`)"
  +") ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci"
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
const axios = require('axios')

const logger = require('./logger.js');

const { getCnf } = require('./util');
const { modifyNginx, setNginxApi, setNginxPort } = require('./modifyNginxService');
// const LOGFOLDER = 'logs'
let scheduleJobList = {}

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
      autoDeleteLog()
      // console.log('连接数据库')
      const _configs = getCnf();
      const _dbset = _configs.database
      // console.log(_dbset)
      const _fdbset = {
        host: _dbset.host,
        user: _dbset.user,
        password: _dbset.password,
        port: _dbset.port
      };
      // console.log(_fdbset)
      await connectDB(_fdbset)
      const _cdbres = await queryPromise(CREATEDBSQL)
      logger.info(`执行自动创建数据库${_cdbres.success?'成功':"失败:"+_cdbres.message}`)
      await closeDB()
      const _resSheet = await connectDB(_dbset)
      if (_resSheet.success) {
        for await (const [index, item] of INITSQLS.entries()) {
          const _res = await queryPromise(item)
          logger.info(`执行自动创建${index}表${_res.success?'成功':"失败:"+_res.message}`)
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

function execCommand(command) {
  return new Promise(resolve=>{
    try {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // console.error(`exec error: ${error}`);
          return resolve({
            success: false,
            error: true,
            message: `exec command failure: ${error.message}`
          })
        }
        return resolve({
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
  logger.info(`执行删除日志文件任务`)
  const logFolder = path.resolve(global.LOGFOLDER)
  if (fs.existsSync(logFolder) && fs.statSync(logFolder) && fs.statSync(logFolder).isDirectory()) {
    const _files = fs.readdirSync(logFolder)
    if (_files.length) {
      // 5天前
      const _today = new Date()
      let _spDateAgo = new Date((new Date(_today.setDate(_today.getDate()-5))).utcFormat('yyyy/MM/dd 00:00:00'))
      _spDateAgo = _spDateAgo.getTime()
      _files.forEach(val=>{
        const _filePath = path.resolve(logFolder+'/'+val)
        if (fs.existsSync(_filePath)) {
          const _fileStat = fs.statSync(_filePath)
          if (_fileStat.isFile() && new Date(_fileStat.birthtime).getTime() < _spDateAgo) {
            logger.info(`删除日志文件：${_filePath}`)
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
  if (!name || !global.Tokens ) {
    return false;
  }
  return global.Tokens[name]
}

function listClients({page, size, conditions}) {
  return new Promise(async resolve => {
    try {
      let _sql = [`select *, DATE_FORMAT(off_date, '%Y/%m/%d %H:%i:%S') as off_date_utc from clients`]
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
      return resolve(_res)
    } catch(error) {
      return resolve({
        success: true,
        error: true,
        data: error,
        message: error.message
      })
    }
  })
}

function login({name, password}) {
  return new Promise(async resolve => {
    try {
      const _cnfRes = getCnf()
      if (_cnfRes.godAcount && _cnfRes.godAcount === name){
        const _tempDate = new Date()
        const _offtime = new Date(_tempDate.setDate(_tempDate.getDate()+2)) // token有效期2天
        const _token = (Buffer.from(JSON.stringify({ "name": name, "off_time": _offtime.getTime() }))).toString('base64')
        if (!global.Tokens){
          global.Tokens = {}
        }
        global.Tokens[name] = {
          token: _token,
          name: name,
          offTime: _offtime
        }
        return resolve({
          token: _token,
          success: true,
          message: '登录成功'
        })
      }
      const { data, message, success} = await queryPromise(`select * from users where name = '${name}'`)
      if (!success) {
        throw new Error(`login failure : ${message}`)
      }
      if (!data || !data.length) {
        throw new Error(`login failure : can not found user [${name}]`)
      }
      const _user = data?.[0];
      if (!_user) {
        throw new Error('login failure: user not exist')
      }
      if (password !== _user.passwd) {
        throw new Error('login failure: password error')
      }
      const _matchUserIndex = findOutToken(name)
      if (_matchUserIndex) {
        // 触发单点登陆/另一台机器登陆/删除匹配信息
        logger.info('触发单点登陆/另一台机器登陆/删除匹配信息')
        delete global.Tokens[name]
      } 
      const _tempDate = new Date()
      const _offtime = new Date(_tempDate.setDate(_tempDate.getDate()+2)) // token有效期2天
      await queryPromise(`update users set last_time='${(new Date()).format('yyyy-MM-dd hh:mm:ss')}', off_time='${_offtime.format('yyyy-MM-dd hh:mm:ss')}' where id=${_user.id}`)
      const _token = (Buffer.from(JSON.stringify({"name":name, "off_time": _offtime.getTime()}))).toString('base64')
      global.Tokens[name] = {
        token: _token,
        name: name,
        offTime: _offtime
      }
      resolve({
        token: _token,
        success: true,
        message:  'login success'
      })
    } catch(error) {
      return resolve ({
        success: false,
        error: true,
        data: error,
        message: error.message
      })
    }
  })
}

function verifyToken(_realToken) {
  return new Promise(resolve => {
    const _res = Object.values(global?.Tokens ?? {}).filter(val => val.token === _realToken)?.[0]
    if (_res) {
      const _now = Date.now()
      if (_now > _res.off_time) {
        delete global.Tokens[_res.name]
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
      _remain = _remain > 0 ? - _remain : 0
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
  logger.info(`${email} 创建计划任务: ${off_date}`)
  let _off_date = new Date(off_date+' UTC');
  let _now_ms = new Date().utcFormat('yyyy/MM/dd hh:mm:ss')
  if (_now_ms >= _off_date) {
    logger.info(`${email}, time less than now`)
    return;
  }
  if (!scheduleJobList) {
    scheduleJobList = {}
  }
  
  // schedule 功能对应时间点参数（秒，分，时，日，月，星期）
  // let _scheduleTime = `${_off_date.utcFormat('ss')} ${_off_date.utcFormat('mm')} ${_off_date.utcFormat('hh')} */1 * *`
  let _scheduleTime = `${_off_date.utcFormat('ss')} ${_off_date.utcFormat('mm')} ${_off_date.utcFormat('hh')} ${_off_date.utcFormat('dd')} */1 *`

  const _scheduleName = email.replace(/\.|\@/gi, '_')
  logger.info(`${email} setup off_date schedule action, _scheduleName: ${_scheduleName}, _scheduleTime: ${_scheduleTime}`)
  // const _scheduleNameDaily = `${_scheduleName}_daily`
  if (scheduleJobList[_scheduleName]){
    logger.info(`cancel ${_scheduleName} schedule job`)
    scheduleJobList[_scheduleName].cancel()
    delete scheduleJobList[_scheduleName];
  }
  const newScheduleJob = schedule.scheduleJob(_scheduleTime, async ()=>{
    // console.log(`${email} excute off_date schedule action`)
    const _remainTrafficRes = await getRemainTraffic(id)
    _remainTraffic = _remainTrafficRes?.data || 0
    logger.info(`${email} 账号剩余流量：${_remainTraffic}`)
    restartService({email, id, remainTraffic: _remainTraffic})
    logger.info(`删除原有计划任务--${_scheduleName}`)
    scheduleJobList[_scheduleName].cancel()
    delete scheduleJobList[_scheduleName];
    setupClientSchedule({email, off_date, id})
  })
  scheduleJobList[_scheduleName] = newScheduleJob
  logger.info(`${email} setup off_date schedule success`)
}

async function addClient({email, uuid, port, off_date, price, traffic, remark, api}){
  return new Promise(async resolve=> {
    try {
      let _sql = `INSERT INTO clients ( email, uuid, port, off_date, price, traffic, remark, api ) VALUES ( '${email}', '${uuid}', '${port}', '${off_date}', '${price}', '${traffic}', '${remark}', '${api}' );`
      const _res = await queryPromise(_sql)
      if (_res.success) {
        setupClientSchedule({email, off_date, id:_res?.data?.insertId})
      }
      resolve(_res)
    } catch(error) {
      resolve({
        success: false,
        message: `addClient error: ${error.mesasge}`
      })
    }
  })
}

async function updateClient({id, email, uuid, port, off_date, price, traffic, remark, api}){
  return new Promise(async resolve=> {
    try {
      let _sql = `update clients set email='${email}', uuid='${uuid}', port='${port}', off_date='${off_date}', price='${price}', traffic='${traffic}', remark='${remark}', api='${api}' where id=${id};`
      const _res = await queryPromise(_sql)
      if (_res.success) {
        setupClientSchedule({email, off_date, id})
      }
      logger.info(`update client message: ${_res.message}`)
      return resolve(_res)
    } catch(error) {
      logger.info(`update client Error: ${error.message}`)
      return resolve({
        success: false,
        message: `update client Error: ${error.message}`
      })
    }
  })
}

async function detectDuplicateAccount({id, email, uuid, port}){
  return new Promise(async resolve=> {
    let _sql = `select * from clients where email='${email}' or uuid='${uuid}' or port='${port}';`
    if (id) {
      _sql = `select * from clients where (email='${email}' or uuid='${uuid}' or port='${port}') and id!=${id};`
    }
    const _res = await queryPromise(_sql)
    resolve(_res)
  })
}

async function deleteClient({id, email}) {
  return new Promise(async resolve=> {
    let _sql = `delete from clients where id=${id};`
    const _res = await queryPromise(_sql)
    if (_res.success) {
      let _scheduleName = email.replace(/\.|\@/gi, '_')
      if (scheduleJobList[_scheduleName]){
        logger.info(`撤销 ${_scheduleName} 计划任务`)
        scheduleJobList[_scheduleName].cancel()
        delete scheduleJobList[_scheduleName];
      }
    }
    resolve(_res)
  })
}

function findOutValidClient() {
  return new Promise(async resolve => {
    try {
      const _current_file = path.resolve(`current-clients.json`);
      if (fs.existsSync(_current_file)) {
        let _current_emails = fs.readFileSync(_current_file, {encoding:'utf-8'});
        
        let _sql = `SELECT * FROM clients where traffic*POW(1024,3) > up+down and DATE_FORMAT(off_date, '%Y-%m-%d %H:%i:%S') > UTC_TIMESTAMP;`
        const {success, data} = await queryPromise(_sql)
        if (!success) {
          logger.info(`查询可用账号出错`)
          throw new Error(`查询可用账号出错`)
        }
        let _valid_emails = data.map(val => val.email).sort().join(',')
        _valid_emails = `"${_valid_emails}"`
        logger.info('比较账号是否一致')
        logger.info(`_current_emails: ${_current_emails}`)
        logger.info(`_valid_emails: ${_valid_emails}`)
        let _isSame = _current_emails === _valid_emails;
        // if (!_isSame) {
        //   fs.writeFileSync(path.resolve(`current-clients.json`), _valid_emails, {encoding: 'utf-8'})
        // }
        resolve({
          success: true,
          data: _valid_emails,
          message: _isSame ? '账号列表没有变动，前后一致': '账号列表存在变动，前后不一致',
          result: _isSame
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
      return resolve({
        success: false,
        error: true,
        data: err,
        message: err.message
      })
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
      logger.info(`重置流量命令成功`)
      let _sql = `update clients set up=0, down=${remainTraffic} where email='${email}' and id=${id};`
      const _res = await queryPromise(_sql)
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
      console.log(_res_recombine)
      
      if (params) {
        const {email, id, remainTraffic} = params;
        const _res_resetTraffic = await resetTraffic({email, id, remainTraffic})
        if (!_res_resetTraffic.success) {
          throw new Error(`${_res_resetTraffic.message}`)
        }
      }
      
      if (!isDevEnv()) {
        const _res_changeConfig = await execCommand(`cp ./xray-config.json /usr/local/etc/xray/config.json`)
        logger.info(`更新xray配置文件${_res_changeConfig.success?'成功':'失败'}`)
        if (!_res_changeConfig.success) {
          throw new Error(`更新xray配置文件失败`)
        }
        // const _cpNginxRes = await execCommand(`cp ./nginx_default /etc/nginx/sites-available/default`)
        // if (!_cpNginxRes.success) {
        //   throw new Error(`更新nginx失败，${_cpNginxRes.message}`)
        // }
        setTimeout(()=>{
          logger.info(`执行重启xray`)
          // execCommand(`nginx -s reload`).then(_restartNginxRes=>{
          //   if (!_restartNginxRes.success) {
          //     logger.info(`重启nginx失败，${_restartNginxRes.message}`)
          //     sendMailMessage(`重启nginx失败，${_restartNginxRes.message}`)
          //   } else {
          //     logger.info(`重启nginx成功`)
          //   }
          // })
          execCommand(`systemctl restart xray`).then(_restartXrayRes=>{
            if (!_restartXrayRes.success) {
              logger.info(`重启xray失败，${_restartXrayRes.message}`)
              sendMailMessage(`重启xray失败，${_restartXrayRes.message}`)
            } else {
              logger.info(`重启xray成功`)
            }
          })
        }, 3*1000)
        // const _restartNginxRes = await execCommand(`nginx -s reload`)
        // if (!_restartNginxRes.success) {
        //   throw new Error(`重启nginx失败，${_restartNginxRes.message}`)
        // }
        // const _res = await execCommand(`systemctl restart xray`)
        // logger.info(`重启xray服务结果：${_res.success?'成功': '失败'}, ${_res.message}`)
        
        return resolve({
          success: true,
          message: `重启服务完成`
        })
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
    let _time = isDevEnv() ? '0 */30 * * * *' : '0 0 */1 * * *';
    schedule.scheduleJob(_time,  async ()=>{
      logger.info('开始执行统计流量计划任务')
      await statisticTraffic(true)
      const {success, result, message} = await findOutValidClient()
      if (success) {
        if (!result) {
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
      if (!isDevEnv()){
        logger.info(`dailySchedule 备份数据库`)
        const _res_backupDataBase = await backupDataBase()
        if (!_res_backupDataBase.success) {
          throw new Error(_res_backupDataBase.message)
        }
      }
      logger.info(`dailySchedule 备份配置文件`)
      const _res_backupConfigFile = await backupConfigFile()
      if (!_res_backupConfigFile.success) {
        throw new Error(`${_res_backupConfigFile.message}`)
      }
      logger.info(`dailySchedule 邮件发送备份数据`)
      const _res_mailbackups = await mailBackups()
      if (!_res_mailbackups.success) {
        throw new Error(`${_res_mailbackups.message}`)
      }
      logger.info(`dailySchedule 邮件发送备份数据 res : ${_res_mailbackups?.message}`)
      return resolve({
        success: true,
        message: '每日任务执行成功'
      })
    } catch(e) {
      logger.info(`每日任务catch异常: ${e.message}`)
      return resolve({
        success: false,
        data: e,
        error: true,
        message: `每日任务catch异常: ${e.message}`
      })
    }
  })
}

function backupDataBase(){
  return new Promise(async resolve => {
    try {
      const {database} = getCnf()
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
    let _sql = `SELECT *, DATE_FORMAT(off_date, '%Y/%m/%d %H:%i:%S') as off_date_utc FROM clients where DATE_FORMAT(off_date, '%Y-%m-%d %H:%i:%S') > UTC_TIMESTAMP;`
    const {success, data} = await queryPromise(_sql)
    if (!success || !data || !data.length) {
      logger.info(`没有需要设定定时任务的client`)
      return;
    }
    for (let item of data) {
      setupClientSchedule({off_date: item.off_date_utc, email:item.email, id: item.id})
    }
  } catch(err) {
    logger.info('autoSetupSchedule Error: '+err.message)
  }
}

function recombineConfigFile(email) {
  return new Promise(async resolve => {
    let _result = {
      success: false,
      data: null,
      message: ''
    }
    try {
      const _tplConfig = path.resolve('xray-config-template.json');
      const _config = getCnf()
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
          // "flow": "xtls-rprx-direct",
          "email": val.email
        }
      })

      let _inbound = [{
        "port": 2188,
        "listen": "127.0.0.1",
        "protocol": "vless",
        "settings": {
            "clients": _clients,
            "decryption": "none"
        },
        "streamSettings": {
            "network": "ws",
            "security": "none",
            "wsSettings": {
              "host": _config.hostname,
              "path": '/samocat'
            }
        }
      }]
      let _configObj = fs.readFileSync(_tplConfig, {encoding:'utf-8'})
      _configObj = JSON.parse(_configObj)
      _configObj.inbounds = [..._inbound, ..._configObj.inbounds]
      const _currentClientContent = data.map(val=>val.email).sort().join(',');
      // console.log(_currentClientContent)
      fs.writeFileSync(path.resolve(`current-clients.json`), _currentClientContent, {encoding: 'utf-8'})
      fs.writeFileSync(path.resolve(`xray-config.json`), JSON.stringify(_configObj), {encoding: 'utf-8'})
      _result.success = true;
      _result['client_list'] = data.map(val=>{
        return {
          email: val.email,
          // api: val.api,
          // port: val.port
        }
      });
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

function genQrcode({email, api, port}) {
  return new Promise(async resolve => {
    let _sql = `select * from clients where email = '${email}'`;
    let _port = port
    const {success, data} = await queryPromise(_sql)
    if (!success || !data || (success && data && !data.length)) {
      resolve({
        success,
        data,
        message: '不存在该用户'
      })
    }
    const _client = data[0]
    const _configs = getCnf();
    // let _config = `vless://${_client.uuid}@${_configs.hostname}:${_port}?flow=xtls-rprx-direct&encryption=none&security=tls&type=ws&path=${api.replace(/\//gi, '%2f')}#${_client.email}`
    let _config = `vless://${_client.uuid}@${_configs.hostname}:443?flow=xtls-rprx-direct&encryption=none&security=tls&type=ws&host=${_configs.hostname}&path=%2fsamocat#${_client.email}`
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
        message: `查询 ${email} 流量异常: ${err.message}`
      })
    }
  })
}

function checkUserExist(name) {
  return new Promise(async resolve => {
    try {
      if (!name) {
        throw new Error(`请传入name参数`)
      }
      let _sql = `select * from users where name='${name}'`
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
        message: `查询 ${name} 账户异常：${err.message}`
      })
    }
  })
}

function gitHubOAuth({code}) {
  return new Promise(async resolve=>{
    try {
      if (!code) {
        throw new Error(`miss code param`)
      }
      const clientID = '4654197a939c1a27bd9e'
      const clientSecret = '1a95e36581e43b844feb936013b55f3743bed056'
      
      const tokenResponse = await axios({
        method: 'post',
        url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${code}`,
        headers: {
          accept: 'application/json'
        },
        timeout: 60*1000
      });
      const accessToken = tokenResponse?.data?.access_token;
      if (!accessToken) {
        throw new Error('access token Error')
      }
      const result = await axios({
        method: 'get',
        url: `https://api.github.com/user`,
        headers: {
          accept: 'application/json',
          Authorization: `token ${accessToken}`
        },
        timeout: 60*1000
      });
      resolve({
        success: true,
        data: result?.data,
        message: `githubOAuth Success`
      })
    } catch(error) {
      resolve({
        success: false,
        error: true,
        data: error,
        message: `githubOAuth Error ${error?.message}`
      })
    }
  })
}

function sendMailMessage(text){
  return new Promise(resolve=>{
    try {
      // if (!global.nodeMailer) {
      //   global.nodeMailer = nodemailer.createTransport({
      //     service : 'hotmail',
      //     auth : {
      //       user : 'samojum@outlook.com',
      //       pass : 'Aquir.239'
      //     }
      //   });
      // }
      
      // const mailOptions = {
      //   from: 'samojum@outlook.com',
      //   to: 'aquirjan@icloud.com',
      //   subject: 'mail info Node.js by xray-server',
      //   text: text,
      // };
      // if (!global.nodeMailer) {
      //   throw new Error('miss global.nodeMailer')
      // }
      // global.nodeMailer.sendMail(mailOptions, function(error, info){
      //   if (error) {
      //     return resolve({
      //       success: false,
      //       error: true,
      //       data: error,
      //       message: `sendMailMessage Failure: ${error.message}`
      //     })
      //   } else {
      //     return resolve({
      //       success: true,
      //       message: `sendMailMessage Success: ${info.response}`
      //     })
      //   }
      // });
      return resolve({
              success: true,
              message: `sendMailMessage Success: `
            })
    } catch(error){
      logger.info(`sendMailMessage Error: ${error.message}`)
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `sendMailMessage Error: ${error.message}`
      })
    }
  })
  
}

function mailBackups(){
  return new Promise(async resolve=>{
    try {
      const _config = getCnf()
      const _content = `${_config.hostname} xray-server backup at ${new Date().utcFormat(`yyyy/MM/dd`)}`
      const _command_line = `echo "${_content}" | mail -s "${_config.hostname} backup" -A ${path.resolve('vpndb_backup.sql')} -A ${path.resolve('xray-config_backup.json')} ${_config.backupToEmail}`
      // logger.info(_command_line)
      const _res = await execCommand(_command_line)
      if (!_res.success) {
        throw new Error(_res.message)
      }
      return resolve({
        success: true,
        message: `邮件备份关键数据成功`
      })
      // if (!global.nodeMailer) {
      //   global.nodeMailer = nodemailer.createTransport({
      //     service : 'hotmail',
      //     auth : {
      //       user : 'samojum@outlook.com',
      //       pass : 'Aquir.239'
      //     }
      //   });
      // }
      // const _config = getCnf()
      // const mailOptions = {
      //   from: 'samojum@outlook.com',
      //   to: 'aquirjan@icloud.com',
      //   subject: `Sending Email using Node.js by xray-server from ${_config.hostname}`,
      //   text: 'Backup files\n',
      //   attachments: [
      //     {   // file on disk as an attachment
      //       filename: 'vpndb_backup.sql',
      //       path: path.resolve('vpndb_backup.sql') // stream this file
      //     },
      //     {   // file on disk as an attachment
      //       filename: 'xray-config_backup.json',
      //       path: path.resolve('xray-config_backup.json') // stream this file
      //     },
      //     {   // file on disk as an attachment
      //       filename: 'nginx_default_backup',
      //       path: path.resolve('nginx_default_backup') // stream this file
      //     }
      //   ]
      // };
      // if (!global.nodeMailer) {
      //   throw new Error('miss global.nodeMailer')
      // }
      // global.nodeMailer.sendMail(mailOptions, function(error, info){
      //   if (error) {
      //     return resolve({
      //       success: false,
      //       error: true,
      //       data: error,
      //       message: `mailBackups Failure: ${error.message}`
      //     })
      //   } else {
      //     return resolve({
      //       success: true,
      //       message: `mailBackups Success: ${info.response}`
      //     })
      //   }
      // });
    } catch(error){
      logger.info(`mailBackups Error: ${error.message}`)
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `mailBackups Error: ${error.message}`
      })
    }
  })
  
}

exports = module.exports = {
  mailBackups,
  gitHubOAuth,
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