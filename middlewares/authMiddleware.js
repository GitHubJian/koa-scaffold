'use strict'

const merge = require('deepmerge')
const rp = require('request-promise')

const defaultConfig = {
  skipSSO: false,
  AUTH_SERVER: 'https://qsso.corp.qunar.com/login.php?ret=',
  VERIFY_TOKEN: 'http://qsso.corp.qunar.com/api/verifytoken.php?token=',
  COOKIE_TOKEN_KEY: 'sogou_ssoid',
  COOKIE_USER_ID: 'userid',
  COOKIE_USER_INFO: 'userInfo',
  loginUrl: '/auth/login',
  callbackUrl: '/auth/callback',
  callbackUrlQuery: 'callback',
  aliveUrl: '/auth/alive'
}

const overwirteMerge = (a, b, c) => b

function install() {
  let config = merge.all([{}, defaultConfig, this.options.auth || {}], {
    arrayMerge: overwirteMerge
  })

  let { signature, skipSSO, loginUrl, callbackUrl } = config

  return async (ctx, next) => {
    let checkUrl = ctx.path

    if (skipSSO) {
      return await next()
    }
    // alive check
    if (checkUrl === aliveUrl) {
      return (ctx.body = {
        code: 0,
        msg: '',
        data: 'alive'
      })
    }
    // login
    if (checkUrl === loginUrl) {
      return await login.call(ctx)
    }
    // callback
    if (checkUrl === callbackUrl) {
      return await callback.call(ctx)
    }

    const token = getToken.call(ctx)
    let userData

    if (token) {
      userData = await getUserInfo.call(ctx, token)
    }
    // 如果没有token或者token验证不通过则重新登录
    if (!token) {
      return setLoginMessage.call(ctx, 'login', '已退出登录，请重新登录')
    }

    if (!userData) {
      setAuthInfo.call(ctx)

      return setLoginMessage.call(ctx, 'logout', '登录过期，请重新登录')
    }

    // cookie存的跟验证的不一致
    if (ctx.cookies.get(COOKIE_TOKEN_KEY) !== userData.login) {
      setUserInfo.call(ctx, userData)
      return setLoginMessage.call(ctx, 'login', '登录信息有误，请刷新页面')
    }

    ctx.aut = userData || {}

    const userId = ctx.auth.id

    // url鉴权
    if (enableAuth & 0b1) {
      let permission = checkPermission.call(ctx, userId, ctx.path)
      if (permission === false) {
        ctx.status = 403

        if (ctx.request.accepts('json')) {
          ctx.body = {
            code: 9,
            msg: '没有权限',
            data: null
          }
        } else {
          ctx.body = '没有权限'
        }

        return
      }
    }

    await next()
  }

  // 登录逻辑
  async function login() {
    let callbackUri = this.query.callback || encodeURIComponent('/') // 需要登陆后重定向的页面
    let redirect_uri = encodeURIComponent(
      `${this.origin}${callbackUrl}?${callbackUrlQuery}=${callbackUri}`
    )

    console.log('Login...')

    return this.redirect(`${AUTH_SERVER}${redirect_uri}`)
  }

  // SSO登录成功后的回调函数
  async function callback() {
    let { token } = this.request.body
    let callback_uri = this.query[callbackUrlQuery]

    try {
      let { userId, userInfo } = await getUserInfo.call(this, token)
    } catch (e) {
      this.status = 401
      this.body = `登录失败，请稍后重试(${e})`
    }
  }

  // 获取token
  function getToken() {
    return this.cookies.get(COOKIE_TOKEN_KEY) || ''
  }

  // 设置 token
  function setToken(token) {
    this.cookies.set(COOKIE_TOKEN_KEY, token)
  }

  // 设置登录信息
  function setLoginMessage(type, msg) {
    if (!this.accepts('html')) {
      this.status = 401

      return (this.body = {
        code: 5,
        data: null,
        msg
      })
    } else {
      const redirect_uri = `${this.origin}${
        type === 'login' ? loginUrl : logoutUrl
      }?${callbackUrlQuery}=${encodeURIComponent(this.url)}`

      return this.redirect(redirect_uri)
    }
  }

  // 根据token验证信息，获取用户信息
  async function getUserInfo(token) {
    try {
      let token_uri = `${VERIFY_TOKEN}${token}`
      let res = await rp({ url: token_uri })
    } catch (e) {}
  }
  // 对某一接口鉴权
  async function checkPermission(userId, url) {
    return {}
  }
}

module.exports = {
  install
}
