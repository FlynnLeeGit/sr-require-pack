const fs = require('fs')
const path = require('path')
const util = require('util')
const parseToPostHtml = require('posthtml-parser')
const { match, walk } = require('posthtml/lib/api')

// modifed from
// https://github.com/posthtml/posthtml-extend

const errors = {
  EXTENDS_NO_SRC: '<extends> has no "src"',
  BLOCK_NO_NAME: '<block> has no "name"',
  UNEXPECTED_BLOCK: 'Unexpected block "%s"'
}

module.exports = (options = {}) => {
  return tree => {
    options.encoding = options.encoding || 'utf8'
    options.root = options.root || './'
    options.plugins = options.plugins || []

    // require-pack start
    options.imports = options.imports || {}
    // end

    tree = handleExtendsNodes(tree, options, tree.messages)

    const blockNodes = getBlockNodes(tree)
    for (let blockName of Object.keys(blockNodes)) {
      let blockNode = blockNodes[blockName]
      blockNode.tag = false
      blockNode.content = blockNode.content || []
      blockNodes[blockName] = blockNode
    }

    return tree
  }
}

function handleExtendsNodes(tree, options, messages) {
  match.call(
    applyPluginsToTree(tree, options.plugins),
    { tag: 'extends' },
    extendsNode => {
      if (!extendsNode.attrs || !extendsNode.attrs.src) {
        throw getError(errors.EXTENDS_NO_SRC)
      }

      const layoutPath = path.resolve(options.root, extendsNode.attrs.src)
      // require-pack
      options.imports[layoutPath] = true
      // end
      const layoutHtml = fs.readFileSync(layoutPath, options.encoding)
      let layoutTree = handleExtendsNodes(
        applyPluginsToTree(parseToPostHtml(layoutHtml), options.plugins),
        options,
        messages
      )

      /** require-pack extends start */
      const extendsNodeDir = path.dirname(extendsNode.attrs.src)
      walk.call(layoutTree, node => {
        if (node && node.attrs) {
          for (let k in node.attrs) {
            if (/(href|src)/.test(k) && 'require-pack' in node.attrs) {
              node.attrs[k] = path.join(extendsNodeDir, node.attrs[k])
            }
          }
        }
        return node
      })
      /** require-pack extends end */

      extendsNode.tag = false
      extendsNode.content = mergeExtendsAndLayout(layoutTree, extendsNode)

      messages.push({
        type: 'dependency',
        file: layoutPath,
        from: options.from
      })

      return extendsNode
    }
  )

  return tree
}

function applyPluginsToTree(tree, plugins) {
  return plugins.reduce((tree, plugin) => (tree = plugin(tree)), tree)
}

function mergeExtendsAndLayout(layoutTree, extendsNode) {
  const layoutBlockNodes = getBlockNodes(layoutTree)
  const extendsBlockNodes = getBlockNodes(extendsNode.content)

  for (let layoutBlockName of Object.keys(layoutBlockNodes)) {
    let extendsBlockNode = extendsBlockNodes[layoutBlockName]
    if (!extendsBlockNode) {
      continue
    }

    let layoutBlockNode = layoutBlockNodes[layoutBlockName]
    layoutBlockNode.content = mergeContent(
      extendsBlockNode.content,
      layoutBlockNode.content,
      getBlockType(extendsBlockNode)
    )

    delete extendsBlockNodes[layoutBlockName]
  }

  for (let extendsBlockName of Object.keys(extendsBlockNodes)) {
    throw getError(errors.UNEXPECTED_BLOCK, extendsBlockName)
  }

  return layoutTree
}

function mergeContent(extendBlockContent, layoutBlockContent, extendBlockType) {
  extendBlockContent = extendBlockContent || []
  layoutBlockContent = layoutBlockContent || []

  switch (extendBlockType) {
    case 'replace':
      layoutBlockContent = extendBlockContent
      break

    case 'prepend':
      layoutBlockContent = extendBlockContent.concat(layoutBlockContent)
      break

    case 'append':
      layoutBlockContent = layoutBlockContent.concat(extendBlockContent)
      break
  }

  return layoutBlockContent
}

function getBlockType(blockNode) {
  let blockType = (blockNode.attrs && blockNode.attrs.type) || ''
  blockType = blockType.toLowerCase()
  if (['replace', 'prepend', 'append'].indexOf(blockType) === -1) {
    blockType = 'replace'
  }

  return blockType
}

function getBlockNodes(content = []) {
  let blockNodes = {}

  match.call(content, { tag: 'block' }, node => {
    if (!node.attrs || !node.attrs.name) {
      throw getError(errors.BLOCK_NO_NAME)
    }

    blockNodes[node.attrs.name] = node
    return node
  })

  return blockNodes
}

function getError() {
  const message = util.format.apply(util, arguments)
  return new Error('[posthtml-extend] ' + message)
}
