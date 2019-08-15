module.exports = {
  srcDir: './src',
  distDir: './dist',
  html: 'src/**/*.html',
  /**
   * 源站公共url
   */
  publicUrl: '/',
  /**
   * cdn 域名数组 对于requirejs 加载的资源可进行fallback处理
   */
  publicCdnUrls: ['//s1.styd.cn/v2/dist/', '//s2.styd.cn/v2/dist/'],
  livePort: 0
  // production:{
  //   filename:{
  //     js:'_static/js/[name].[ext]?[time]'
  //   }
  // }
}
