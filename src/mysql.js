const mysql = require('mysql');
const path = require('path');
const logger = require('../src/logger.js');
const { getCnf } = require('./util.js');

let CONNECTION=undefined;

let reConnectTimes = 0;

function connectDB(configs) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!configs) {
        throw new Error('请传入连接数据库的配置参数')
      }
      if (CONNECTION) {
        throw new Error('已有数据库连接')
      }
      CONNECTION = mysql.createConnection(configs);
      CONNECTION.connect()
      CONNECTION.on('connect',()=>{
        logger.info('连接数据库成功');
        reConnectTimes = 0;
        return resolve({
          success: true,
          message:  `连接数据库成功`
        })
      })
      CONNECTION.on('error', (err) => {
        logger.info(err.code); // 'ER_BAD_DB_ERROR'
        if(['PROTOCOL_PACKETS_OUT_OF_ORDER', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'].includes(err.code)) {
          if (reConnectTimes < 3) {
            logger.info(`reConnectTimes: ${reConnectTimes}`)
            reConnectTimes = reConnectTimes + 1;
            connectDB(configs); 
          } else {
            throw new Error(`超出最大重连数据库次数`);
          }
        } else {                                      
          throw err;
        }
      });
    } catch(e) {
      reConnectTimes = 0;
      logger.info(e.message);
      resolve({
        success: false,
        data: e,
        error: true,
        message: `connect database error: ${e.message}`
      })
    }
  })
}

function closeDB() {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`创建数据库实例`)
      if (!CONNECTION) {
        throw new Error('no db instance')
      }
      await CONNECTION.end();
      CONNECTION = undefined;
      resolve({
        success: true,
        message:  `close database success`
      })
    } catch(e) {
      logger.warn(`连接数据库出错: ${e.message}`)
      resolve({
        success: false,
        data: e,
        error: true,
        message: `close database error: ${e.message}`
      })
    }
  })
}

function queryPromise(_sql) {
  return new Promise((resolve, reject) => {
    try {
      if (!CONNECTION) {
        // throw new Error('queryPromise : no db instance')
        const _configs = getCnf()
        const _dbset = _configs.database
        connectDB(_dbset);
      }
      CONNECTION.query(_sql, (err, rows, fields) =>{
        if (err) {  
          logger.info(err.code);
          if(['PROTOCOL_PACKETS_OUT_OF_ORDER', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'].includes(err.code)) {
            logger.info(`reConnectTimes: ${reConnectTimes}`)
            if (reConnectTimes < 3) {
              reConnectTimes = reConnectTimes + 1;
              closeDB()
              const _configs = getCnf()
              const _dbset = _configs.database
              connectDB(_dbset);
            } else {
              throw new Error(`超出最大重连数据库次数`);
            }
          } else {                                      
            throw new Error(err.code+": "+err.sqlMessage)
          }
        }
        return resolve({
          success: true,
          data: rows,
          message: 'query database success'
        })
      });
    } catch(e) {
      logger.warn(e.message);
      return resolve({
        success: false,
        data: e,
        error: true,
        message: `mysql catch query error: ${e.message}`
      })
    }
  })
}

exports = module.exports = {
  connectDB,
  closeDB,
  queryPromise,
};