const RawAsset = require('./raw.asset')

const REQUIRE_PACK = process.REQUIRE_PACK

class RequireRawAsset extends RawAsset {
    constructor(options) {
        super(options)
        this.autoWatch = false
        this.srcDir = this.dir
        this.filename = REQUIRE_PACK.buildConfig.filename.resChunk
    }
    transform(content) {
        return this.rawTransform(content)
    }
}

module.exports = RequireRawAsset
