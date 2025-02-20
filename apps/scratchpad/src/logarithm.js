const argv = require('minimist')(process.argv.slice(2))

/**
 * Calculate the logarithm of `n` (lg(n))
 * 
 * ## Definition
 * The `logarithm` of `n` number is the amount of times that
 * number can be halved before it reaches 1
 * @param {Number} n 
 */
function logarithm (n) {
  let count = 0
  let current = n

  while (true) {
    // Halve current value
    current = current / 2

    // Increase counter
    count++

    // Exit once current is equal to or below 1
    if (current < 2) {
      if (current > 1) return count + current - 1
      else if (current < 1) return count + current
      else if (current === 1) return count
      else return count
    }
  }
}

if (argv.n) {
  console.log(logarithm(argv.n))
}

// TODO Create test file (lg(1580000)) should give 21-22

module.exports = logarithm
