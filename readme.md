## RequirePack

bundle tool use requirejs

## intall

```
npm install -g sr-require-pack
```

## how to use it

1.  init
    after installed, you can use 'rpack' command

```shell
# init with
rpack init

## this command will auto generate 'require-pack.web.js' && 'require-pack.build.js'
```

2.  create source directory

```shell
mkdir src
cd src && touch index.html && touch index.js && touch index.less
```

index.html content

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <!-- resolve a link href -->
    <link rel="stylesheet" require-pack href="./index.less">
</head>

<body>
    <h1>HELLO WORLD</h1>
    <div id="app" v-cloak>
        hello {{ name }}
    </div>
    <!-- resolve img -->
    <img src='./images/logo.png' require-pack>
    <!-- resolve a link resource -->
    <a href='./images/logo.png' require-pack>
    <!-- resolve a script src -->
    <script require-pack src="./index.js"></script>
</body>

</html>
```

index.js content

```js
import Vue from 'vue'

import 'fancybox'

$('.fancy').fancybox()

new Vue({
  el: '#app',
  data: {
    name: 'lee'
  }
})
```

index.less content

```less
body {
  background: lightblue;
}
```

3.  in project root folder,install required dependencies

```shell
npm install vue fancybox@2.15 -S
```

4.  use it in development mode

```shell
rpack dev
```

5.  with local server,by example you use [serve](http://localhost:5000)
    now can modify js file or html file to see liveReload

```shell
serve dist
```

6.  deploy
    it will minify css && js

```shell
rpack build
```

### require-pack.build.js

```js
module.exports = {
  // source folder
  srcDir: './src',
  // dest folder
  distDir: './dist',

  // which html will be require-packed,support glob path
  html: 'src/**/*.html',
  // all asset public prefix url
  publicUrl: '/',
// use cdn publicUrls to fallback resources
  publicCdnUrls:['//cdn1.cn/','//cdn2.cn/']

  // development mode liveReload port ,0 means random port
  livePort: 0
}
```

### require-pack.web.js

this config file is extends standard requirejs config

```js
module.exports = {
  // all external module path map
  paths: {
    vue: 'vue/dist/vue',
    jquery: './lib/jquery.js',
    fancybox: 'fancybox/dist/js/jquery.fancybox',
    fancybox_css: 'fancybox/dist/css/jquery.fancybox.css'
  },
  // same as requirejs shim config,configure module dep relationships and exports
  shim: {
    fancybox: ['jquery', 'fancybox_css']
  },
  // production config,it will merge  basic config
  production: {
    paths: {
      vue: 'vue/dist/vue.min',
      'babel-polyfill': 'babel-polyfill/dist/polyfill.min.js'
    }
  }
}
```
