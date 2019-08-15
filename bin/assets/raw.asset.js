const Asset = require('./asset')
const store = require('../store')
class RawAsset extends Asset {
    constructor(options) {
        super(options)
        this.encoding = ''
        this.autoWatch = false
        this.filename = store.buildConfig.filename.res
    }
    rawTransform(content) {
        if (content.length < 5 * 1024) {
            this.autoOutput = false
            return `data:${this.mime};base64,${content.toString('base64')}`
        } else {
            this.autoOutput = true
            return content
        }
    }
    transform(content) {
        return this.rawTransform(content)
    }
}

module.exports = RawAsset
