const gulp = require('gulp')
const Fse = require('fs-extra')
const Path = require('path')
const _ = require('lodash')
const { BUILD_NAME, WEB_NAME } = require('./constants')
const debug = require('./debug')
const gulpWatch = require('gulp-watch')

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
    const { getGit } = require('./utils')
    debug.log('[env] -> ', process.env.NODE_ENV)
    process.REQUIRE_PACK = {}
    process.REQUIRE_PACK.GIT = getGit()
    debug.end('initEnv')
}

// async
const initBuildConfig = async () => {
    const { radomPort } = require('./utils')
    if (!Fse.existsSync(BUILD_NAME)) {
        debug.error(`${BUILD_NAME} is missing`)
    }
    const userBuildConfig = require(Path.resolve(BUILD_NAME))
    const defaultBuildConfig = {
        srcDir: './src',
        distDir: './dist',
        html: './src/**/*.html',
        publicUrl: '/',
        // 默认是随机端口
        livePort: 0,
        filename: {
            js: '_static/js/[name].[ext]?[hash:8]',
            css: '_static/css/[name].[ext]?[hash:8]',
            res: '_static/res/[name].[hash:8].[ext]',
            jsChunk: '_static/js/chunk/[name].[hash:8].[ext]',
            cssChunk: '_static/css/chunk/[name].[hash:8].[ext]',
            resChunk: '_static/res/chunk/[name].[hash:8].[ext]',
            html: '[name].html'
        },
        runtime: __dirname + '/requirejs/require-pack-runtime.js',
        production: {}
    }
    let buildConfig = _.merge(defaultBuildConfig, userBuildConfig)

    if (process.env.NODE_ENV === 'development') {
        const port = await radomPort(buildConfig.livePort)
        buildConfig.livePort = port
        process.REQUIRE_PACK.buildConfig = buildConfig
    }
    if (process.env.NODE_ENV === 'production') {
        buildConfig = _.merge(buildConfig, buildConfig.production)
        process.REQUIRE_PACK.buildConfig = buildConfig
    }
    debug.end('initBuildConfig')
    // radom port or user defined livePort
}

const initExternalConfig = () => {
    if (!Fse.existsSync(WEB_NAME)) {
        debug.error(`${WEB_NAME} is missing`)
    }
    const defaultWebConfig = {
        paths: {},
        shim: {},
        map: {},
        production: {}
    }
    delete require.cache[Path.resolve(WEB_NAME)]
    const userWebConfig = require(Path.resolve(WEB_NAME))
    let webConfig = _.merge(defaultWebConfig, userWebConfig)
    
    if (process.env.NODE_ENV === 'production') {
        webConfig = _.merge(webConfig, webConfig.production)
    }
    process.REQUIRE_PACK.webConfig = webConfig
    debug.end('initExternalConfig')
}

const assetRegister = () => {
    const parser = new Map()
    process.REQUIRE_PACK.parser = parser

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
    const parser = process.REQUIRE_PACK.parser
    const AssetCtor = parser.get('rjs')
    const runtimeAsset = new AssetCtor({
        name: process.REQUIRE_PACK.buildConfig.runtime,
        autoWatch: false
    })
    await runtimeAsset.process()
    process.REQUIRE_PACK.runtimeUrl = runtimeAsset.disturl
    debug.end('bundleRuntime')
}

