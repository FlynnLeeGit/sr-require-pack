const fse = require('fs-extra')
const _ = require('lodash')

const ensureOutputFile = (path, content) => {
    return fse.outputFile(path, content)
}

module.exports = ensureOutputFile
