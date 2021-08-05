const ENV = process.env.NODE_ENV;
const {
    login,
} = require('./service')
exports = module.exports = {
    loginCtl: async function (req, res) {
        const _result  = await login(req.body)
        res.send(_result)
    },
}