const bundleExternal = async () => {
    const { isRemote, isJs, isCss, parseModulePath } = require('./utils')
    const _ = require('lodash')
    const parser = process.REQUIRE_PACK.parser
    const webConfig = _.cloneDeep(process.REQUIRE_PACK.webConfig)

    const jsPaths = {}
    const cssPaths = {}
    const externalPaths = {}

    const tasks = []
    _.forEach(webConfig.paths, (val, key) => {
        if (isRemote(val)) {
            if (isJs(val)) {
                jsPaths[key] = val.replace(/\.js$/, '')
            } else if (isCss(val)) {
                cssPaths[key] = 'css!' + val.replace(/\.css$/, '')
                return
            } else {
                jsPaths[key] = val
            }
        } else {
            let modulePath
            try {
                modulePath = parseModulePath(val)
            } catch (e) {
                debug.error(`module ${val} can not resolved`, '\n', e)
            }

            if (isJs(modulePath)) {
                const AssetCtor = parser.get('rjs')
                const rjsAsset = new AssetCtor({ name: modulePath })
                tasks.push(
                    rjsAsset.process().then(() => {
                        jsPaths[key] = rjsAsset.disturl.replace(/\.js$/, '')
                    })
                )
            }
            if (isCss(modulePath)) {
                const AssetCtor = parser.get('rcss')
                const rcssAsset = new AssetCtor({ name: modulePath })
                tasks.push(
                    rcssAsset.process().then(() => {
                        cssPaths[key] = rcssAsset.disturl
                    })
                )
            }
        }
    })
    await Promise.all(tasks)
    _.forEach(webConfig.shim, (val, name) => {
        if (_.isArray(val)) {
            const _deps = val
            webConfig.shim[name] = _deps.map(
                dep => (dep in cssPaths ? cssPaths[dep] : dep)
            )
        }
        if (_.isPlainObject(val)) {
            const _deps = val.deps || []
            val.deps = _deps.map(dep => (dep in cssPaths ? cssPaths[dep] : dep))
        }
        // in shim config but not in paths config,as a global external package
        if (!(name in jsPaths)) {
            externalPaths[name] = webConfig.shim[name].exports
        }
    })
    const requireConfig = _.cloneDeep(webConfig)

    requireConfig.paths = jsPaths

    let externalDefine = ''
    for (let name in externalPaths) {
        externalDefine += `define('${name}',function(){return ${
            externalPaths[name]
        }});\n`
    }
    process.REQUIRE_PACK.requireConfig = requireConfig
    process.REQUIRE_PACK.rollupExternal = [
        ...Object.keys(jsPaths),
        ...Object.keys(cssPaths),
        ...Object.keys(externalPaths)
    ]
    process.REQUIRE_PACK.externalDefine = externalDefine
    debug.end('bundleExternal')
}

const bundleHtmls = async () => {
    const glob = require('glob')
    const buildConfig = process.REQUIRE_PACK.buildConfig
    const parser = process.REQUIRE_PACK.parser

    const HtmlAsset = parser.get('html')

    const htmls = glob.sync(buildConfig.html)
    const tasks = []

    const htmlAssets = []
    htmls.forEach(htmlSrc => {
        const htmlAsset = new HtmlAsset({ name: htmlSrc })
        htmlAssets.push(htmlAsset)
        tasks.push(htmlAsset.process())
    })
    await Promise.all(tasks)
    process.REQUIRE_PACK.htmlAssets = htmlAssets
    debug.end('bundleHtmls')
}

const liveServer = () => {
    const liveReload = require('livereload')
    const PORT = process.REQUIRE_PACK.buildConfig.livePort
    debug.log('liveReload running on port', PORT)
    const liveServer = liveReload.createServer({
        delay: 50,
        port: PORT
    })
    liveServer.watch(process.REQUIRE_PACK.buildConfig.distDir)
}

const watchWebConfig = async () => {
    const htmlAssets = process.REQUIRE_PACK.htmlAssets
    await initExternalConfig()
    await bundleExternal()
    const promises = []
    htmlAssets.forEach(htmlAsset => {
        promises.push(htmlAsset.process())
    })
    await Promise.all(promises)
}

const watchHtmlAdd = async e => {
    const REQUIRE_PACK = process.REQUIRE_PACK
    if (e.event === 'add') {
        const AssetCtor = REQUIRE_PACK.parser.get('html')
        const htmlAsset = new AssetCtor({
            name: e.path
        })
        REQUIRE_PACK.htmlAssets.push(htmlAsset)
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
    gulpWatch(process.REQUIRE_PACK.buildConfig.html, watchHtmlAdd)
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
