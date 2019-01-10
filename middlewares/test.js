var extend = require('extend-shallow')

let o1 = {
  a: {
    b: {
      c: 1
    }
  },
  b: [{ a: 1 }, { a: 2 }]
}

let o2 = {
  a: {
    b: {
      c: 4
    },
    b2: {
      c: 2
    }
  },
  b: [{ a: 1 }]
}

let a = extend(o1, o2)

console.log(a)
console.log(o1)
