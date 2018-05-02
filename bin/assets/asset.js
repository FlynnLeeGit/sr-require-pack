const Fse = require('fs-extra')
const Path = require('path')

const chokidar = require('chokidar')
const crypto = require('crypto')
const _ = require('lodash')
const debug = require('../debug')
const Mime = require('mime-types')
const { md5, isBase64, isRemote } = require('../utils')

const REQUIRE_PACK = process.REQUIRE_PACK

let aid = 1

const container = {}

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
        this.id = aid++
        this.deps = new Map()
        this.encoding = 'utf-8'
        this.filename = '[name].[hash:8].[ext]'
        this.type = Path.extname(this.name).slice(1)
        this.content = content

        this.autoLoad = autoLoad
        this.autoWatch = autoWatch
        this.autoOutput = autoOutput

        this.srcDir = REQUIRE_PACK.buildConfig.srcDir
        this.distDir = REQUIRE_PACK.buildConfig.distDir
        this.publicUrl = REQUIRE_PACK.buildConfig.publicUrl

        this.transformContent = ''

        if (this.parent) {
            this.parent.deps.set(depKey, this)
        }

        container[this.id] = this
        return this
    }
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
    get mime() {
        return Mime.lookup(this.path)
    }
    get dir() {
        return Path.dirname(this.path)
    }
    get hash() {
        if (this.transformContent) {
            return md5(this.transformContent)
        }
        return 'emptyMd5'
    }
    get relname() {
        return Path.relative(this.srcDir, this.path)
    }
    get entry() {
        return Path.join(
            Path.dirname(this.relname),
            Path.parse(this.relname).name
        )
    }
    get distname() {
        return this.filename
            .replace('[name]', this.entry)
            .replace(/\[hash:(\d+)\]/, (match, len) => this.hash.slice(0, +len))
            .replace('[ext]', this.type)
    }
    get distpath() {
        return Path.join(
            Path.resolve(this.distDir),
            this.distname.split('?')[0]
        )
    }
    get disturl() {
        if (isBase64(this.transformContent)) {
            return this.transformContent
        } else {
            return `${this.publicUrl}${this.distname}`
        }
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
            const AssetCtor = REQUIRE_PACK.parser.get(parserType)
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
    setWatcher() {
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
                this.setWatcher()
            }
        } catch (e) {
            console.error(e)
        }
    }
}

module.exports = Asset
