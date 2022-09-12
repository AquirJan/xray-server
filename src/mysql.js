const mysql = require('mysql');
const path = require('path');
const logger = require('../src/logger.js');
const {
  prod,
  dev
} = require(path.resolve('configs.js'))
let CONNECTION=undefined;

let reConnectTimes = 0;

function connectDB(configs) {
  return new Promise(async (resolve, reject) => {
    try {
      if (CONNECTION) {
        throw new Error('已有数据库连接')
      }
      let dbSet = configs !== undefined ? configs : (process.env.NODE_ENV === 'production' ? prod.database : dev.database)
      if (!dbSet) {
        throw new Error('请传入数据库配置')
      }
      CONNECTION = mysql.createConnection(dbSet);
      CONNECTION.connect()
      CONNECTION.on('error', function(err) {
        logger.info(err.code); // 'ER_BAD_DB_ERROR'
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
          if (reConnectTimes < 3) {
            reConnectTimes = reConnectTimes + 1;
            connectDB(configs); 
          } else {
            throw new Error(`超出最大重连数据库次数`);
          }
        } else {                                      
          throw err;
        }
      });
      resolve({
        success: true,
        message:  `连接数据库成功`
      })
    } catch(e) {
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
      // console.log('创建数据库实例')
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
      // console.log('连接数据库出错', e)
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
      // console.log('请求数据')
      if (!CONNECTION) {
        throw new Error('queryPromise : no db instance')
      }
      CONNECTION.query(_sql, function(err, rows, fields) {
        if (err) {
          throw err
        }
        return resolve({
          success: true,
          data: rows,
          message: 'query database success'
        })
      });
    } catch(e) {
      console.dir(e)
      console.log(e.message)
      logger.info(e.message);
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