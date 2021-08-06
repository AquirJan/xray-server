exports = module.exports = {
  dev: {
    database: {
      host     : 'localhost',
      user     : 'root',
      password : 'Mse.123456',
      database : 'vpndb',
      port : 3306
    },
    port: 8686,
  },
  prod: {
    database: {
      host     : '127.0.0.1',
      user     : 'root',
      password : '?lG2FlOp0LUh',
      database : 'vpndb',
      port : 3306
    },
    port: 8686
  }
}