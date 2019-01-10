'use strict'

let crypto = require('crypto')

module.exports = function createAuthHeaders(authInfo) {
  let dateStr =
    (authInfo.date && authInfo.date.toGMTString()) || new Date().toGMTString()
  let authorization = ''

  return {
    Date: dateStr,
    Authorization: authorization
  }
}
