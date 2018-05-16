const Asset = require('./asset')

const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const less = require('rollup-plugin-less')
const vue = require('rollup-plugin-vue')
const uglify = require('rollup-plugin-uglify')
const _ = require('lodash')
const Fse = require('fs-extra')
const debug = require('../debug')
const Path = require('path')

const REQUIRE_PACK = process.REQUIRE_PACK
const IS_DEV = process.env.NODE_ENV === 'development'
const IS_PROD = process.env.NODE_ENV === 'production'

class JsAsset extends Asset {
    constructor(options) {
        super(options)
        this.type = 'js'
        this.filename = REQUIRE_PACK.buildConfig.filename.js
        this.autoWatch = false
        this.autoOutput = false
    }
    get rollupInput() {
        return {
            input: this.path,
            external: REQUIRE_PACK.rollupExternal,
            onwarn: e => {
                debug.warn(this.relname, '->', e)
            },
            plugins: [
                less({
                    // less 本身添加相对路径
                    insert: true,
                    output: (css, file) => {
                        const AssetCtor = REQUIRE_PACK.parser.get('css')
                        const depAsset = new AssetCtor({
                            name: file,
                            content: css,
                            autoOutput: false,
                            autoWatch: false,
                            autoLoad: false
                        })
                        return depAsset.process().then(() => {
                            return depAsset.transformContent
                        })
                    },
                    option: {
                        strictMath: true
                    }
                }),
                // http://vuejs.github.io/rollup-plugin-vue/#/
                vue({
                    css: true,
                    less: {
                        strictMath: true
                    }
                }),
                babel({
                    exclude: 'node_modules/**'
                }),
                IS_PROD && uglify()
            ]
        }
    }
    get rollupOutput() {
        return {
            format: 'amd',
            file: this.distpath,
            paths: REQUIRE_PACK.rollupPaths,
            sourcemap: true
        }
    }
    get watchOptions() {
        return {
            ...this.rollupInput,
            output: [this.rollupOutput]
        }
    }
    setRollupWatcher() {
        this.rollupWatcher && this.rollupWatcher.close()
        REQUIRE_PACK.isUpdatingConfig = false
        this.rollupWatcher = rollup.watch(this.watchOptions)
        this.rollupWatcher.on('event', async e => {
            if (e.code === 'BUNDLE_END') {
                debug.log(this.relname, 'outputed')
                await this.root.process()
            }
            if (e.code === 'ERROR') {
                debug.error(this.relname, '->', e)
            }
            if (e.code === 'FATAL') {
                debug.error(this.relname, '->', e)
            }
        })
    }

    async transform(code) {
        // development mode,rollup watch mode
        if (IS_DEV) {
            // already has watcher
            if (this.rollupWatcher && !REQUIRE_PACK.isUpdatingConfig) {
                const distContent = await Fse.readFile(this.distpath, {
                    encoding: this.encoding
                })
                return distContent
            } else {
                this.setRollupWatcher()
                return code
            }
        }

        // production just output
        if (IS_PROD) {
            const bundle = await rollup.rollup(this.rollupInput)
            const ret = await bundle.write(this.rollupOutput)
            return ret.code
        }
    }
}

module.exports = JsAsset
