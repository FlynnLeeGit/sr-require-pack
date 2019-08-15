const gulp = require('gulp')
const Fse = require('fs-extra')
const Path = require('path')
const _ = require('lodash')
const debug = require('./debug')
const gulpWatch = require('gulp-watch')
const { BUILD_NAME, WEB_NAME, IS_DEV, IS_PROD, parser } = require('./store')
const store = require('./store')
const defaultBuildConfig = store.buildConfig
const defaultWebConfig = store.webConfig

// sync init require-pack.web.js && require-pack.build.js
gulp.task('init', function() {
  const initConf = name => {
    if (Fse.existsSync(name)) {
      debug.log(`${name} already exist skip`)
    } else {
      const demoBuildConfig = Fse.readFileSync(__dirname + `/${name}`, {
        encoding: 'utf-8'
      })
      Fse.writeFileSync(name, demoBuildConfig)
      debug.end(`init ${name}`)
    }
  }
  initConf(BUILD_NAME)
  initConf(WEB_NAME)
})

// sync
const initEnv = () => {
  debug.log('[env] -> ', process.env.NODE_ENV)
  debug.end('initEnv')
}

// async
const initBuildConfig = async () => {
  const { radomPort } = require('./utils')
  if (!Fse.existsSync(BUILD_NAME)) {
    debug.error(`${BUILD_NAME} is missing`)
  }
  const userBuildConfig = require(Path.resolve(BUILD_NAME))
  let buildConfig = _.merge(defaultBuildConfig, userBuildConfig)
  if (IS_DEV()) {
    const port = await radomPort(buildConfig.livePort)
    buildConfig.livePort = port
    store.buildConfig = buildConfig
  }
  if (store.IS_PROD()) {
    buildConfig = _.merge(defaultBuildConfig, buildConfig.production)
    store.buildConfig = buildConfig
  }
  debug.end('initBuildConfig')
  // radom port or user defined livePort
}

const initExternalConfig = () => {
  if (!Fse.existsSync(WEB_NAME)) {
    debug.error(`${WEB_NAME} is missing`)
  }

  delete require.cache[Path.resolve(WEB_NAME)]

  const userWebConfig = require(Path.resolve(WEB_NAME))
  let webConfig = _.merge(defaultWebConfig, userWebConfig)

  if (IS_PROD()) {
    webConfig = _.merge(webConfig, webConfig.production)
  }
  store.webConfig = webConfig
  debug.end('initExternalConfig')
}

const assetRegister = () => {
  const HtmlAsset = require('./assets/html.asset')
  const JsAsset = require('./assets/js.asset')
  const CssAsset = require('./assets/css.asset')
  const LessAsset = require('./assets/less.asset')
  const RawAsset = require('./assets/raw.asset')

  const RequireJsAsset = require('./assets/require-js.asset')
  const RequireCssAsset = require('./assets/require-css.asset')
  const RequireRawAsset = require('./assets/require-raw.asset')

  parser.set('html', HtmlAsset)
  parser.set('js', JsAsset)
  parser.set('css', CssAsset)
  parser.set('less', LessAsset)
  parser.set('raw', RawAsset)

  parser.set('rjs', RequireJsAsset)
  parser.set('rcss', RequireCssAsset)
  parser.set('rraw', RequireRawAsset)

  debug.end('assetRegister')
}

const bundleRuntime = async () => {
  const AssetCtor = parser.get('rjs')
  const runtimeAsset = new AssetCtor({
    name: store.buildConfig.runtime,
    autoWatch: false
  })
  await runtimeAsset.process()
  store.runtimeUrl = runtimeAsset.disturl
  debug.end('bundleRuntime')
}

