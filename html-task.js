const rollup = require('rollup')
const posthtml = require('posthtml')
const CleanCss = require('clean-css')
const Path = require('path')
const fse = require('fs-extra')

const rollupLess = require('rollup-plugin-less')
const rollupVue = require('rollup-plugin-vue')
const rollupUglify = require('rollup-plugin-uglify')

const md5 = require('./utils/md5')
const generateCssContent = require('./utils/generate-css-content')
const ensureOutputFile = require('./utils/ensure-output-file')
const getDistname = require('./utils/get-distname')
const getEntry = require('./utils/get-entry')
const getUrl = require('./utils/get-url')

const { SRC_DIR, requirejs } = require('./env')

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
                })
            ]
        },
        outputOptions: {
            format: 'amd',
            paths
        }
    }

    const myPlugin = options => {
        const rootDir = options.rootDir
        return function amdHtmlPlugin(tree, cb) {
            const tasks = []

            tree.match({ tag: 'script' }, node => {
                if ('amd' in node.attrs) {
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
                            node.attrs['src'] = requirejs
                            delete node.attrs.amd

                            const filecontent = fse.readFileSync(file, {
                                encoding: 'utf-8'
                            })
                            let newContent = `
                                    window.process = window.process || {};
                                    window.process.env = window.process.env || {};
                                    window.process.env.NODE_ENV = '${
                                        process.env.NODE_ENV
                                    }';`
                            newContent += `require.config(${JSON.stringify(
                                requireConfig,
                                null,
                                2
                            )});`
                            newContent += `
                                    if(process.env.NODE_ENV==='development'){
                                        var s= document.createElement('script');
                                        s.src = 'http://HOST:${3000}/browser-sync/browser-sync-client.js'.replace('HOST',location.hostname);
                                        document.head.appendChild(s);
                                    };
                                `
                            if(node.attrs.amd){
                                newContent+=`window.${node.attrs.amd} = function(){`
                            }
                            newContent += filecontent
                            if(node.attrs.amd){
                                newContent+= '})'
                            }
                            node.attrs['data-main'] = getUrl({
                                name: relativeEntry,
                                hash,
                                ext,
                                type: 'js'
                            })
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
                    tree.match({ tag: 'head' }, node => {
                        node.content.push({
                            tag: 'link',
                            attrs: {
                                rel: 'stylesheet',
                                href: getUrl(extractCss)
                            }
                        })
                        return node
                    })
                }
                cb(null, tree)
            })
        }
    }
    return (
        posthtml()
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
            // .then(()=>{

            // })
            .catch(e => {
                console.error(e)
            })
    )
}

module.exports = htmlTask
