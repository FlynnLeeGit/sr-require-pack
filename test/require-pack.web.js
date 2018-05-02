module.exports = {
    paths: {
        'babel-polyfill': 'babel-polyfill/dist/polyfill.js',
        vue: 'vue/dist/vue',
        jquery: './lib/jquery.js',
        fancybox: 'fancybox/dist/js/jquery.fancybox',
        fancybox_css: 'fancybox/dist/css/jquery.fancybox.css'
    },
    shim: {
        fancybox: ['jquery', 'fancybox_css']
    },
    production: {
        paths: {
            vue: 'vue/dist/vue.min',
            'babel-polyfill': 'babel-polyfill/dist/polyfill.min.js'
        }
    }
}
