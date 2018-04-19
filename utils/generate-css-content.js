const Path = require('path')
const fse = require('fs-extra')

const getDistname = require('./get-distname')
const ensureOutputFile = require('./ensure-output-file')
const md5 = require('./md5')
const is = require('./is')
const getUrl = require('./get-url')

const CSS_REQUIRE_REG = /url\(['"]?([^'"]+)['"]?\)/g

const generateCssContent = (cssText, baseDir) => {
    const tasks = []
    const newCssText = cssText.replace(CSS_REQUIRE_REG, (match, r) => {
        if (!is.url(r)) {
            const path = Path.join(baseDir, r)
            const content = fse.readFileSync(path)
            const hash = md5(content)
            const ext = Path.extname(path)
            const name = Path.parse(path).name
            const outputResTask = ensureOutputFile(
                getDistname({
                    name,
                    hash,
                    ext,
                    type: 'res'
                }),
                content
            )
            tasks.push(outputResTask)
            return match.replace(
                r,
                getUrl({
                    name,
                    hash,
                    ext,
                    type: 'res'
                })
            )
        }
        return match
    })
    return Promise.all(tasks).then(() => newCssText)
}

module.exports = generateCssContent
