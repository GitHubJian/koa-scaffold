'use strict'

const url = require('url')
const proxyKoa = require('koa-proxy')
const convert = require('koa-convert')
const pathToRegExp = require('path-to-regexp')
const extend = require('extend')
const logger = require('./../utils/logger.js')

let defaultConfig = {
  options: {},
  prefix: '/proxy'
}

const install = function() {
  let config = this.options.proxy || {}
  let { options, prefix } = extend({}, defaultConfig, config)
  let paths = Object.keys(options)
  let pathRegExp = paths.map(v => pathToRegExp(v))

  return async (ctx, next) => {
    let reqPath = ctx.path
    if (!reqPath.startsWith(prefix)) {
      return await next()
    }

    if (!paths || paths.length === 0) {
      return await next()
    }

    let index = pathRegExp.findIndex(re => {
      return re.exec(reqPath)
    })

    if (index < 0) {
      return await next()
    }

    let map = defaultMapFunc
    let c = paths[index]
    let host = options[c].url
    if (typeof options[c].map === 'function') {
      map = options[c].map
    }

    // 打印转发
    logProxyRule(host, reqPath, map)
    // 将 proxy 返回的 generator 转化为 async
    let fn = convert(
      proxyKoa({
        host,
        map
      })
    )

    return await fn(ctx, next)
  }
}

function defaultMapFunc(path) {
  return path
}

function logProxyRule(host, path, map) {
  let targetUrl = map(path)
  targetUrl = url.resolve(host, targetUrl)
  logger.proxy(`${path} => ${targetUrl}`)
}

module.exports = {
  install
}
