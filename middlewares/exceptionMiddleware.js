'use strict'

function install() {
  let config = this.options.exception

  return async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      ctx.body = '404 | Not Found'
    }
  }
}

module.exports = {
  install
}
