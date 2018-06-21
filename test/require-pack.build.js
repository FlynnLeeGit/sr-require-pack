module.exports = {
  srcDir: './src',
  distDir: './dist',
  html: 'src/**/*.html',
  publicUrl: '/',
  livePort: 0,
  production:{
    filename:{
      js:'_static/js/[name].[ext]?[time]'
    }
  }
}
