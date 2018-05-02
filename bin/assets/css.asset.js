const Asset = require('./asset')
const { isRemote } = require('../utils')

const CSS_REQUIRE_REG = /url\(['"]?([^'"\(\)]+)['"]?\)/g
const REQUIRE_PACK = process.REQUIRE_PACK

class CssAsset extends Asset {
    constructor(options) {
        super(options)
        this.type = 'css'
        this.filename = REQUIRE_PACK.buildConfig.filename.css
    }
    async cssTransfrom(code, parserType) {
        const tasks = []
        const replaceMap = {}
        code.replace(CSS_REQUIRE_REG, (match, r) => {
            const name = r.trim()
            if (!isRemote(name)) {
                const depAsset = this.addDep({
                    name,
                    parserType,
                    autoWatch: false
                })
                tasks.push(
                    depAsset.process().then(() => {
                        replaceMap[r] = match.replace(r, depAsset.disturl)
                    })
                )
            }
        })
        await Promise.all(tasks)
        this.cssText = code.replace(CSS_REQUIRE_REG, (match, r) => {
            return r in replaceMap ? replaceMap[r] : match
        })
        return this.cssText
    }
    async transform(code) {
        const ret = await this.cssTransfrom(code, 'raw')
        return ret
    }
}

module.exports = CssAsset
