const Asset = require('./asset')
const { isRemote } = require('../utils')
const CleanCss = require('clean-css')
const store = require('../store')
const CSS_REQUIRE_REG = /url\(['"]?([^'"\(\)]+)['"]?\)/g
const CLEAN_CSS_OPTS = {
  // format: 'keep-breaks',
  compatibility: 'ie8'
}

class CssAsset extends Asset {
  constructor(options) {
    super(options)
    this.type = 'css'
    this.filename = store.buildConfig.filename.css
  }
  async cssTransfrom(code, parserType, { minifyInProd = true } = {}) {
    const tasks = []
    const replaceMap = {}
    code.replace(CSS_REQUIRE_REG, (match, r) => {
      const name = r.trim()
      if (!isRemote(name)) {
        const depAsset = this.addDep({
          name,
          parserType
        })
        tasks.push(
          depAsset.process().then(() => {
            replaceMap[r] = match.replace(r, depAsset.disturl)
          })
        )
      }
    })
    await Promise.all(tasks)
    this.cssText = code.replace(CSS_REQUIRE_REG, (match, r) => {
      return r in replaceMap ? replaceMap[r] : match
    })

    // css minify
    if (store.IS_PROD && minifyInProd) {
      this.cssText = new CleanCss(CLEAN_CSS_OPTS).minify(this.cssText).styles
    }

    return this.cssText
  }
  async transform(code) {
    const ret = await this.cssTransfrom(code, 'raw')
    return ret
  }
}

module.exports = CssAsset
