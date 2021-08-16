const ENV = process.env.NODE_ENV;
const {
  login,
  listClients,
  updateClient,
  deleteClient,
  addClient,
  verifyToken,
  detectDuplicateAccount,
  isDevEnv,
  statisticTraffic,
  resetTraffic,
  restartService,
  execCommand,
  backupConfigFile,
  backupDataBase,
  recombineConfigFile,
  addUser,
  dailySchedule,
} = require('./service.js')

async function loginCtl(req, res) {
  const { name, password } = req.body; // password 前端md5
  if (!name) {
    res.send({
      success: false,
      message: 'miss param: name'
    })
  }
  if (!password) {
    res.send({
      success: false,
      message: 'miss param: password'
    })
  }
  const _res = await login({name, password})
  res.send(_res)
}

async function verifyTokenMiddle(req, res, next) {
  if (isDevEnv()){
    next()
  } else {
    const token = req.headers.token;
    const _res = await verifyToken(token)
    if (_res.success) {
      next()
    } else {
      res.send(_res)
    }
  }
}

async function listClientsCtl(req, res) {
  const {page, size, conditions} = req.body;
  const _page = page ? page : 1
  const _size = size ? size : 30
  let _conditions = undefined
  if (conditions && conditions.constructor === Object) {
    _conditions = conditions
  }
  const _res = await listClients({page: _page, size: _size, conditions});
  res.send(_res)
}

async function putClientCtl(req, res) {
  const {id, email, uuid, price, off_date, port, remark, traffic} = req.body
  const _now = new Date()
  const _port = port ? port : 443;
  const _price = price ? price : 20;
  const _traffic = traffic ? traffic : 20;
  let _off_date = off_date ? off_date : new Date(_now.setDate(_now.getDate()+1)).format('yyyy/MM/dd hh:mm:ss')
  if (!email) {
    res.send({
      success: false,
      message: '请传入email'
    })
  }
  if (!uuid) {
    res.send({
      success: false,
      message: '请传入uuid'
    })
  }
  if (!remark) {
    res.send({
      success: false,
      message: '请传入remark'
    })
  }
  let _res = {
    success: false,
    message: 'default response'
  }
  const _obj = {email, uuid, remark, price: _price, off_date: _off_date, port: _port,  traffic: _traffic}
  if (id) {
    _obj['id'] = id;
    _res = await updateClient(_obj);
    _res['message'] = _res.success ? '更新成功' : '更新失败'
  } else {
    _res = await detectDuplicateAccount({email, uuid})
    if (_res.success) {
      if (_res.data && _res.data.length) {
        _res = {
          success: false,
          message: '该email账号或uuid已存在'
        }
      } else {
        _res = await addClient(_obj);
        _res['message'] = _res.success ? '添加成功' : '添加失败'
      }
    }
  }
  res.send(_res)
}

async function deleteClientCtl(req, res) {
  const {id} = req.body;
  if (!id) {
    res.send({
      success: false,
      message: '请输传入id'
    })
  }
  const _res = await deleteClient({id});
  _res['message'] = _res.success ? '删除成功' : '删除失败'
  res.send(_res)
}

async function updateTrafficCtl(req, res) {
  const {success, data, message} = await statisticTraffic(true)
  res.send({
    success,
    data,
    message: success ? '更新流量成功' : '更新流量失败: '+message
  })
}

async function resetTrafficCtl(req, res) {
  const {email, id} = req.body
  if (!id) {
    res.send({
      success: false,
      message: '用户id丢失'
    })
  }
  if (!email) {
    res.send({
      success: false,
      message: '请输传入email'
    })
  }
  const {success, data, message} = await resetTraffic({email, id})
  res.send({
    success,
    data,
    message: success ? '重置流量成功' : '重置流量失败'
  })
}

async function restartServiceCtl(req, res) {
  const _res = await restartService()
  res.send(_res)
}

async function testActionCtl(req, res) {
  // const _res = await backupConfigFile()
  // const _res = await backupDataBase()
  // const _res = await recombineConfigFile()
  const _res = await dailySchedule()
  // const {success, data, message} = await execCommand(`systemctl restart xray`)
  // console.log('controllers log')
  res.send(_res)
}

async function putUserCtl(req, res) {
  const {name, password} = req.body;
  console.log(name, password)
  if (!name) {
    res.send({
      success: false,
      message: '请传入name'
    })
  }
  if (!password) {
    res.send({
      success: false,
      message: '请传入password'
    })
  }
  const _res = await addUser({name, password})
  console.log(_res)
  res.send(_res)
}

exports = module.exports = {
  loginCtl,
  restartServiceCtl,
  putClientCtl,
  deleteClientCtl,
  verifyTokenMiddle,
  listClientsCtl,
  updateTrafficCtl,
  resetTrafficCtl,
  testActionCtl,
  putUserCtl
}