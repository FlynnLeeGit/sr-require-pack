## RequirePack

bundle tool use requirejs

## intall
```
npm install -g sr-require-pack
```

## init
after installed, you can use 'rpack' command
```shell
# init with
rpack init

## this command will auto generate 'require-pack.web.js' && 'require-pack.build.js'


mkdir src
cd src && touch index.html
```

In Src Folder,we create a index.html and a index.js file
index.html
```html
<script require-pack src='./index.js'>
```

index.js
```js
console.log(1)
```








