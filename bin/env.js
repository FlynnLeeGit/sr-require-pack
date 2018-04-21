const _ = require('lodash')
const fse = require('fs-extra')
// 默认为生产环境
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
}

const Path = require('path')

let userBuildConfig = {}
const userBuildConifgPath = Path.resolve('./require-pack.build')
if (fse.existsSync(Path.resolve('./require-pack.build'))) {
    userBuildConfig = require(userBuildConifgPath)
}

const defaultBuildConfig = {
    srcDir: './src',
    distDir: './dist',
    html: './src/**/*.html',
    publicUrl: '/',
    requirejs: 'https://cdn.bootcss.com/require.js/2.3.5/require.min.js'
}

const buildConfig = _.merge(defaultBuildConfig, userBuildConfig)

const requireWebConfigPath = require.resolve(Path.resolve('./require-pack.web'))

const finalConfig = {
    SRC_DIR: Path.resolve(buildConfig.srcDir),
    DIST_DIR: Path.resolve(buildConfig.distDir),
    PUBLIC: buildConfig.publicUrl,

    STATIC_JS: 'static/js',
    STATIC_CSS: 'static/css',
    STATIC_RES: 'static/res',
    STATIC_VIEW: '',

    TPL: '[name].[ext]?[hash:8]',
    isProd: process.env.NODE_ENV === 'production',
    isDev: process.env.NODE_ENV === 'development',
    requirejs: buildConfig.requirejs,
    html: _.isArray(buildConfig.html)
        ? buildConfig.html.map(h => Path.resolve(h))
        : Path.resolve(buildConfig.html),
    requireWebConfigPath,
    webConfig() {
        let userWebConfig = {}
        delete require.cache[requireWebConfigPath]
        userWebConfig = require(requireWebConfigPath)

        const defaultWebConfig = {
            paths: {},
            shim: {},
            map: {
                '*': {
                    css: 'https://cdn.bootcss.com/require-css/0.1.10/css.min.js'
                }
            },
            production: {}
        }
        let webConfig = _.merge(defaultWebConfig, userWebConfig)
        if (process.env.NODE_ENV === 'production') {
            webConfig = _.merge(webConfig, webConfig.production)
        }
        delete webConfig.production
        return webConfig
    }
}

module.exports = finalConfig
