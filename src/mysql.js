const mysql = require('mysql');
const { prodDatabase, localDatabase } = require('../configs')
let globalConnect=null
const ENV = process.env.NODE_ENV;

function connectDB(config) {
  return new Promise((resolve, reject) => {
    try {
      if (globalConnect) {
        resolve({
          success: true,
          msg: `已有数据库连接`
        })
      }
      // console.log('创建数据库实例')
      let dbSet = ENV === 'production' ? prodDatabase : localDatabase
      if (config!==undefined) {
        dbSet = config
      }
      // console.log(dbSet)
      if (!dbSet) {
        resolve({
          success: false,
          msg: `请传入数据库配置`
        })
      }
      globalConnect = mysql.createConnection(dbSet);
      resolve({
        success: true,
        msg: `连接数据库成功`
      })
    } catch(e) {
      // console.log('连接数据库出错', e)
      resolve({
        success: false,
        data: e,
        msg:'连接数据库失败'
      })
    }
  })
}

function closeDB() {
  return new Promise((resolve, reject) => {
    try {
      // console.log('创建数据库实例')
      if (!globalConnect) {
        resolve({
          success: true,
          msg: `no db instance`
        })
      }
      globalConnect.end();
      resolve({
        success: true,
        msg: `disconnect success`
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
  // console.log('请求数据')
  return new Promise((resolve, reject) => {
    try {
      if (!globalConnect) {
        resolve({
          success: false,
          msg: `no db instance`
        })
      }
      globalConnect.query(_sql, function(err, rows, fields) {
        if (err) {
          // console.log('数据出错')
          resolve({
            success: false,
            data: err
          })
        }
        // console.log('数据返回')
        // console.log(rows)
        resolve({
          success: true,
          data: rows
        })
      });
    } catch(e) {
      // console.log('连接数据库出错', e)
      resolve({
        success: false,
        data: e
      })
    }
  })
}

function mysqlPromise(_sql) {
  // console.log('请求数据')
  return new Promise(async (resolve, reject) => {
    const _connect_result = await connectDB();
    // console.log('--------_connect_result-------')
    // console.log(_connect_result)
    if (!_connect_result || !_connect_result.success) {
      await closeDB()
      resolve(_connect_result)
    }
    const _result = await queryPromise(_sql)
    // console.log('---_result------------')
    // console.log(_result)
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