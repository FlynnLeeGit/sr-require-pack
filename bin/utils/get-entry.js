const Path = require('path')

const getEntry = (file, baseDir) => {
    const relativeName = Path.relative(
        Path.resolve(baseDir),
        Path.resolve(file)
    )
    return Path.join(Path.dirname(relativeName), Path.parse(relativeName).name)
}

module.exports = getEntry
