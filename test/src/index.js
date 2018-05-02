import 'babel-polyfill'
import Vue from 'vue'

import 'fancybox'

$('.fancy').fancybox()

new Vue({
    el: '#app',
    data: {
        a: 6
    }
})
