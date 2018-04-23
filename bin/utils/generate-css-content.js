const Path = require('path')
const fse = require('fs-extra')

const getDistname = require('./get-distname')
const ensureOutputFile = require('./ensure-output-file')
const md5 = require('./md5')
const is = require('./is')
const getUrl = require('./get-url')

const CSS_REQUIRE_REG = /url\(['"]?([^'"\(\)]+)['"]?\)/g

const generateCssContent = (cssText, baseDir) => {
    const tasks = []
    const newCssText = cssText.replace(CSS_REQUIRE_REG, (match, r) => {
        r = r.trim()
        // 只替换非url的路径
        if (!is.url(r)) {
            // 不带入query参数值
            if (r.indexOf('?') > -1) {
                r = r.split('?')[0]
            }
            const path = Path.join(baseDir, r)
            // console.log(baseDir,'baseDIr','r--->',r,'path->',path)
            const content = fse.readFileSync(path)
            const hash = md5(content)
            const ext = Path.extname(path)
            const name = Path.parse(path).name
            const outputResTask = ensureOutputFile(
                getDistname({
                    name,
                    hash,
                    ext,
                    type: 'res',
                    tpl: '[name].[hash:8][ext]'
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
                    tpl: '[name].[hash:8][ext]',
                    type: 'res'
                })
            )
        }
        return match
    })
    return Promise.all(tasks).then(() => newCssText)
}

module.exports = generateCssContent
