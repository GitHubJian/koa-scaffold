'use strict'

const send = require('koa-send')
const path = require('path')
const fse = require('fs-extra')
const root = process.cwd()
const extend = require('extend')

const defaultConfig = {
  static: path.resolve(root, './static')
}

const install = function() {
  let config = extend({}, defaultConfig, this.options.assets)

  return async (ctx, next) => {
    let maxage = 365 * 24 * 60 * 60 * 1000 // one year
    let reqPath = ctx.path

    let filePath = path.resolve(config.static, `.${reqPath}`)
    const exists = await fse.pathExists(filePath)

    let result
    if (exists) {
      result = await send(ctx, reqPath, {
        root: config.static,
        maxage,
        setHeaders: (res, path, stats) => {
          res.setHeader('Author', 'xiaows')
          if (path.endsWith('.json')) {
            res.setHeader('Access-Control-Allow-Origin', '*')
          }

          res.setHeader(
            'Cache-Control',
            `max-age=${
              path.endsWith('.html') ? 0 : 3.1536 * 1e10
            },must-revalidate`
          )

          res.setHeader('Cache-Control', `max-age=0,must-revalidate`)
        }
      })
    }

    if (!result) {
      ctx.status = 404
      ctx.body = `404 | Page Not Found | ${ctx.path}`
    }
  }
}

module.exports = {
  install
}
