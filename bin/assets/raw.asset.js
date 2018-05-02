const Asset = require('./asset')
const REQUIRE_PACK = process.REQUIRE_PACK

class RawAsset extends Asset {
    constructor(options) {
        super(options)
        this.encoding = ''
        this.filename = REQUIRE_PACK.buildConfig.filename.res
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
