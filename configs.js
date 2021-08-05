// const ENV = process.env.NODE_ENV;
exports = module.exports = {
  dev: {
    database: {
      host     : 'localhost',
      user     : 'root',
      password : 'Mse.123456',
      database : 'autodoc',
      port : 3306
    },
    port: 8686,
  },
  prod: {
    database: {
      host     : '127.0.0.1',
      user     : 'root',
      password : '?lG2FlOp0LUh',
      database : 'autodoc',
      port : 3306
    },
    port: 8686
  }
}