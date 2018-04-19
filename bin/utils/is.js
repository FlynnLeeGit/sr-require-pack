module.exports = {
    url: s => /^http/.test(s) || /^\//.test(s),
    css: s => /\.css$/.test(s),
    js: s => /\.js$/.test(s)
}
