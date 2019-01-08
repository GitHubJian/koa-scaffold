const { path: pathConfig } = require('./config.js')

const App = require('./app.js')

const exceptionMiddleware = require('./middlewares/exceptionMiddleware.js')
const assetsMiddleware = require('./middlewares/assetsMiddleware.js')

App.use()