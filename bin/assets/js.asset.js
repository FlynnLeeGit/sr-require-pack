const Asset = require('./asset')

const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const less = require('rollup-plugin-less')
const vuePlugin = require('rollup-plugin-vue')
const { uglify } = require('rollup-plugin-uglify')
// const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
// const postcss = require('rollup-plugin-postcss')
const vue = vuePlugin.default || vuePlugin

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
  }
  get rollupInput() {
    return {
      input: this.path,
      external: REQUIRE_PACK.rollupExternal,
      onwarn: e => {
        debug.warn(this.relname, '->', e)
      },
      plugins: [
        // resolve(),
        commonjs(),
        // postcss({
        //   extensions: ['.css']
        // }),
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
      this.autoOutput = false
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
      this.autoOutput = false
      const bundle = await rollup.rollup(this.rollupInput)
      // 先强行编译获取生成文件指纹
      const { code } = await bundle.generate(this.rollupOutput)
      this.transformContent = code

      // 再生成具体文件
      await bundle.write(this.rollupOutput)
      return code
    }
  }
}

module.exports = JsAsset
