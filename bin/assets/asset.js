const Fse = require('fs-extra')
const Path = require('path')

const chokidar = require('chokidar')
const _ = require('lodash')
const debug = require('../debug')
const Mime = require('mime-types')
const normalizePath = require('normalize-path')
const { md5, isBase64, isRemote } = require('../utils')
const store = require('../store')

class Asset {
  constructor({
    name,
    parent = null,
    depKey,
    content = '',

    autoLoad = true,
    autoWatch = true,
    autoOutput = true
  }) {
    this.name = name.indexOf('?') > -1 ? name.split('?')[0] : name
    this.parent = parent
    this.deps = new Map()
    this.encoding = 'utf-8'
    this.filename = '[name].[hash:8].[ext]'
    this.type = Path.extname(this.name).slice(1)
    this.content = content

    this.autoLoad = autoLoad
    this.autoWatch = autoWatch
    this.autoOutput = autoOutput

    this.srcDir = store.buildConfig.srcDir
    this.distDir = store.buildConfig.distDir
    this.publicUrl = store.buildConfig.publicUrl

    this.transformContent = ''

    if (this.parent) {
      this.parent.deps.set(depKey, this)
    }

    return this
  }
  /**
   * the absolute filepath of src File 依赖文件的绝对路径地址
   */
  get path() {
    if (this.parent) {
      // absolute path just return,if releative path join parent and child path
      return Path.isAbsolute(this.name)
        ? this.name
        : Path.join(this.parent.dir, this.name)
    } else {
      return Path.resolve(this.name)
    }
  }
  get root() {
    // root Assert
    let _root = null
    const findRoot = asset => {
      _root = asset
      if (asset.parent) {
        findRoot(asset.parent)
      }
    }
    findRoot(this)
    return _root
  }
  /**
   * the mimeType of file 文件mimeType类型 application/javascript 等
   */
  get mime() {
    return Mime.lookup(this.path)
  }
  /**
   * the Directory of file 依赖文件的来源文件夹绝对地址
   */
  get dir() {
    return Path.dirname(this.path)
  }
  /**
   *  file's extname with '.' 文件的后缀名路径 带有'.'
   */
  get extname() {
    return Path.extname(this.name)
  }
  /**
   * file's content hash 产出文件的内容hash
   */
  get hash() {
    if (this.transformContent) {
      return md5(this.transformContent)
    }
    return 'emptyMd5'
  }
  /**
   * the file directory relative to src directory 处理的文件所在的文件夹相对于src目录的相对文件夹
   */
  get reldir() {
    return Path.relative(this.srcDir, this.dir)
  }
  /**
   * the file name relative to src directory 当前文件相对于src目录的相对文件路径
   */
  get relname() {
    return Path.relative(this.srcDir, this.path)
  }
  get entry() {
    return Path.join(Path.dirname(this.relname), Path.parse(this.relname).name)
  }
  get distname() {
    return this.filename
      .replace('[name]', this.entry)
      .replace(/\[hash:(\d+)\]/, (match, len) => this.hash.slice(0, +len))
      .replace('[time]', Number.parseInt(Date.now() / 1000))
      .replace('[ext]', this.type)
  }
  get distpath() {
    return Path.join(Path.resolve(this.distDir), this.distname.split('?')[0])
  }
  /**
   * 计算产出最终url地址 改地址由 buildConfig.publicUrl生成
   */
  get disturl() {
    if (isBase64(this.transformContent)) {
      return this.transformContent
    } else {
      return `${store.buildConfig.publicUrl}${normalizePath(this.distname)}`
    }
  }
  get disturlWithNoExt() {
    return this.disturl.replace(this.extname, '')
  }
  /**
   * 计算资源和publicCdnUrls合并的资源url数组
   */
  get distCdnUrls() {
    return store.buildConfig.publicCdnUrls.map(
      baseUrl => `${baseUrl}${normalizePath(this.distname)}`
    )
  }
  /**
   * requirejs 使用的paths路径
   */
  get requireDistPaths() {
    return store.buildConfig.publicCdnUrls.length
      ? this.distCdnUrlsWithNoExt.concat(this.disturlWithNoExt)
      : this.disturlWithNoExt
  }
  get distCdnUrlsWithNoExt() {
    return this.distCdnUrls.map(url => url.replace(this.extname, ''))
  }
  async load() {
    // 没有内容的情况下才加载文件内容
    this.content = await Fse.readFile(this.path, {
      encoding: this.encoding
    })
  }
  async transform(code) {
    return code
  }

  // @return depAssert instance
  addDep({ name, parserType, autoWatch, autoLoad, autoOutput, content }) {
    if (!name) {
      debug.error('Asset.addDep should passs {name}')
    }
    if (!parserType) {
      debug.error('Asset.addDep should pass {parserType}')
    }
    // use
    const depKey = name + '->' + parserType
    if (this.deps.get(depKey)) {
      // console.log('提取依赖', depKey)
      return this.deps.get(depKey)
    } else {
      // console.log('新增依赖', depKey)
      const AssetCtor = store.parser.get(parserType)
      return new AssetCtor({
        name,
        parent: this,
        depKey,
        autoWatch,
        autoLoad,
        content,
        autoOutput
      })
    }
  }
  async outputFile() {
    const _output = async () => {
      debug.log(this.distname, 'outputed', `${Date.now() - this.start}ms`)
      await Fse.outputFile(this.distpath, this.transformContent)
    }
    const exist = await Fse.exists(this.distpath)
    if (!exist) {
      await _output()
    } else {
      // just output changed file,use isEqual
      const alreadyContent = await Fse.readFile(this.distpath, {
        encoding: this.encoding
      })
      if (!_.isEqual(alreadyContent, this.transformContent)) {
        await _output()
      }
    }
  }
  _setWatcher() {
    this.watcher = chokidar.watch(this.path)
    this.watcher.on('change', () => {
      this.root.process()
    })
  }
  async process() {
    try {
      this.start = Date.now()
      if (this.autoLoad) {
        await this.load()
      }
      this.transformContent = await this.transform(this.content)
      if (this.autoOutput) {
        await this.outputFile()
      }
      if (
        this.autoWatch &&
        process.env.NODE_ENV === 'development' &&
        !this.watcher
      ) {
        this._setWatcher()
      }
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = Asset
