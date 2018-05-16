const CssAsset = require('./css.asset')
const REQUIRE_PACK = process.REQUIRE_PACK

class RequireCssAsset extends CssAsset {
  constructor(options) {
    super(options)
    this.autoWatch = false
    this.srcDir = this.dir
    this.filename = REQUIRE_PACK.buildConfig.filename.cssChunk
  }
  async transform(code) {
    return this.cssTransfrom(code, 'rraw', { minifyInProd: false })
  }
}

module.exports = RequireCssAsset
