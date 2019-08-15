const { getGit } = require('./utils')
module.exports = {
  /**
   * 是否开发环境
   */
  IS_DEV() {
    return process.env.NODE_ENV === 'development'
  },
  /**
   * 是否生产环境
   */
  IS_PROD() {
    return process.env.NODE_ENV === 'production'
  },
  /**
   * GIT版本号
   */
  GIT() {
    return getGit()
  },
  BUILD_NAME: 'require-pack.build.js',
  WEB_NAME: 'require-pack.web.js',
  parser: new Map(),
  // 默认构建配置
  buildConfig: {
    srcDir: './src',
    distDir: './dist',
    html: './src/**/*.html',
    publicUrl: '/',
    publicCdnUrls: [],
    // 默认是随机端口
    livePort: 0,
    filename: {
      js: '_static/js/[name].[ext]?[hash:8]',
      css: '_static/css/[name].[ext]?[hash:8]',
      res: '_static/res/[name].[ext]?[hash:8]',
      jsChunk: '_static/js/chunk/[name].[hash:8].[ext]',
      cssChunk: '_static/css/chunk/[name].[hash:8].[ext]',
      resChunk: '_static/res/chunk/[name].[hash:8].[ext]',
      html: '[name].html'
    },
    runtime: __dirname + '/requirejs/require-pack-runtime.js',
    production: {
      filename: {
        js: '_static/js/[name].[hash:8].[ext]',
        css: '_static/css/[name].[hash:8].[ext]',
        res: '_static/res/[name].[hash:8].[ext]'
      }
    }
  },
  /**
   * 默认web配置
   */
  webConfig: {
    paths: {},
    shim: {},
    map: {},
    production: {}
  },
  /**
   * require-pack运行时产出disturl
   */
  runtimeUrl: '',
  /**
   * 浏览器端具体使用的require配置
   */
  requireConfig: {
    paths: {},
    shim: {},
    map: {}
  },
  /**
   * rollup外部资源列表数组
   */
  rollupExternal: [],
  rollupPaths: [],
  externalDefine: '',
  htmlAssets: [],
  isUpdatingConfig: false
}
