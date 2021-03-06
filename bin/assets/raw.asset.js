const Asset = require('./asset')
const Path = require('path')
const normalizePath = require('normalize-path')
const { isBase64 } = require('../utils')

const store = require('../store')
class RawAsset extends Asset {
  constructor(options) {
    super(options)
    this.encoding = ''
    this.autoWatch = false
    this.filename = store.buildConfig.filename.res
    this.filenameCss = store.buildConfig.filename.css
  }
  get rawDistUrl() {
    const parentDistDir = Path.dirname(this.parent.distname)
    const rawDistname = Path.relative(
      parentDistDir,
      this.distname
    )
    if (isBase64(this.transformContent)) {
      return this.transformContent
    } else {
      return normalizePath(rawDistname)
    }
  }
  rawTransform(content) {
    if (content.length < 8 * 1024) {
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
