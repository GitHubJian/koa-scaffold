'use strict'

function install() {
  let config = this.options.exception

  return async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      console.error(e)

      if (ctx.status === 404) {
        ctx.status === 500
      }

      let msg = (e && e.toString()) || 'Internal Server Error'

      if (
        ctx.accept.headers.accept &&
        ~ctx.accept.headers.accept.indexOf('json')
      ) {
        ctx.body = { code: -1, msg: msg, data: null }
      } else {
        ctx.body = msg
      }
    }
  }
}

module.exports = {
  install
}
