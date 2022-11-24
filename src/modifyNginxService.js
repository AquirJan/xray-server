const path = require('path')
const fs = require('fs')
const logger = require('./logger')
function deleteNginxPort(port){
  return new Promise(resolve=>{
    try {
      if (!port) {
        logger.info(`deleteNginxPort Error: miss port param`)
        throw new Error(`deleteNginxPort Error: miss port param`)
      }
      if (port.constructor!==Number){
        logger.info(`deleteNginxPort Error: port param constructor Error`)
        throw new Error(`deleteNginxPort Error: port param constructor Error`)
      }
      let _contentArray = fs.readFileSync(path.resolve('nginx_default'), 'utf-8')
      _contentArray = _contentArray.split(/\r|\n/gi);
      const _txtReg = new RegExp(`^(\\t|\s)*listen ${port} ssl;$`, 'gi')
      let _hasTxt = false;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(_txtReg)){
          _contentArray.splice(i, 1)
          _hasTxt = true;
          break;
        }
      }
      if (!_hasTxt){
        return resolve({
          success: true,
          message: `不存在该nginx配置端口`
        })
      }
      
      _contentArray = _contentArray.join('\n')
      fs.writeFileSync(path.resolve('nginx_default'), _contentArray, 'utf-8')
      return resolve({
        success: true,
        message: `deleteNginxPort Success`
      })
    } catch(error) {
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `deleteNginxPort Error: ${error.message}`
      })
    }
  })
}
function deleteNginxApi(api){
  return new Promise(resolve=>{
    try {
      if (!api) {
        logger.info(`deleteNginxApi Error: miss api param`)
        throw new Error(`deleteNginxApi Error: miss api param`)
      }
      if (api.constructor!==String){
        logger.info(`deleteNginxApi Error: api param constructor Error`)
        throw new Error(`deleteNginxApi Error: api param constructor Error`)
      }
      let _contentArray = fs.readFileSync(path.resolve('nginx_default'), 'utf-8')
      _contentArray = _contentArray.split(/\r|\n/gi);
      const _txtReg = new RegExp(`^(\\t|\s)*location ${api} {$`, 'gi')
      let _newContentArray = [];
      let _matchedStart = false;
      let _hasTxt = false;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(_txtReg)){
          _matchedStart = true;
          _hasTxt = true;
        } else if (_contentArray[i].match(/}/gi) && _matchedStart){
          _matchedStart = false;
        } else if (!_matchedStart) {
          _newContentArray.push(_contentArray[i])
        }
      }
      if (!_hasTxt){
        return resolve({
          success: true,
          message: `不存在该nginx api`
        })
      }
      _newContentArray = _newContentArray.join('\n')
      fs.writeFileSync(path.resolve('nginx_default'), _newContentArray, 'utf-8')
      return resolve({
        success: true,
        message: `deleteNginxApi Success`
      })
    } catch(error) {
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `deleteNginxApi Error: ${error.message}`
      })
    }
  })
}
function setNginxApi(api, xrayPort){
  return new Promise(resolve=>{
    try {
      if (!api || api.constructor!==String) {
        throw new Error(`miss api param or constructor Error excepted String`)
      }
      console.log(xrayPort)
      if (!xrayPort || xrayPort.constructor!==Number) {
        throw new Error(`miss xrayPort param or constructor Error excepted Number`)
      }
      let _contentArray = fs.readFileSync(path.resolve('nginx_default'), 'utf-8')
      _contentArray = _contentArray.split(/\r|\n/gi);
      const _txtReg = new RegExp(`^(\\t|\s)*location ${api} {$`, 'gi')
      let _hasTxt = false;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(_txtReg)){
          _hasTxt = true;
          break;
        }
      }
      if (_hasTxt){
        return resolve({
          success: true,
          message: `setNginxApi 已经存在该nginx api`
        })
      }
      let _insertIndex = undefined;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(/^(\\t|\s)*ssl_certificate.+/gi)){
          _insertIndex = i;
          break;
        }
      }
      if (_insertIndex === undefined){
        throw new Error(`miss _insertIndex`)
      }
      let _apiContents = `\tlocation ${api} {\n\t\tproxy_pass http://127.0.0.1:${xrayPort};\n\t\tproxy_redirect off;\n\t\tproxy_http_version 1.1;\n\t\tproxy_set_header Upgrade $http_upgrade;\n\t\tproxy_set_header Connection "upgrade";\n\t\tproxy_set_header Host $http_host;\n\t}`
      _contentArray.splice(_insertIndex, 0, _apiContents);
      _contentArray = _contentArray.join('\n')
      // fs.copyFileSync(path.resolve('nginx_default'), path.resolve(`nginx_default_backup_${new Date().format('yyyy-MM-dd')}`))
      fs.writeFileSync(path.resolve('nginx_default'), _contentArray, 'utf-8')
      return resolve({
        success: true,
        message: `setNginxApi Success`
      })
    } catch(error) {
      logger.info(`setNginxApi Error: ${error.message}`)
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `setNginxApi Error: ${error.message}`
      })
    }
  })
}
function setNginxPort(port){
  return new Promise(resolve=>{
    try {
      if (!port) {
        logger.info(`miss port param`)
        throw new Error(`miss port param`)
      }
      if (port.constructor!==Number){
        logger.info(`port param constructor Error`)
        throw new Error(`port param constructor Error`)
      }
      let _contentArray = fs.readFileSync(path.resolve('nginx_default'), 'utf-8')
      // console.dir(_contentArray)
      _contentArray = _contentArray.split(/\r|\n/gi);
      const _txtReg = new RegExp(`^(\\t|\s)*listen ${port} ssl;$`, 'gi')
      let _hasTxt = false;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(_txtReg)){
          _hasTxt = true;
          break;
        }
      }
      if (_hasTxt){
        return resolve({
          success: true,
          message: `setNginxPort 已经存在该nginx配置端口`
        })
      }
      let _insertIndex = undefined;
      for (let i=0;i<_contentArray.length;i++){
        if (_contentArray[i].match(/^(\\t|\s)*ssl_certificate.+/gi)){
          _insertIndex = i;
          break;
        }
      }
      // console.log(_insertIndex)
      if (_insertIndex === undefined){
        throw new Error(`miss _insertIndex`)
      }
      _contentArray.splice(_insertIndex, 0, `\tlisten ${port} ssl;`)
      _contentArray = _contentArray.join('\n')
      // console.log(_contentArray)
      // fs.copyFileSync(path.resolve('nginx_default'), path.resolve(`nginx_default_backup_${new Date().format('yyyy-MM-dd')}`))
      fs.writeFileSync(path.resolve('nginx_default'), _contentArray, 'utf-8')
      return resolve({
        success: true,
        message: `setNginxPort Success`
      })
    } catch(error) {
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `setNginxPort Error: ${error.message}`
      })
    }
  })
}
function modifyNginx({port, api, isdev=true}={}){
  return new Promise(async resolve=>{
    try {
      if (!isdev){
        fs.copyFileSync(path.resolve('/etc/nginx/sites-available/default'), path.resolve(`nginx_default`))
        fs.copyFileSync(path.resolve('/etc/nginx/sites-available/default'), path.resolve(`nginx_default_backup`))
      }
      const _setApiRes = await setNginxApi(api, (port+1000))
      // console.log(`modifyNginx: ${_setApiRes.message}`)
      if (!_setApiRes.success){
        throw new Error(_setApiRes.message)
      }
      const _setPortRes = await setNginxPort(port)
      // console.log(`modifyNginx: ${_setPortRes.message}`)
      if (!_setPortRes.success){
        throw new Error(_setPortRes.message)
      }
      // if (!isdev){
      //   fs.copyFileSync(path.resolve(`nginx_default`), path.resolve('/etc/nginx/sites-available/default'))
      // }
      // const _restartRes = await execCommand(`nginx -s reload`)
      // if (!_restartRes.success) {
      //   throw new Error(_restartRes.message)
      // }
      return resolve({
        success: true,
        message: `modifyNginx Success`
      })
    } catch(error) {
      console.dir(error)
      return resolve({
        success: false,
        error: true,
        data: error,
        message: `modifyNginx Error: ${error.message}`
      })
    }
  })
}
module.exports = {
  setNginxApi,
  setNginxPort,
  deleteNginxApi,
  deleteNginxPort,
  modifyNginx,
}