const bundleExternal = async () => {
  const {
    parseModulePath,
    parsePath
  } = require('./utils')
  const _ = require('lodash')
  const webConfig = _.cloneDeep(store.webConfig)

  const jsPaths = {}
  const cssPaths = {}
  const externalPaths = {}

  const tasks = []
  _.forEach(webConfig.paths, (val, key) => {
    const { type, isRemote, path } = parsePath(val)
    if (isRemote) {
      switch (type) {
        case 'js':
          jsPaths[key] = path.replace(/\.js$/, '')
          break
        case 'css':
          cssPaths[key] = path.replace(/\.css$/, '')
          break
        default:
          break
      }
    } else {
      let modulePath
      try {
        modulePath = parseModulePath(path)
      } catch (e) {
        debug.error(`module ${val} can not resolved`, '\n', e)
      }
      switch (type) {
        case 'js':
          const RjsCtor = parser.get('rjs')
          const rjsAsset = new RjsCtor({ name: modulePath })
          tasks.push(
            rjsAsset.process().then(() => {
              jsPaths[key] = rjsAsset.requireDistPaths
            })
          )
          break
        case 'css':
          const RcssCtor = parser.get('rcss')
          const rcssAsset = new RcssCtor({ name: modulePath })
          tasks.push(
            rcssAsset.process().then(() => {
              cssPaths[key] = rcssAsset.requireDistPaths
            })
          )
          break
        default:
          break
      }
    }
  })
  await Promise.all(tasks)
  _.forEach(webConfig.shim, (val, name) => {
    if (_.isArray(val)) {
      const _deps = val
      webConfig.shim[name] = _deps.map(dep =>
        dep in cssPaths ? `css!${dep}` : dep
      )
    }
    if (_.isPlainObject(val)) {
      const _deps = val.deps || []
      val.deps = _deps.map(dep => (dep in cssPaths ? `css!${dep}` : dep))
    }
    // in shim config but not in paths config,as a global external package
    if (!(name in jsPaths)) {
      externalPaths[name] = webConfig.shim[name].exports
    }
  })
  const requireConfig = _.cloneDeep(webConfig)

  requireConfig.paths = Object.assign(jsPaths, cssPaths)

  let externalDefine = ''
  for (let name in externalPaths) {
    externalDefine += `define('${name}',function(){return ${
      externalPaths[name]
    }});\n`
  }

  store.requireConfig = requireConfig
  store.rollupExternal = [
    ...Object.keys(jsPaths),
    ...Object.keys(cssPaths),
    ...Object.keys(externalPaths)
  ]

  store.rollupPaths = Object.keys(cssPaths).reduce((ret, cssKey) => {
    ret[cssKey] = `css!${cssKey}`
    return ret
  }, {})
  store.externalDefine = externalDefine
  debug.end('bundleExternal')
}

const bundleHtmls = async () => {
  const glob = require('glob')
  const HtmlAsset = parser.get('html')

  const htmls = glob.sync(store.buildConfig.html)
  const tasks = []

  const htmlAssets = []
  htmls.forEach(htmlSrc => {
    const htmlAsset = new HtmlAsset({ name: htmlSrc })
    htmlAssets.push(htmlAsset)
    tasks.push(htmlAsset.process())
  })
  await Promise.all(tasks)
  store.htmlAssets = htmlAssets
  debug.end('bundleHtmls')
}

const liveServer = () => {
  const liveReload = require('livereload')
  const PORT = store.buildConfig.livePort
  debug.log('liveReload running on port', PORT)
  const liveServer = liveReload.createServer({
    delay: 50,
    port: PORT
  })
  liveServer.watch(store.buildConfig.distDir)
}

const watchWebConfig = async () => {
  const htmlAssets = store.htmlAssets
  await initExternalConfig()
  await bundleExternal()
  const promises = []
  store.isUpdatingConfig = true
  htmlAssets.forEach(htmlAsset => {
    promises.push(htmlAsset.process())
  })
  await Promise.all(promises)
}

const watchHtmlAdd = async e => {
  if (e.event === 'add') {
    const AssetCtor = parser.get('html')
    const htmlAsset = new AssetCtor({
      name: e.path
    })
    store.htmlAssets.push(htmlAsset)
    await htmlAsset.process()
  }
}

gulp.task('initEnvConfig', initEnv)
gulp.task('initBuildConfig', ['initEnvConfig'], initBuildConfig)
gulp.task('initExternalConfig', ['initEnvConfig'], initExternalConfig)
gulp.task('assetRegister', ['initBuildConfig'], assetRegister)
gulp.task('liveServer', ['initBuildConfig'], liveServer)
gulp.task('bundleRuntime', ['assetRegister'], bundleRuntime)
gulp.task(
  'bundleExternal',
  ['initExternalConfig', 'assetRegister'],
  bundleExternal
)
gulp.task('watch', ['initBuildConfig'], function() {
  gulpWatch(WEB_NAME, watchWebConfig)
  gulpWatch(store.buildConfig.html, watchHtmlAdd)
})

// 开发
gulp.task(
  'dev',
  ['bundleRuntime', 'bundleExternal', 'liveServer', 'watch'],
  bundleHtmls
)

// 构建
gulp.task('build', ['bundleRuntime', 'bundleExternal'], bundleHtmls)

gulp.task('rpack', function() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  }
  if (process.env.NODE_ENV === 'development') {
    gulp.start('dev')
  }
  if (process.env.NODE_ENV === 'production') {
    gulp.start('build')
  }
})
