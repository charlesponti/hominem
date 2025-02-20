/**
 * 
 */
const arr = new Array(100)
for (var i = 0; i < 101; i++) {
  arr[i] = i
}

const correctAnswer = Math.floor(Math.random() * (100 - 1) + 1)

/**
 * This will be used to keep a count of how many times the 
 * function is executed in order to find the correct answer.
 */
let count = 0

/**
 * Find `n` in `list`
 * @param {Number} n
 * @param {Array} list
 */
function linearSearch (n, list) {
  for (var i = 0; i < list.length; i++) {
    count++
    if (list[i] === n) return
  }
}

// Perform search
linearSearch(correctAnswer, arr)

console.log('fn() executed ', count, ' times.')
