const { path: pathConfig } = require('./config.js')

const App = require('./../../index.js')

const exceptionMiddleware = require('./../../middlewares/exceptionMiddleware.js')
const assetsMiddleware = require('./../../middlewares/assetsMiddleware.js')
const mockMiddleware = require('./../../middlewares/mockMiddleware.js')

App.use(exceptionMiddleware)
App.use(mockMiddleware)
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
  },
  mock: {
    url: pathConfig.mock
  }
})
