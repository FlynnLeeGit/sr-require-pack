const crypto = require('crypto')
const _ = require('lodash')

const md5 = content => {
    if (_.isString(content)) {
        content = content.trim()
    }
    return crypto
        .createHash('md5')
        .update(content)
        .digest('hex')
}

module.exports = md5
