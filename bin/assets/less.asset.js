const less = require('less')
const Asset = require('./asset')
const CssAsset = require('./css.asset')
const Path = require('path')
const chokidar = require('chokidar')
const store = require('../store')

class LessAsset extends Asset {
  constructor(options) {
    super(options)
    this.type = 'css'
    this.filename = store.buildConfig.filename.css
    this.lessWatcherPool = {}
  }
  async transform(code) {
    const filename = Path.relative(process.cwd(), this.path)
    const output = await less.render(code, {
      strictMath: true,
      filename,
      relativeUrls: true,
      sourceMap: {}
    })
    if (store.IS_DEV()) {
      // watch @import less files
      output.imports.map(importLessPath => {
        if (!this.lessWatcherPool[importLessPath]) {
          const watcher = chokidar.watch(importLessPath)
          this.lessWatcherPool[importLessPath] = true
          watcher.on('change', () => {
            this.root.process()
          })
        }
      })
    }

    const cssTransform = CssAsset.prototype.cssTransfrom
    const cssText = await cssTransform.call(this, output.css, 'raw')
    return cssText
  }
}

module.exports = LessAsset
