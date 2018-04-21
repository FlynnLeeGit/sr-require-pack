const rollup = require('rollup')
const posthtml = require('posthtml')
const CleanCss = require('clean-css')
const Path = require('path')
const fse = require('fs-extra')

const rollupLess = require('rollup-plugin-less')
const rollupVue = require('rollup-plugin-vue')
const rollupUglify = require('rollup-plugin-uglify')
const rollupBabel = require('rollup-plugin-babel')

const md5 = require('./utils/md5')
const generateCssContent = require('./utils/generate-css-content')
const ensureOutputFile = require('./utils/ensure-output-file')
const getDistname = require('./utils/get-distname')
const getEntry = require('./utils/get-entry')
const getUrl = require('./utils/get-url')

const { SRC_DIR, isDev, requirejs } = require('./env')

const CLEAN_CSS_OPTS = {
    format: 'keep-breaks'
}

const requireWrapper = content => {}

const htmlTask = (
    srcFile,
    { external = [], paths = {}, requireConfig = {} } = {}
) => {
    let extractCss = null

    // output less file from js
    const lessOut = (css, file) => {
        const baseDir = Path.dirname(file)
        const hash = md5(css)
        const name = getEntry(srcFile, SRC_DIR)
        extractCss = {
            name,
            hash,
            ext: '.css',
            type: 'css'
        }
        generateCssContent(css, baseDir)
            .then(cssContent => new CleanCss(CLEAN_CSS_OPTS).minify(cssContent))
            .then(ret => ensureOutputFile(getDistname(extractCss), ret.styles))
        return css
    }

    let rollupConfig = {
        inputOptions: {
            external,
            plugins: [
                rollupLess({
                    output: lessOut
                }),
                rollupVue({
                    css: true
                }),
                rollupBabel({
                    exclude: 'node_modules/**'
                })
                // rollupUglify()
            ]
        },
        outputOptions: {
            format: 'amd',
            paths,
            sourceMap: true
        }
    }

    const myPlugin = options => {
        const rootDir = options.rootDir
        return function amdHtmlPlugin(tree, cb) {
            const tasks = []

            tree.match({ tag: 'script' }, node => {
                node.attrs = node.attrs || {}

                if ('require-pack' in node.attrs) {
                    const src = node.attrs.src

                    const input = Path.join(rootDir, src)
                    const relativeEntry = getEntry(input, SRC_DIR)
                    const ext = Path.extname(input)
                    const hash = md5(
                        fse.readFileSync(input, { encoding: 'utf-8' })
                    )

                    const file = getDistname({
                        name: relativeEntry,
                        hash,
                        ext: ext,
                        type: 'js'
                    })

                    rollupConfig.inputOptions.input = input
                    rollupConfig.inputOptions.onwarn = function(warning) {
                        console.warn(warning.message, '->', input)
                    }
                    rollupConfig.outputOptions.file = file

                    const rollupTask = rollup
                        .rollup(rollupConfig.inputOptions)
                        .then(bundle =>
                            bundle.write(rollupConfig.outputOptions)
                        )
                        .then(() => {
                            const filecontent = fse.readFileSync(file, {
                                encoding: 'utf-8'
                            })
                            let newContent = `
                                    window.process = window.process || {};
                                    window.process.env = window.process.env || {};
                                    window.process.env.REQUIRE_CONFIG = ${JSON.stringify(
                                        requireConfig,
                                        null,
                                        2
                                    )};
                                    window.process.env.NODE_ENV = '${
                                        process.env.NODE_ENV
                                    }';`

                            newContent += `require.config(process.env.REQUIRE_CONFIG);`
                            newContent += `
                                if(process.env.NODE_ENV==='development'){
                                    var s= document.createElement('script');
                                    s.src = '//localhost:35729/livereload.js';
                                    document.head.appendChild(s);
                                    s.onload = function(){
                                        console.log('[development mode] livereload is running...')
                                    };
                                };
                            `
                            newContent += filecontent
                            const mainUrl = getUrl({
                                name: relativeEntry,
                                hash,
                                ext,
                                type: 'js'
                            })
                            // when the require-pack should load
                            if (node.attrs['require-pack'] === 'onload') {
                                node.attrs = {}
                                node.content = `
                                    window.onload = function(){
                                        var s = document.createElement('script');
                                        s.src = '${requirejs}';
                                        s.setAttribute('data-main','${mainUrl}');
                                        document.head.appendChild(s);
                                    };
                                `
                            } else {
                                node.attrs['src'] = requirejs
                                node.attrs['data-main'] = mainUrl
                            }
                            delete node.attrs['require-pack']
                            return ensureOutputFile(file, newContent)
                        })
                        .catch(e => {
                            console.error(e)
                        })
                    tasks.push(rollupTask)
                }

                return node
            })
            Promise.all(tasks).then(() => {
                // 有css样式
                if (extractCss) {
                    tree.unshift({
                        tag: 'link',
                        attrs: {
                            rel: 'stylesheet',
                            href: getUrl(extractCss)
                        }
                    })
                }
                cb(null, tree)
            })
        }
    }
    const start = Date.now()
    return posthtml()
        .use(
            myPlugin({
                rootDir: Path.dirname(srcFile)
            })
        )
        .process(fse.readFileSync(srcFile, { encoding: 'utf-8' }))
        .then(ret => {
            const entry = getEntry(srcFile, SRC_DIR)
            return fse.outputFile(
                getDistname({
                    name: entry,
                    tpl: '[name].html',
                    type: 'html'
                }),
                ret.html
            )
        })
        .then(() => {
            console.log(
                `[require-pack] ${getEntry(
                    srcFile,
                    SRC_DIR
                )} bundled ${Date.now() - start}ms`
            )
        })
        .catch(e => {
            console.error(e)
        })
}

module.exports = htmlTask
