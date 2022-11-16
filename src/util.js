const crypto = require('crypto');
const path = require('path');
exports = module.exports = {
  cryptPwd(password) {
    const md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex');
  },
  getCnf(cache = true){
    // const _ts = Date.now()
    if (!cache) {
      let _cnf = fs.readFileSync(path.resolve('configs.json'),{encoding:"utf-8"})
      _cnf = JSON.parse(_cnf)
      return _cnf[process?.env?.NODE_ENV ?? 'development']
    } else {
      const _cnf = require(path.resolve('configs.json'))
      return _cnf[process?.env?.NODE_ENV ?? 'development']
    }
  },
  // 深度合并对象
  mergeDeep(...objects) {
    // const isObject = obj => obj && typeof obj === 'object';
    const isObject = obj => obj && obj.constructor === Object;
    
    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach(key => {
        const pVal = prev[key];
        const oVal = obj[key];
        
        if (Array.isArray(pVal) && Array.isArray(oVal)) {
          prev[key] = pVal.concat(...oVal);
        }
        else if (isObject(pVal) && isObject(oVal)) {
          prev[key] = this.mergeDeep(pVal, oVal);
        }
        else {
          prev[key] = oVal;
        }
      });
      
      return prev;
    }, {});
  },
  randomCode(randomFlag, min, max){
    let str = "";
    let range = min;
    const arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // 随机产生
    if(randomFlag){
      range = Math.round(Math.random() * (max-min)) + min;
    }
    for(let i=0; i<range; i++){
      const pos = Math.round(Math.random() * (arr.length-1));
      str += arr[pos];
    }
    return str;
  },
  // formatDate(date, fmt) { //author: meizz 
  //   var o = {
  //     "M+": date.getMonth() + 1, //月份 
  //     "d+": date.getDate(), //日 
  //     "h+": date.getHours(), //小时 
  //     "m+": date.getMinutes(), //分 
  //     "s+": date.getSeconds(), //秒 
  //     "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
  //     "S": date.getMilliseconds() //毫秒 
  //   };
  //   if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  //   for (var k in o)
  //   if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  //   return fmt;
  // }
}