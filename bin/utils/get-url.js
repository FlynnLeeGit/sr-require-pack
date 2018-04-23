const {
    PUBLIC,
    STATIC_JS,
    STATIC_CSS,
    STATIC_RES,
    STATIC_CHUNK
} = require('../env')

const getFilename = require('./get-filename')

const getUrl = ({ name, hash, ext, tpl, type } = {}) => {
    if (!type) {
        console.error('should provide resource type but got ->', type)
        return
    }
    const publics = {
        js: PUBLIC + STATIC_JS,
        css: PUBLIC + STATIC_CSS,
        res: PUBLIC + STATIC_RES,
        chunk: PUBLIC + STATIC_CHUNK
    }
    const filename = getFilename({
        name,
        hash,
        ext,
        tpl
    })
    return `${publics[type]}/${filename}`
}

module.exports = getUrl
