const errorMap = {
  1: '未知错误', //  Unknown Error
  2: '无效参数', //   Bad Parameters
  3: '无此方法', //   Method Not Found
  4: '签名验证失败', //   Signature Verification Failed
  5: '未登录', //   Unauthorized
  6: '账号密码错误', //   Wrong Password
  7: '请求来源非法', //   Invalid Referer
  8: '无效时间', //   Invalid Time
  9: '非法访问', //   Access Denied
  10: '服务内部异常', //  Internal Error
  11: '请求超出接口限额' //  Too Many Requests
}

function ApiException(code, message) {
  if (code instanceof APIException || code instanceof Error) {
    return code
  }

  this.code = code = code || 1
  this.message = message || errorMap[code] || ''
}

APIException.prototype = Object.create(Error.prototype)
APIException.prototype.name = 'APIException'

module.exports = APIException
