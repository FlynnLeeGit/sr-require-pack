module.exports = {
    paths: {
        vue: 'vue/dist/vue',
        jquery: 'https://cdn.bootcss.com/jquery/3.3.1/jquery.js',
        fancybox: 'fancybox/dist/js/jquery.fancybox',
        fancybox_css: 'fancybox/dist/css/jquery.fancybox.css'
    },
    shim: {
        fancybox: ['jquery', 'fancybox_css']
    },
    production: {
        paths: {
            vue: 'vue/dist/vue.min'
        }
    }
}
