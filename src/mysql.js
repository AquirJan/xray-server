const mysql = require('mysql');
const path = require('path');
const {
  prod,
  dev
} = require(path.resolve('configs.js'))
let CONNECTION=undefined;

function connectDB(configs) {
  return new Promise(async (resolve, reject) => {
    try {
      if (CONNECTION) {
        resolve({
          success: true,
          message:  `已有数据库连接`
        })
      }
      let dbSet = configs !== undefined ? configs : (process.env.NODE_ENV === 'production' ? prod.database : dev.database)
      if (!dbSet) {
        resolve({
          success: false,
          data: {message:`请传入数据库配置`},
          message:  `请传入数据库配置`
        })
      }
      CONNECTION = await mysql.createConnection(dbSet);
      resolve({
        success: true,
        message:  `连接数据库成功`
      })
    } catch(e) {
      console.log('连接数据库出错', e)
      resolve({
        success: false,
        data: e,
        message: '连接数据库失败'
      })
    }
  })
}

function closeDB() {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log('创建数据库实例')
      if (!CONNECTION) {
        resolve({
          success: true,
          message:  `no db instance`
        })
      }
      await CONNECTION.end();
      CONNECTION = undefined;
      resolve({
        success: true,
        message:  `disconnect success`
      })
    } catch(e) {
      // console.log('连接数据库出错', e)
      resolve({
        success: false,
        data: e
      })
    }
  })
}

function queryPromise(_sql) {
  return new Promise((resolve, reject) => {
    try {
      // console.log('请求数据')
      if (CONNECTION) {
        // console.log('------------query------------')
        CONNECTION.query(_sql, function(err, rows, fields) {
          if (err) {
            // console.log('数据出错')
            resolve({
              success: false,
              data: err,
              message: 'mysql query error'
            })
          }
          // console.log('数据返回')
          // console.log(rows)
          resolve({
            success: true,
            data: rows
          })
        });
      } else {
        // console.log(CONNECTION)
        resolve({
          success: false,
          data:  {message:`no db instance`},
          message:  `no db instance`
        })
      }
    } catch(e) {
      // console.log('连接数据库出错', e)
      resolve({
        success: false,
        data: e,
        message: 'mysql catch query error'
      })
    }
  })
}

function mysqlPromise(_sql) {
  // console.log('请求数据')
  return new Promise(async (resolve, reject) => {
    const _connect_result = await connectDB();
    if (!_connect_result || !_connect_result.success) {
      await closeDB()
      resolve(_connect_result)
    }
    const _result = await queryPromise(_sql)
    await closeDB()
    resolve(_result)
  })
}

exports = module.exports = {
  connectDB,
  closeDB,
  queryPromise,
  mysqlPromise
};