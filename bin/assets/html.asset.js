const htmlParser = require('posthtml-parser')
const htmlRender = require('posthtml-render')
const posthtmlApi = require('posthtml/lib/api')

const Asset = require('./asset')

const _ = require('lodash')
const Fse = require('fs-extra')
const debug = require('../debug')
const { isRemote } = require('../utils')

const injectTpl = Fse.readFileSync(__dirname + '/html/inject.ejs', {
    encoding: 'utf-8'
})

const REQUIRE_PACK = process.REQUIRE_PACK

class HtmlAsset extends Asset {
    constructor(options) {
        super(options)
        this.type = 'html'
        this.filename = REQUIRE_PACK.buildConfig.filename.html
    }

    async transform(code) {
        this.ast = htmlParser(code)
        this.ast.walk = posthtmlApi.walk
        this.ast.match = posthtmlApi.match

        const tasks = []
        let hasPackScript = false

        this.ast.walk(node => {
            // js
            if (
                node.tag === 'script' &&
                node.attrs &&
                'require-pack' in node.attrs
            ) {
                if (!hasPackScript) {
                    hasPackScript = true
                    const name = node.attrs.src
                    const jsAsset = this.addDep({ name, parserType: 'js' })

                    tasks.push(
                        jsAsset.process().then(() => {
                            const compiled = _.template(injectTpl)
                            const ret = compiled({
                                NODE_ENV: process.env.NODE_ENV,
                                GIT: JSON.stringify(REQUIRE_PACK.GIT),
                                requireConfig: JSON.stringify(
                                    REQUIRE_PACK.requireConfig
                                ),
                                livePort: REQUIRE_PACK.buildConfig.livePort,
                                externalDefine: REQUIRE_PACK.externalDefine,
                                mainUrl: jsAsset.disturl,
                                runtimeUrl: REQUIRE_PACK.runtimeUrl,
                                isOnload:
                                    node.attrs['require-pack'] === 'onload'
                            })
                            delete node.attrs.src
                            node.content = htmlRender(ret)
                        })
                    )
                } else {
                    debug.error(
                        'one page should only has one main entry js ->',
                        this.path
                    )
                }
            }

            // style
            if (
                node.tag === 'link' &&
                node.attrs.rel === 'stylesheet' &&
                'require-pack' in node.attrs
            ) {
                const name = node.attrs.href
                if (!isRemote(name)) {
                    if (/\.css$/.test(name)) {
                        const cssAsset = this.addDep({
                            name,
                            parserType: 'css'
                        })
                        tasks.push(
                            cssAsset.process().then(() => {
                                node.attrs.href = cssAsset.disturl
                            })
                        )
                    }
                    if (/\.less$/.test(name)) {
                        const lessAsset = this.addDep({
                            name,
                            parserType: 'less'
                        })
                        tasks.push(
                            lessAsset.process().then(() => {
                                node.attrs.href = lessAsset.disturl
                            })
                        )
                    }
                }
            }
            // a
            if (
                node.tag === 'a' &&
                node.attrs.href &&
                'require-pack' in node.attrs
            ) {
                const href = node.attrs.href
                if (!isRemote(href)) {
                    const rawAsset = this.addDep({
                        name: href,
                        parserType: 'raw'
                    })
                    tasks.push(
                        rawAsset.process().then(() => {
                            node.attrs.href = rawAsset.disturl
                        })
                    )
                }
            }
            //img
            if (
                node.tag === 'img' &&
                node.attrs.src &&
                'require-pack' in node.attrs
            ) {
                const src = node.attrs.src
                if (!isRemote(src)) {
                    const rawAsset = this.addDep({
                        name: src,
                        parserType: 'raw'
                    })
                    tasks.push(
                        rawAsset.process().then(() => {
                            node.attrs.src = rawAsset.disturl
                        })
                    )
                }
            }
            return node
        })
        await Promise.all(tasks)
        return htmlRender(this.ast)
    }
}
module.exports = HtmlAsset
