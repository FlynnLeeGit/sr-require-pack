const Asset = require('./asset')
const Path = require('path')
const store = require('../store')

class RequireJsAsset extends Asset {
    constructor(options) {
        super(options)
        this.autoWatch = false
        this.srcDir = this.dir
        this.filename = store.buildConfig.filename.jsChunk
        this.type = 'js'
    }
}

module.exports = RequireJsAsset
