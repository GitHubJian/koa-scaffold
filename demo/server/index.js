const { path: pathConfig } = require('./config.js')

const App = require('./../../app.js')

const exceptionMiddleware = require('./../../middlewares/exceptionMiddleware.js')
const assetsMiddleware = require('./../../middlewares/assetsMiddleware.js')

App.use(exceptionMiddleware)
App.use(assetsMiddleware)

new App({
  ready: {
    host: 'localhost',
    port: 8418,
    favicon: pathConfig.favicon,
    onReady() {}
  },
  assets: {
    static: pathConfig.static,
    favicon: pathConfig.favicon
  }
})
