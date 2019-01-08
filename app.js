'use strict'

const Koa = require('koa')
const koaBody = require('koa-body')
const koaLogger = require('koa-logger')
const koaFavicon = require('koa-favicon')

class App {
  static use(plugin) {
    if (Array.isArray(plugin)) {
      plugin.map(item => App.use(item))
    } else {
      App.installedPlugins.indexOf(plugin) === -1 &&
        App.installedPlugins.push(plugin)
    }
  }

  constructor(options) {
    this.options = options
    this.installedPlugins = []
    this.init()
  }

  init() {
    this.initPlugins()
    this.ready(this)
  }

  initPlugins() {
    this.installedPlugins = []

    App.installedPlugins.reduce((prev, plugin) => {
      let res

      if (typeof plugin.install === 'function') {
        res = plugin.install.call(this)
      } else if (typeof plugin === 'function') {
        res = plugin.call(this)
      }

      let isAsync =
        Object.prototype.toString.call(res) === '[object AsyncFunction]'

      isAsync && prev.push(res)

      return prev
    }, this.installedPlugins)
  }

  ready() {
    let config = this.options.ready
    let { host, port, onReady } = config

    let app = new Koa()
    app.use(koaLogger())
    app.use(koaFavicon(config.favicon))
    app.use(koaBody({ patchKoa: true }))

    this.installedPlugins.map(plugin => {
      app.use(plugin)
    })

    onReady && typeof onReady === 'function' && onReady.call(app)

    app.listen(port, () => {
      console.log(`✨ 服务已启动 http://${host}:${port}\n`)
    })
  }
}

App.installedPlugins = []

module.exports = App
