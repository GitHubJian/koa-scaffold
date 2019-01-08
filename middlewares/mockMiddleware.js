'use strict'

const root = process.cwd()
const path = require('path')
const extend = require('extend')
const fs = require('fs')

let defaultConfig = {
  url: path.resolve(root, './mock'),
  prefix: '/mock'
}

const install = function() {
  let config = this.options.mock || {}
  let { url: mockFolderPath, prefix } = extend({}, defaultConfig, config)

  return async (ctx, next) => {
    let reqPath = ctx.path
    if (!reqPath.startsWith(prefix)) {
      return await next()
    }

    let reqPathArr = reqPath.split('/')
    let methodName = reqPathArr.pop()
    let fileName = reqPathArr.slice(2).join('/')

    fileName = camelCase(fileName)

    let filePath = path.join(mockFolderPath, `${fileName}.js`)
    let isExists = fs.existsSync(filePath)
    if (!isExists) {
      ctx.status = 404

      ctx.body = {
        code: -1,
        msg: `Mock File: ${fileName} Not Found`,
        data: null
      }
    }

    delete require.cache[filePath]
    let methods = require(filePath)
    let api

    if ((api = methods[methodName])) {
      let res = await api({ query: ctx.query, body: ctx.request.body })

      ctx.body = {
        code: 0,
        msg: '',
        data: res
      }
    } else {
      ctx.status = 404

      ctx.body = {
        code: -1,
        msg: `Mock Method: ${methodName} Not Found`,
        data: null
      }
    }
  }
}

function camelCase(str) {
  return str.replace(/\/([a-zA-Z])/g, w => {
    return w.substring(1, 2).toUpperCase() + w.substring(2)
  })
}

module.exports = {
  install
}
