const pkg = require('./package.json')
const Path = require('path')
const { execSync } = require('child_process')
const bins = pkg.bin

for (let name in bins) {
    const binPath = Path.resolve(bins[name])
    try {
        execSync(`ln -s ${binPath} /usr/local/bin/${name}`, {
            stdio: 'inherit'
        })
        console.log('link done',`/usr/local/bin/${name} -> ${binPath}`)
    } catch (e) {
        console.error(e)
    }
}
