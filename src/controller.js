const ENV = process.env.NODE_ENV;
const {
  login,
  listClients,
  updateClient,
  deleteClient,
  addClient,
  verifyToken,
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
  const token = req.headers.token;
  const _res = await verifyToken(token)
  if (_res.success) {
    next()
  } else {
    res.send(_res)
  }
}

async function listClientsCtl(req, res) {
  const {page, size, conditions} = req.body;
  const _page = page ? page : 1
  const _size = size ? size : 10
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
  const _traffic = traffic ? traffic : 20;
  let _off_date = off_date ? off_date : new Date(_now.setDate(_now.getDate()+1))
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
  if (!id) {
    _res = await addClient({email, uuid, price, off_date: _off_date, port: _port, remark, traffic: _traffic});
  } else {
    _res = await updateClient({email, uuid, price, off_date: _off_date, port: _port, remark, traffic: _traffic});
  }
  res.send(_res)
}

async function deleteClientCtl({id}) {
  if (!id) {
    res.send({
      success: false,
      message: '请输传入id'
    })
  }
  const _res = await deleteClient({id});
  res.send(_res)
}

exports = module.exports = {
  loginCtl,
  putClientCtl,
  deleteClientCtl,
  verifyTokenMiddle,
  listClientsCtl
}