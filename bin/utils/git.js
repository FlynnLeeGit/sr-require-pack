const { execSync } = require('child_process')

const getBranch = () =>
    execSync('git symbolic-ref --short -q HEAD', {
        encoding: 'utf-8'
    }).trim()

const getCommit = () =>
    execSync('git log -1 --pretty=oneline', {
        encoding: 'utf-8'
    }).trim()

module.exports = {
    getBranch,
    getCommit
}
