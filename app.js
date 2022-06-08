const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const ENV = process.env.NODE_ENV;
const setupLogger = require('./src/setupLogger.js')

Date.prototype.format = function (fmt) {
    var o = {
      'M+': this.getMonth() + 1, //月份
      'd+': this.getDate(), //日
      'h+': this.getHours(), //小时
      'm+': this.getMinutes(), //分
      's+': this.getSeconds(), //秒
      'q+': Math.floor((this.getMonth() + 3) / 3), //季度
      S: this.getMilliseconds(), //毫秒
    }
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
    for (var k in o) if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    return fmt
}
Date.prototype.utcFormat = function (fmt) {
    var o = {
      'M+': this.getUTCMonth() + 1, //月份
      'd+': this.getUTCDate(), //日
      'h+': this.getUTCHours(), //小时
      'm+': this.getUTCMinutes(), //分
      's+': this.getUTCSeconds(), //秒
      'q+': Math.floor((this.getUTCMonth() + 3) / 3), //季度
      S: this.getMilliseconds(), //毫秒
    }
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getUTCFullYear() + '').substr(4 - RegExp.$1.length))
    for (var k in o) if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    return fmt
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: false
}));

const {
    loginCtl,
    verifyTokenMiddle,
    listClientsCtl,
    putClientCtl,
    deleteClientCtl,
    updateTrafficCtl,
    resetTrafficCtl,
    restartServiceCtl,
    testActionCtl,
    putUserCtl,
    deleteUserCtl,
    genQrcodeCtl,
    queryClientTrafficCtl,
    createUserCtl
} = require('./src/controller')
const {
    initAction,
    getConfigs,
    autoSetupSchedule,
    setDailySchedule
} = require('./src/service')
const PROJECTNAME = '/xray'

app.post(`${PROJECTNAME}/login`, loginCtl)
app.post(`${PROJECTNAME}/listClients`, verifyTokenMiddle, listClientsCtl)
app.post(`${PROJECTNAME}/addClient`, verifyTokenMiddle, putClientCtl)
app.post(`${PROJECTNAME}/updateClient`, verifyTokenMiddle, putClientCtl)
app.post(`${PROJECTNAME}/deleteClient`, verifyTokenMiddle, deleteClientCtl)
app.post(`${PROJECTNAME}/updateTraffic`, verifyTokenMiddle, updateTrafficCtl)
app.post(`${PROJECTNAME}/resetTraffic`, verifyTokenMiddle, resetTrafficCtl)
app.post(`${PROJECTNAME}/restartService`, verifyTokenMiddle, restartServiceCtl)
app.post(`${PROJECTNAME}/queryClientTraffic`, queryClientTrafficCtl)
app.post(`${PROJECTNAME}/addUser`, verifyTokenMiddle, putUserCtl)
app.post(`${PROJECTNAME}/updateUser`, verifyTokenMiddle, putUserCtl)
app.post(`${PROJECTNAME}/deleteUser`, verifyTokenMiddle, deleteUserCtl)
app.post(`${PROJECTNAME}/genQrcode`, verifyTokenMiddle, genQrcodeCtl)
app.post(`${PROJECTNAME}/testAction`, testActionCtl)
app.get(`${PROJECTNAME}/create-user`, createUserCtl)


const _configs = getConfigs()
app.listen(_configs.port, () => console.log(`Example app listening on port ${_configs.port}!`))

const logger = setupLogger()
initAction().then(res=>{
    const {success, message} = res;
    console.log(message)
    if (success) {
        setDailySchedule()
        autoSetupSchedule()
    }
});
    