const busboy = require('co-busboy')
const concat = require('concat-stream')
const extend = require('extend')
const XlsxParser = require('./../utils/xlsxParser.js')

const defaultConfig = {
  prefix: '/parse'
}

async function parseBody() {
  let fields = {},
    files = []

  if (this.request.is('multipart/*')) {
    let parts = busboy(this),
      part
    while ((part = await parts())) {
      if (part.length) {
        fields[part[0]] = part[1]
      } else {
        part.pipe(
          concat(function(buffer) {
            files.push(buffer)
          })
        )

        await new Promise((resolve, reject) => {
          part.on('end', resolve)
          part.on('error', reject)
        })
      }
    }

    return {
      fields: fields,
      files: files
    }
  } else {
    this.status = 400
    throw 'IllegalArgumentException, Expected: multipart/*'
  }
}

function parseExcel(fields, data) {
  let { sheetNames = '' } = fields

  sheetNames = JSON.parse(sheetNames)

  let wb = XlsxParser.read(data)
  let result = {}

  Object.keys(sheetNames).map(sheetName => {
    if (!isNaN(sheetName)) {
      result[sheetName] = XlsxParser.parseSheet(
        wb.sheets[wb.sheetNames[sheetName]],
        sheetNames[sheetName]
      )
    } else if (!wb.sheets[sheetName]) {
      this.status = 400
      throw `没有找到${sheetName}表格`
    } else {
      result[sheetName] = XlsxParser.parseSheet(
        wb.sheets[sheetName],
        sheetNames[sheetName]
      )
    }
  })

  return result
}

function install() {
  let config = this.options.parse
  let { prefix } = extend({}, defaultConfig, config)

  return async (ctx, next) => {
    let reqPath = ctx.path
    if (!reqPath.startsWith(prefix)) {
      return await next()
    }

    let { fields, files } = await parseBody.call(ctx)

    if (!files[0]) {
      return (ctx.body = {
        code: 2,
        msg: '请上传文件',
        data: null
      })
    }

    let data = parseExcel.call(ctx, fields, files[0])

    return (ctx.body = {
      code: 0,
      msg: '',
      data: data
    })
  }
}

module.exports = {
  install
}
