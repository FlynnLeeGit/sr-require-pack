const _ = require('lodash')
const Path = require('path')
const fse = require('fs-extra')

const md5 = require('./utils/md5')
const ensureOutputFile = require('./utils/ensure-output-file')
const generateCssContent = require('./utils/generate-css-content')
const getDistname = require('./utils/get-distname')
const getUrl = require('./utils/get-url')

const { TPL, isDev, isProd, require_web } = require('./env')
const is = require('./utils/is')

const requireTask = (distnameTpl = TPL) => {
    let requireConfig = {}
    let start = Date.now()
    delete require.cache[require_web]
    const _conf = require(require_web)
    const jsPaths = {}
    const cssPaths = {}

    const conf = _.merge(_conf, isProd ? _conf.production || {} : {})

    const alias = conf.paths
    const tasks = []

    _.forEach(alias, (v, k) => {
        if (is.url(v)) {
            if (is.js(v)) {
                jsPaths[k] = v.replace(/\.js$/, '')
                return
            }
            if (is.css(v)) {
                cssPaths[k] = 'css!' + v.replace(/\.css$/, '')
                return
            }
            jsPaths[k] = v
            return
        }
        if (!is.url(v)) {
            const modulePath = require.resolve(v)
            const moduleDir = Path.dirname(modulePath)
            const moduleContent = fse.readFileSync(modulePath, {
                encoding: 'utf-8'
            })

            const hash = md5(moduleContent)

            if (is.css(modulePath)) {
                cssPaths[k] =
                    'css!' + getUrl({ name: k, hash, ext: '.css', type: 'css' })
                const outputCssTask = generateCssContent(
                    moduleContent,
                    moduleDir
                ).then(cssContent => {
                    return ensureOutputFile(
                        getDistname({
                            name: k,
                            hash,
                            ext: '.css',
                            type: 'css'
                        }),
                        cssContent
                    )
                })
                tasks.push(outputCssTask)
            }
            if (is.js(modulePath)) {
                let jsUrl
                if (distnameTpl.indexOf('?') > -1) {
                    jsUrl = getUrl({
                        name: k,
                        hash: hash,
                        ext: '.js',
                        type: 'js'
                    })
                } else {
                    jsUrl = getUrl({ name: k, hash: hash, ext: '', type: 'js' })
                }
                jsPaths[k] = jsUrl

                tasks.push(
                    ensureOutputFile(
                        getDistname({ name: k, hash, ext: '.js', type: 'js' }),
                        moduleContent
                    )
                )
            }
            return
        }
    })
    _.forEach(conf.shim, (obj, name) => {
        if (_.isArray(obj)) {
            conf.shim[name] = obj.map(
                dep => (dep in cssPaths ? cssPaths[dep] : dep)
            )
        }
        if (_.isPlainObject(obj)) {
            obj.deps = obj.deps.map(
                dep => (dep in cssPaths ? cssPaths[dep] : dep)
            )
        }
    })

    requireConfig = _.cloneDeep(conf)
    delete requireConfig.production
    requireConfig.paths = jsPaths

    return Promise.all(tasks).then(() => {
        return {
            requireConfig,
            jsPaths,
            cssPaths,
            buildTime: Date.now() - start
        }
    })
}

module.exports = requireTask
