/**
 * Calculate the summation of `n`. The summation is equal to the number
 * of potential pairs multiplied by amount each pair will add up to.
 *
 * This is also the number of times the indexOfMinimum function will run
 * inside of a SelectionSort
 * 
 * @param {Number} n
 */
function summation (n) {
  return (n / 2) * (n + 1)
}

console.log(summation(130))
