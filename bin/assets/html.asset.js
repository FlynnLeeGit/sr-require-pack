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
        // this.ast.match = posthtmlApi.match

        this.transformTasks = []

        this.ast.walk(node => {
            if (node && node.attrs && 'require-pack' in node.attrs) {
                this.transformNodeTask(node)
            }
            return node
        })
        await Promise.all(this.transformTasks)
        return htmlRender(this.ast)
    }
    async transformNodeTask(node) {
        switch (node.tag) {
            case 'script':
                const name = node.attrs.src
                const jsAsset = this.addDep({ name, parserType: 'js' })
                this.transformTasks.push(
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
                            isOnload: node.attrs['require-pack'] === 'onload'
                        })
                        delete node.attrs.src
                        node.content = htmlRender(ret)
                    })
                )
                break

            case 'link':
                if (node.attrs.rel === 'stylesheet') {
                    const href = node.attrs.href
                    if (!isRemote(href)) {
                        let styleAsset
                        if (/\.css$/.test(href)) {
                            styleAsset = this.addDep({
                                name: href,
                                parserType: 'css'
                            })
                        }
                        if (/\.less$/.test(href)) {
                            styleAsset = this.addDep({
                                name: href,
                                parserType: 'less'
                            })
                        }
                        this.transformTasks.push(
                            styleAsset.process().then(() => {
                                node.attrs.href = styleAsset.disturl
                            })
                        )
                    }
                }
                break

            case 'a':
                const href = node.attrs.href
                if (!isRemote(href)) {
                    const rawAsset = this.addDep({
                        name: href,
                        parserType: 'raw'
                    })
                    this.transformTasks.push(
                        rawAsset.process().then(() => {
                            node.attrs.href = rawAsset.disturl
                        })
                    )
                }
                break

            case 'img':
                const src = node.attrs.src
                if (!isRemote(src)) {
                    const rawAsset = this.addDep({
                        name: src,
                        parserType: 'raw'
                    })
                    this.transformTasks.push(
                        rawAsset.process().then(() => {
                            node.attrs.src = rawAsset.disturl
                        })
                    )
                }
                break

            default:
                break
        }
    }
}
module.exports = HtmlAsset
