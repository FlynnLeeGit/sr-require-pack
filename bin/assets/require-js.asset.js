const Asset = require('./asset')
const Path = require('path')
const REQUIRE_PACK = process.REQUIRE_PACK

class RequireJsAsset extends Asset {
    constructor(options) {
        super(options)
        this.autoWatch = false
        this.srcDir = this.dir
        this.filename = REQUIRE_PACK.buildConfig.filename.jsChunk
        this.type = 'js'
    }
}

module.exports = RequireJsAsset
