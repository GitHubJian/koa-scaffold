###IoC Koa 脚手架

####使用
```
const App = require('koa-scaffold')
const middleware = require('./middleware.js')

App.use(middleware)

new App({})
```

####Middleware
```
const install = function(){
  let config = this.options.config

  return async(ctx, next)=>{

  }
}

module.exports = {
  install
}
```