var databaseName = 'filesystem'
var version = 1
var db

class IndexedDB {
  constructor() {}

  initialize(callback) {
    setTimeout(() => {
      IndexedDB.initialized = true
      callback()
    }, 3000)
  }

  doSomething(callback) {
    setTimeout(() => {
      if (!IndexedDB.initialized) {
        return callback(new Error(`I don't do anything now`))
      }

      callback(null, `Current time is: ${Date.now()}`)
    })
  }
}

IndexedDB.initialized = false

// Command
class Command {
  constructor(command, args, callback) {
    this.command = command
    this.args = args
    this.callback = callback
  }
}

// wrapper
let indexedDB = new IndexedDB()
let activeState
let initializedState = indexedDB // 解耦

const IndexedDBWrapper = {}
let pending = []
let notInitializedState = {
  initialize: function(callback) {
    indexedDB.initialize(function() {
      IndexedDBWrapper.initialized = true
      activeState = initializedState

      pending.forEach(function({ command, args, callback }) {
        let params = [...args, callback]
        indexedDB[command].apply(null, params)
      })

      pending = []

      callback()
    })
  },
  doSomething: function(callback) {
    let args = Array.prototype.slice.call(arguments)
    return pending.push(new Command('doSomething', args))
  }
}

activeState = notInitializedState

IndexedDBWrapper.initialized = false
IndexedDBWrapper.initialize = function() {
  activeState.initialize.apply(activeState, arguments)
}

IndexedDBWrapper.doSomething = function() {
  activeState.doSomething.apply(activeState, arguments)
}

IndexedDBWrapper.doSomething(function(err, msg) {
  if (err) {
    console.log(err)
  } else {
    console.log(`1: ${msg}`)
  }
})

IndexedDBWrapper.doSomething(function(err, msg) {
  if (err) {
    console.log(err)
  } else {
    console.log(`2: ${msg}`)
  }
})

IndexedDBWrapper.doSomething(function(err, msg) {
  if (err) {
    console.log(err)
  } else {
    console.log(`3: ${msg}`)
  }
})

IndexedDBWrapper.initialize()
