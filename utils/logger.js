const chalk = require('chalk')

const type2Color = {
  info: 'green',
  error: 'red',
  webpack: 'yellow',
  node: 'cyan',
  route: 'blue',
  proxy: 'gray'
}

const maxLen = Math.max(...Object.keys(type2Color).map(v => v.length))

const logger = Object.entries(type2Color).reduce((prev, [type, color]) => {
  prev[type] = str => {
    console.log(
      chalk[color](type),
      `${' '.repeat(maxLen - type.length)} ${str}`
    )
  }

  return prev
}, {})

module.exports = logger
