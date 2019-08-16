import 'babel-polyfill'
import Vue from 'vue'
import Vuex from 'vuex'
import VueRouter from 'vue-router'
import 'fancybox'

Vue.use(VueRouter)

Vue.use(Vuex)

$('.fancy').fancybox()

new Vue({
    el: '#app',
    data: {
        a: 6
    }
})
