const XLSX = require('xlsx')
const fs = require('fs')

class SheetParser {
  constructor(sheet) {
    this.sheet = sheet
    this.mergedMap = this.parseMergedMap()

    const [
      refText,
      startCol,
      startLine,
      endCol,
      endLine
    ] = /^([A-Za-z]+)([0-9]+):([A-Za-z]+)([0-9]+)/.exec(this.sheet['!ref']) || [
      0,
      0,
      0,
      0,
      0
    ]

    // if(String(startCol).length > 1 || String(endCol).length > 1){
    //     throw `excel列过多，只能解析A-Z列，已接受${startCol}:${endCol}`;
    // }

    this.startCol = startCol
    this.startLine = startLine
    this.endCol = endCol
    this.endLine = endLine
  }

  travel(pos, callback) {
    let { startCol, endCol, startLine, endLine } = Object.assign({}, this, pos)

    const startColCode = this.getNumberByName(startCol)
    const endColCode = this.getNumberByName(endCol)

    let curLine = +startLine
    while (curLine <= +endLine) {
      let col = startColCode

      while (col <= endColCode) {
        let colName = this.getNameByNumber(col)
        let cellName = colName + curLine
        let mergedCellName = this.findMergedCell(cellName, this.mergedMap)
        if (mergedCellName === cellName) {
          mergedCellName = undefined
        }

        let isMerged = !!mergedCellName

        callback.call(this, {
          parser: this,
          colName,
          curLine,
          cellName,
          isMerged,
          mergedCellName,
          cellValue: this.getCellValue(cellName),
          mergedCellValue: this.getCellValue(mergedCellName)
        })

        col++
      }

      curLine++
    }
  }

  // 获取单元格value
  getCellValue(cellName) {
    return cellName && this.sheet[cellName] ? this.sheet[cellName].v : undefined
  }

  // 解析单元格名字
  parseCellCL(cellName) {
    return /^([A-Za-z]+)([0-9]+)$/.exec(cellName)
  }

  // 获取merge的单元格的cellname
  findMergedCell(cellName) {
    const [cell, cellCol, cellLine] = this.parseCellCL(cellName)
    let result

    this.mergedMap.some(mergedInfo => {
      if (
        cellCol >= mergedInfo.startCol &&
        cellCol <= mergedInfo.endCol &&
        cellLine >= mergedInfo.startLine &&
        cellLine <= mergedInfo.endLine
      ) {
        result = mergedInfo.startCol + mergedInfo.startLine
        return true
      }
    })

    return result
  }

  // 获取单元格 A-Z 的 1到26的 map
  getCellMap() {
    let map = {}

    for (let index = 0; index < 26; index++) {
      map[String.fromCharCode(index + 65)] = index + 1
    }

    return map
  }

  // 根据数字获取单元格名称
  getNameByNumber(num) {
    let nameMap = this.getCellMap()

    let resultArr = []

    let getSum = pos => {
      let sum = 0
      for (let index = 0; index <= pos; index++) {
        sum += 26 * Math.pow(26, index)
      }

      return sum
    }

    // 计算最高是几位
    let highPos = 0
    while (num > getSum(highPos)) {
      highPos++
    }

    let remain = num

    for (; highPos >= 0; highPos--) {
      let cur = Math.floor(remain / Math.pow(26, highPos))

      if (highPos >= 1 && remain % Math.pow(26, highPos) === 0) {
        cur--
      }

      remain -= cur * Math.pow(26, highPos)

      let char = Object.keys(nameMap).find(item => nameMap[item] === cur)

      resultArr.push(char)
    }

    return resultArr.join('')
  }

  // 根据单元格名字获取数字
  getNumberByName(name) {
    let nameMap = this.getCellMap()

    let sum = 0

    let arr = name.split('').reverse()

    arr.forEach((item, index) => {
      sum += nameMap[item] * Math.pow(26, index)
    })

    return sum
  }

  parseMergedMap() {
    return (this.sheet['!merges'] || []).map(d => {
      return {
        startCol: String.fromCharCode(d.s.c + 'A'.charCodeAt()),
        endCol: String.fromCharCode(d.e.c + 'A'.charCodeAt()),
        startLine: d.s.r + 1,
        endLine: d.e.r + 1
      }
    })
  }
}

module.exports = {
  read: (data, config) => {
    let workbook = XLSX.read(data, config)
    let wb = {
      sheetNames: workbook.SheetNames,
      sheets: {}
    }

    wb.sheetNames.forEach(key => {
      wb.sheets[key] = new SheetParser(workbook.Sheets[key])
    })

    return wb
  },
  readFile: (filePath, config) => {
    if (!fs.existsSync(filePath)) {
      throw new Error('filePath:' + filePath + ' not found')
    }
    let workbook = XLSX.readFile(filePath, config)

    let wb = {
      sheetNames: workbook.SheetNames,
      sheets: {}
    }

    wb.sheetNames.forEach(key => {
      wb.sheets[key] = new SheetParser(workbook.Sheets[key])
    })

    return wb
  },
  parseSheet: (
    sheet,
    {
      startLine = 1, // 初始读取行数
      fieldsNameLine = 1, // 表头行，数据转换后的key，如果0则以列名为key
      fieldsMap = {} // key对应转换成的fieldName的map
    }
  ) => {
    let limit = { startLine }
    let lines = []

    sheet.travel(limit, function({
      colName,
      curLine,
      cellName,
      isMerged,
      mergedCellName,
      cellValue,
      mergedCellValue
    }) {
      if (!lines[+curLine]) {
        lines[+curLine] = {}
      }

      let line = lines[+curLine]

      let fieldName
      if (fieldsNameLine === 0) {
        fieldName = this.getCellValue(colName + '1')
      } else if (fieldsNameLine >= 1) {
        fieldName =
          fieldsMap[this.getCellValue(colName + fieldsNameLine)] || colName
      } else {
        fieldName = colName
      }

      let value = !isMerged ? cellValue : mergedCellValue
      value = value !== undefined ? String(value).trim() : value

      line[fieldName] = value
    })

    return lines.slice(startLine)
  }
}
