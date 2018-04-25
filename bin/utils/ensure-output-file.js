const fse = require('fs-extra')
const _ = require('lodash')

const ensureOutputFile = (path, content) => {
    let encoding = 'utf-8'
    if (_.isBuffer(content)) {
        encoding = ''
    }
    if (!fse.existsSync(path)) {
        return fse.outputFile(path, content)
    }
    return fse.readFile(path, { encoding }).then(distContent => {
        if (_.isEqual(distContent, content)) {
            return Promise.resolve()
        } else {
            console.log(path, 'change')
            return fse.outputFile(path, content)
        }
    })
}

module.exports = ensureOutputFile
