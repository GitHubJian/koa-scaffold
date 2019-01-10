const root = process.cwd()
const path = require('path')

module.exports = {
  path: {
    static: path.resolve(root, './demo/static'),
    favicon: path.resolve(root, './demo/static/favicon.ico'),
    mock: path.resolve(root, './demo/mock')
  }
}
