const Path = require('path')
const isRemote = s => /^https?:/.test(s) || /^\//.test(s) || /^data:/.test(s)
const isCss = s => /\.css$/.test(s)
const isJs = s => /\.js$/.test(s)
const isLess = s => /\.less$/.test(s)
const isBase64 = s => /^data:/.test(s)
const parseModulePath = id => {
  if (id[0] === '.') {
    return require.resolve(Path.resolve(id))
  } else {
    const pathsRange = [Path.resolve('node_modules')].concat(module.paths)
    return require.resolve(id, { paths: pathsRange })
  }
}

const parsePath = val => {
  let type = 'js'
  let path = val
  let isRemote = false
  if (/!/.test(val)) {
    path = val.split('!')[1]
    type = val.split('!')[0]
  } else {
    if (/\.css$/.test(val)) {
      type = 'css'
    }
    if (/\.js$/.test(val)) {
      type = 'js'
    }
  }
  isRemote = /^https?:/.test(path) || /^\//.test(path) || /^data:/.test(path)
  if (isRemote) {
    ;/\?/.test(path) ? (path += '&type=') : (path += '?type=')
  }
  return {
    type,
    isRemote,
    path
  }
}

const getGit = () => {
  const { execSync } = require('child_process')
  try {
    const branch = execSync('git symbolic-ref --short -q HEAD', {
      encoding: 'utf-8'
    }).trim()
    const commit = execSync('git log -1 --pretty=oneline', {
      encoding: 'utf-8'
    }).trim()
    return {
      branch,
      commit
    }
  } catch (e) {
    return null
  }
}

const radomPort = (userPort = 0) => {
  const net = require('net')
  if (userPort) {
    return Promise.resolve(userPort)
  }
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    let port
    server.on('listening', () => {
      port = server.address().port
      server.close(() => {
        resolve(port)
      })
    })
    server.on('error', reject)
    server.listen(0)
  })
}

const md5 = content => {
  const crypto = require('crypto')
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex')
}

module.exports = {
  isRemote,
  isCss,
  isJs,
  isLess,
  isBase64,
  parsePath,
  parseModulePath,
  getGit,
  radomPort,
  md5
}
