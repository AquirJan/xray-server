const ENV = process.env.NODE_ENV;
const { modifyNginx, deleteNginxPort, deleteNginxApi } = require('./modifyNginxService.js');
const { queryPromise } = require('./mysql.js');
const {
  login,
  listClients,
  updateClient,
  deleteClient,
  addClient,
  verifyToken,
  detectDuplicateAccount,
  statisticTraffic,
  resetTraffic,
  restartService,
  execCommand,
  backupConfigFile,
  backupDataBase,
  recombineConfigFile,
  genQrcode,
  addUser,
  updateUser,
  deleteUser,
  dailySchedule,
  queryClientTraffic,
  gitHubOAuth,
  isDevEnv,
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
  const {id, email, uuid, price, off_date, port, remark, traffic, timezone, api} = req.body
  // const _now = new Date()
  const _price = price ? price : 20;
  const _traffic = traffic ? traffic : 20;
  let _timezoneDirect = Number(timezone) > 0 ? '+' : '-'
  let _timeDelta = Math.abs(Number(timezone))
  _timeDelta = _timeDelta >= 10 ? `${_timeDelta}:00` : `0${_timeDelta}:00`
  let _timezoneDelta = `GMT${_timezoneDirect}${_timeDelta}`
  let _off_date = off_date ? new Date(off_date + ` ${_timezoneDelta}`).utcFormat('yyyy/MM/dd hh:mm:ss') : ''
  // let _off_date = off_date ? new Date(off_date).utcFormat('yyyy/MM/dd hh:mm:ss') : '';
  if (!_off_date) {
    res.send({
      success: false,
      message: '请传入off_date'
    })
  }
  
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
  const _obj = {email, uuid, remark, price: _price, off_date: _off_date, port,  traffic: _traffic, api}
  let _ddaRes = await detectDuplicateAccount({id, email, uuid, port})
  // console.log(_obj)
  if (_ddaRes.data && _ddaRes.data.length) {
    res.send({
      success: false,
      message: '该email账号或uuid或port已存在'
    })
    return;
  }
  
  if (id) {
    let _client = await queryPromise(`select * from clients where id=${id}`)
    _client = _client?.data?.[0]
    // console.log(_client)
    if (!_client) {
      res.send({
        success: false,
        message: `update client miss id param`
      })
    }
    const _delPortRes = await deleteNginxPort(_client.port)
    // console.log(_delPortRes.message)
    if (!_delPortRes.success){
      res.send({
        success: false,
        message: `updateClient Error: ${_delPortRes.message}`
      })
    }
    const _delApiRes = await deleteNginxApi(_client.api)
    // console.log(_delApiRes.message)
    if (!_delApiRes.success){
      res.send({
        success: false,
        message: `updateClient Error: ${_delApiRes.message}`
      })
    }
    const _setupNingxRes = await modifyNginx({port: _obj.port, api: _obj.api, isdev: isDevEnv()})
    if (!_setupNingxRes.success) {
      res.send({
        success: false,
        message: `updateClient Error: ${_setupNingxRes.message}`
      })
    }
    _obj['id'] = id;
    let _updateRes = await updateClient(_obj);
    _res['success'] = _updateRes.success
    _res['message'] = _updateRes.success ? '更新成功' : `更新失败: ${_updateRes.message}`
  } else {
    const _setupNingxRes = await modifyNginx({port: _obj.port, api: _obj.api, isdev: isDevEnv()})
    if (!_setupNingxRes.success) {
      res.send({
        success: false,
        message: `addClient Error: ${_setupNingxRes.message}`
      })
    }
    let _addRes = await addClient(_obj);
    _res['success'] = _addRes.success
    _res['message'] = _addRes.success ? '添加成功' : `添加失败: ${_addRes.message}`
  }
  
  res.send(_res)
}

async function deleteClientCtl(req, res) {
  const {id, email, port, api} = req.body;
  if (!id) {
    res.send({
      success: false,
      message: '请输传入id'
    })
  }
  const _delPortRes = await deleteNginxPort(Number(port))
  // console.log(_delPortRes)
  if (!_delPortRes.success){
    res.send({
      success: false,
      message: `deleteClient Error: ${_delPortRes.message}`
    })
  }
  const _delApiRes = await deleteNginxApi(api)
  // console.log(_delApiRes)
  if (!_delApiRes.success){
    res.send({
      success: false,
      message: `deleteClient Error: ${_delApiRes.message}`
    })
  }
  const _res = await deleteClient({id, email});
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
async function dailyScheduleCtl(req, res) {
  // const _res = await backupConfigFile()
  // const _res = await backupDataBase()
  // const _res = await recombineConfigFile()
  const _res = await dailySchedule()
  // const {success, data, message} = await execCommand(`systemctl restart xray`)
  // console.log('controllers log')
  res.send(_res)
}

async function putUserCtl(req, res) {
  const {id, name, password, remark} = req.body;
  if (id) {
    if (!id) {
      res.send({
        success: false,
        message: '请传入必要参数id'
      })
    }
    // console.log(id, name)
    const _res = await updateUser({id, name, remark, password})
    res.send(_res)
  } else {
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
    res.send(_res)
  }
}

async function deleteUserCtl(req, res) {
  const {id} = req.body;
  if (!id) {
    res.send({
      success: false,
      message: '请输传入id'
    })
  }
  const _res = await deleteUser({id});
  _res['message'] = _res.success ? '删除成功' : '删除失败'
  res.send(_res)
}

async function genQrcodeCtl(req, res) {
  const { email, api, port } = req.body;
  if (!email) {
    res.send({
      success: false,
      message: '请传入email'
    })
  }
  if (!api) {
    res.send({
      success: false,
      message: '请传入api'
    })
  }
  if (!port) {
    res.send({
      success: false,
      message: '请传入port'
    })
  }
  const _res = await genQrcode({email, api, port})
  res.send(_res)
}

async function queryClientTrafficCtl(req, res) {
  const { email } = req.body;
  if (!email) {
    res.send({
      success: false,
      message: '请传入email'
    })
  }
  const _res = await queryClientTraffic({email})
  res.send(_res)
}

async function OAuthLoginCtl(req, res) {
  const {type, code} = req?.body || {}
  if (!type) {
    res.send({
      success: false,
      message: `请传入需要接入的OAuth类型`
    })
  }
  if (type === 'github') {
    const _res = await gitHubOAuth({code})
    res.send(_res)
  }
}

exports = module.exports = {
  dailyScheduleCtl,
  OAuthLoginCtl,
  queryClientTrafficCtl,
  loginCtl,
  restartServiceCtl,
  putClientCtl,
  deleteClientCtl,
  verifyTokenMiddle,
  listClientsCtl,
  updateTrafficCtl,
  resetTrafficCtl,
  testActionCtl,
  putUserCtl,
  deleteUserCtl,
  genQrcodeCtl
}