module.exports = {
    url: s => /^http/.test(s) || /^\//.test(s) || /data:/.test(s),
    css: s => /\.css$/.test(s),
    js: s => /\.js$/.test(s)
}
