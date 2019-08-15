const RawAsset = require('./raw.asset')
const store = require('../store')

class RequireRawAsset extends RawAsset {
    constructor(options) {
        super(options)
        this.srcDir = this.dir
        this.filename = store.buildConfig.filename.resChunk
        this.filenameCss = store.buildConfig.filename.cssChunk
    }
    transform(content) {
        return this.rawTransform(content)
    }
}

module.exports = RequireRawAsset
