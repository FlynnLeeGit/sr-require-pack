const process = val => {
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
  return {
    type,
    isRemote,
    path
  }
}