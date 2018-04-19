const Path = require('path')
const {
    DIST_DIR,
    STATIC_JS,
    STATIC_CSS,
    STATIC_RES,
    STATIC_VIEW
} = require('../env')

const getFilename = require('./get-filename')

const getDistname = ({ name, hash, ext, tpl, type } = {}) => {
    if (!type) {
        console.error('should provide resource type but got ->', type)
        return
    }
    const statics = {
        js: Path.join(DIST_DIR, STATIC_JS),
        css: Path.join(DIST_DIR, STATIC_CSS),
        res: Path.join(DIST_DIR, STATIC_RES),
        // chunk: Path.join(DIST_DIR, STAIC_CHUNK),
        html: Path.join(DIST_DIR, STATIC_VIEW)
    }
    return Path.join(
        statics[type],
        getFilename({ name, hash, ext, tpl }).split('?')[0] // for queryString filename
    )
}

module.exports = getDistname
