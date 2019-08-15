const CssAsset = require('./css.asset')
const store = require('../store')

class RequireCssAsset extends CssAsset {
  constructor(options) {
    super(options)
    this.autoWatch = false
    this.srcDir = this.dir
    this.filename = store.buildConfig.filename.cssChunk
  }
  async transform(code) {
    return this.cssTransfrom(code, 'rraw', { minifyInProd: false })
  }
}

module.exports = RequireCssAsset
