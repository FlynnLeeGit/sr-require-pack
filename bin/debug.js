const chalk = require('chalk')

const green = chalk.green
const Title = green('[require-pack]')

const debug = {
    log(...msgs) {
        console.log(Title, ...msgs)
    },
    warn(...msgs) {
        console.log(Title, chalk.yellow('warn'), ...msgs)
    },
    error(...msgs) {
        console.error(Title, chalk.red('error'), ...msgs)
    },
    end(name) {
        this.log(`${green('[')}${name}${green(']')} done!`)
    }
}

module.exports = debug
