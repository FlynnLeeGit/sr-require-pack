const { TPL } = require('../env')

const HASH_REG = /\[hash:(\d+)\]/
const getFilename = ({ name = '', hash = '', ext = '', tpl = TPL } = {}) => {
    return tpl
        .replace('[name]', name)
        .replace(HASH_REG, (match, len) => hash.slice(0, +len))
        .replace('[ext]', ext)
}

module.exports = getFilename
