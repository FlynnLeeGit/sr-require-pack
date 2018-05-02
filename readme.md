## RequirePack

amd format module's bundle tool



### use
```
├── require-pack.build.js
├── require-pack.web.js
├── src
│   ├── index.html
│   ├── index.js
│   ├── index.less
```

index.html
```html
 <script require-pack' src="./index.js"></script>

```


#### require-pack.build.js
define how to build
```js
module.exports = {
    // project source dir
    srcDir: './src',
    // dist folder
    distDir: './dist',

    publicUrl: '/',
    // requirejs file url,now only support remote url
    requirejs: 'http://path/to/require.js'
}
```

#### require-pack.web.js

define requirejs config,it extends the standard requirejs config

```js
module.exports = {
    // external modules's alias,define js and css file here
    paths: {
        //module from node_modules,be sure it is browser format file
        vue: 'vue/dist/vue',
        // relative path module
        fancybox: '../js/component/fancybox.js',
        fancybox_css: '../css/component/fancybox.css',
        jquery: 'http://path/to/jquery.js'
    },
    // define module's deps relation map,like requirejs shim config
    shim: {
        //
        fancybox: ['jquery'],
        fancybox: {
            deps: ['jquery']
        }
    }
}
```
