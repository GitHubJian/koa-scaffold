console.log('Hello, JavaScript!!!')

let submitBtn = document.getElementById('submit')
submitBtn.onclick = function(e) {
  let file = document.getElementById('file').files[0]

  let form = new FormData()
  form.append('file', file)
  form.append(
    'sheetNames',
    JSON.stringify({
      test: {
        startLine: 1,
        fieldsNameLine: 1
      }
    })
  )
  var xhr = new XMLHttpRequest()
  xhr.open(
    /* method */ 'POST',
    /* target url */ '/parse?fileName=' + file.name
    /*, async, default to true */
  )
  xhr.overrideMimeType('multipart/form-data')
  xhr.send(form)
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        console.log('upload complete')
        console.log('response: ' + xhr.responseText)
      }
    }
  }

  // let reader = new window.FileReader()
  // debugger

  // reader.onloadstart = function() {
  //   debugger
  //   console.log('onloadstart')
  // }

  // reader.onprogress = function(p) {
  //   // 这个事件在读取进行中定时触发
  //   console.log('onprogress')
  // }

  // reader.onload = function() {
  //   // 这个事件在读取成功结束后触发
  //   console.log('load complete')
  // }

  // reader.onloadend = function() {
  //   // 这个事件在读取结束后，无论成功或者失败都会触发
  //   if (reader.error) {
  //     console.log(reader.error)
  //   } else {
  //   }
  // }

  // reader.onerror = function(e) {
  //   console.log(e)
  // }

  // reader.readAsBinaryString(file)
}
