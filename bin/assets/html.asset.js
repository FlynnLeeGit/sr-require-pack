const htmlParser = require('posthtml-parser')
const htmlRender = require('posthtml-render')
// const posthtmlApi = require('posthtml/lib/api')
const posthtml = require('posthtml')
const posthtmlExtend = require('./html/posthtml-extend')
const chokidar = require('chokidar')
const cheerio = require('cheerio')

const Asset = require('./asset')
const UglifyJs = require('uglify-js')

const _ = require('lodash')
const Fse = require('fs-extra')
const debug = require('../debug')
const { isRemote } = require('../utils')

const injectTpl = Fse.readFileSync(__dirname + '/html/inject.ejs', {
  encoding: 'utf-8'
})

const REQUIRE_PACK = process.REQUIRE_PACK

class HtmlAsset extends Asset {
  constructor(options) {
    super(options)
    this.type = 'html'
    this.filename = REQUIRE_PACK.buildConfig.filename.html
    this.htmlWatchPool = {}
    this.imports = {}
  }

  setHtmlWatcher() {
    _.map(this.imports, (v, importHtmlPath) => {
      if (!this.htmlWatchPool[importHtmlPath]) {
        const watcher = chokidar.watch(importHtmlPath)
        this.htmlWatchPool[importHtmlPath] = true
        watcher.on('change', () => {
          console.log('change')
          this.root.process()
        })
      }
    })
  }
  setLiveScript() {
    const liveScriptNode = {
      tag: 'script',
      attrs: {
        src: `http://localhost:${
          REQUIRE_PACK.buildConfig.livePort
        }/livereload.js`
      }
    }
    let hasBody = false
    this.ast.match({ tag: 'body' }, node => {
      node.content.push(liveScriptNode)
      hasBody = true
      return node
    })
    if (!hasBody) {
      this.ast.push(liveScriptNode)
    }
  }
  async transform(code) {
    const p = await posthtml()
      .use(
        posthtmlExtend({
          root: this.dir,
          imports: this.imports
        })
      )
      .process(code)

    this.ast = p.tree
    if (process.env.NODE_ENV === 'development') {
      // watch layouts in dev mode
      this.setHtmlWatcher()
      this.setLiveScript()
    }
    this.transformTasks = []
    this.ast.walk(node => {
      if (node && node.attrs && node.tag && 'require-pack' in node.attrs) {
        this.transformNodeTask(node)
      }
      return node
    })
    await Promise.all(this.transformTasks)
    return htmlRender(this.ast)
  }
  async transformNodeTask(node) {
    switch (node.tag) {
      case 'script':
        const name = node.attrs.src
        if (name && !isRemote(name)) {
          const jsAsset = this.addDep({ name, parserType: 'js' })
          this.transformTasks.push(
            jsAsset.process().then(() => {
              const compiled = _.template(injectTpl)
              const jsContent = compiled({
                NODE_ENV: process.env.NODE_ENV,
                GIT: JSON.stringify(REQUIRE_PACK.GIT),
                requireConfig: JSON.stringify(REQUIRE_PACK.requireConfig),
                externalDefine: REQUIRE_PACK.externalDefine,
                mainUrl: jsAsset.disturl,
                runtimeUrl: REQUIRE_PACK.runtimeUrl,
                isOnload: node.attrs['require-pack'] === 'onload'
              })
              delete node.attrs.src
              const minifyCode = UglifyJs.minify(jsContent).code
              node.content = minifyCode
            })
          )
        }
        break

      case 'link':
        if (node.attrs.rel === 'stylesheet') {
          const href = node.attrs.href
          if (href && !isRemote(href)) {
            let styleAsset
            if (/\.css$/.test(href)) {
              styleAsset = this.addDep({
                name: href,
                parserType: 'css'
              })
            }
            if (/\.less$/.test(href)) {
              styleAsset = this.addDep({
                name: href,
                parserType: 'less'
              })
            }
            this.transformTasks.push(
              styleAsset.process().then(() => {
                node.attrs.href = styleAsset.disturl
              })
            )
          }
        }
        break

      case 'a':
        const href = node.attrs.href
        if (href && !isRemote(href)) {
          const rawAsset = this.addDep({
            name: href,
            parserType: 'raw'
          })
          this.transformTasks.push(
            rawAsset.process().then(() => {
              node.attrs.href = rawAsset.disturl
            })
          )
        }
        break

      case 'img':
        const src = node.attrs.src
        if (src && !isRemote(src)) {
          const rawAsset = this.addDep({
            name: src,
            parserType: 'raw'
          })
          this.transformTasks.push(
            rawAsset.process().then(() => {
              node.attrs.src = rawAsset.disturl
            })
          )
        }
        break

      default:
        break
    }
  }
}
module.exports = HtmlAsset
