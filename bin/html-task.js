const rollup = require('rollup')
const posthtml = require('posthtml')
// const CleanCss = require('clean-css')
const Path = require('path')
const fse = require('fs-extra')
const { execSync } = require('child_process')

const rollupLess = require('rollup-plugin-less')
const rollupVue = require('rollup-plugin-vue')
const rollupUglify = require('rollup-plugin-uglify')
const rollupBabel = require('rollup-plugin-babel')
const rollupResolve = require('rollup-plugin-node-resolve')
const rollupCjs = require('rollup-plugin-commonjs')

const md5 = require('./utils/md5')
const generateCssContent = require('./utils/generate-css-content')
const ensureOutputFile = require('./utils/ensure-output-file')
const getDistname = require('./utils/get-distname')
const getEntry = require('./utils/get-entry')
const getUrl = require('./utils/get-url')
const { getBranch, getCommit } = require('./utils/git')

const { SRC_DIR, isDev, isProd, requirejs } = require('./env')

const requireWrapper = content => {}

const htmlTask = (
    srcFile,
    {
        rollupExternal = [],
        rollupPaths = {},
        requireConfig = {},
        requireExternal = {}
    } = {}
) => {
    let rollupConfig = {
        inputOptions: {
            external: rollupExternal,
            plugins: [
                rollupLess({
                    insert: true,
                    output(css, file) {
                        return generateCssContent(css, Path.dirname(file))
                    }
                }),
                rollupVue({
                    css: true
                }),
                rollupBabel({
                    exclude: 'node_modules/**'
                })
            ]
        },
        outputOptions: {
            format: 'amd',
            paths: rollupPaths,
            sourceMap: true
        }
    }
    if (isProd) {
        rollupConfig.inputOptions.plugins.push(rollupUglify())
    }

    const myPlugin = options => {
        const rootDir = options.rootDir
        return function amdHtmlPlugin(tree, cb) {
            const tasks = []
            tree.walk(node => {
                node.attrs = node.attrs || {}
               

                // js compile
                if (node.tag === 'script' && 'require-pack' in node.attrs) {
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
                            const mainUrl = getUrl({
                                name: relativeEntry,
                                hash,
                                ext,
                                type: 'js'
                            })

                            let prependScriptContent = `
                            window.process = window.process || {};
                            window.process.env = window.process.env || {};
                            window.process.env.NODE_ENV = '${
                                process.env.NODE_ENV
                            }';
                            window.REQUIRE_CONFIG = ${JSON.stringify(
                                requireConfig
                            )};
                            `

                            // git version
                            const gitBranch = getBranch()
                            const gitCommit = getCommit()
                            // 在git分支时添加原始git信息
                            if (gitBranch) {
                                prependScriptContent += `window.GIT = {branch:"${gitBranch}",commit:"${gitCommit}"};`
                            }

                            prependScriptContent+=`
                                function $injectScript(src,attrs,cb){
                                    var s = document.createElement('script');
                                    s.src = src;
                                    for(let attr in attrs){
                                        s.setAttribute(attr,attrs[attr]);
                                    }
                                    document.head.appendChild(s);
                                    s.onload = function(){
                                        cb && cb();
                                    };
                                };
                            `

                            prependScriptContent += `
                                if(process.env.NODE_ENV==='development'){
                                    $injectScript('//localhost:35729/livereload.js',{},function(){
                                        console.log('[development mode] livereload is running...');
                                    });
                                };
                            `
                            node.attrs = { 'require-pack': '' }
                            if (node.attrs['require-pack'] === 'onload') {
                                node.content = `
                                ${prependScriptContent}
                                window.onload = function(){
                                    $injectScript('${requirejs}',{'data-main':'${mainUrl}'});
                                };
                            `
                            } else {
                                node.content = `
                                    ${prependScriptContent}
                                    $injectScript('${requirejs}',{'data-main':'${mainUrl}'});
                                `
                            }

                            const distJsContent = fse.readFileSync(file, {
                                encoding: 'utf-8'
                            })
                            let prependDistContent = ''

                            for (let externalName in requireExternal) {
                                prependDistContent += `define('${externalName}',function(){return ${
                                    requireExternal[externalName]
                                };});`
                            }
                            prependDistContent += `require.config(REQUIRE_CONFIG);\n`
                            return fse.outputFile(
                                file,
                                prependDistContent + distJsContent
                            )
                        })
                        .catch(e => {
                            console.error(e)
                        })
                    tasks.push(rollupTask)
                }

                return node
            })
            Promise.all(tasks).then(() => {
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
