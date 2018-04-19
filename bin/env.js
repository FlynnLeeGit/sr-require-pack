// 默认为生产环境
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
}

const Path = require('path')

const requireBuild = require(Path.resolve('./require-pack.build'))

const DIST_DIR =
    Path.resolve(requireBuild.build.distDir) || Path.resolve('./dist')

module.exports = {
    SRC_DIR: Path.resolve(requireBuild.build.srcDir) || Path.resolve('./src'),
    DIST_DIR: DIST_DIR,
    PUBLIC: requireBuild.build.publicUrl || '/',

    STATIC_JS: 'static/js',
    STATIC_CSS: 'static/css',
    STATIC_RES: 'static/res',

    TPL: '[name][ext]?[hash:8]',
    isProd: process.env.NODE_ENV === 'production',
    isDev: process.env.NODE_ENV === 'development',
    requirejs: requireBuild.requirejs,
    browserSync: {
        files: [Path.resolve(DIST_DIR, '**/*.*')]
    },
    htmls: Path.resolve(requireBuild.build.htmls),
    require_web: Path.resolve('./require-pack.web.js')
}
