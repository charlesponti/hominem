/**
 * Swap items in array (broken)
 * 
 * @param {any[]} array 
 * @param {number} firstIndex 
 * @param {number} secondIndex 
 * @returns {any[]}
 */
function brokenSwap (array, firstIndex, secondIndex) {
  array[firstIndex] = array[secondIndex]
  array[secondIndex] = array[firstIndex]

  return array
}

/**
 * Swap items in an array
 * 
 * @param {array} array 
 * @param {number} firstIndex 
 * @param {number} secondIndex 
 * @returns {any[]}
 */
function swap (array, firstIndex, secondIndex) {
  const temp = array[firstIndex]
  array[firstIndex] = array[secondIndex]
  array[secondIndex] = temp
  return array
}

/**
 * Swap items in array (functional approach)
 * This approach has the benefit of not manipulating the original
 * array.
 * 
 * @param {any[]} array 
 * @param {number} firstIndex 
 * @param {number} secondIndex 
 * @returns {any[]}
 */
function functionalSwap (array, firstIndex, secondIndex) {
  return (
    array
      .reduce((a, b, i) => {
        if (i === firstIndex) a.push(array[secondIndex])
        else if (i === secondIndex) a.push(array[firstIndex])
        else a.push(b)
        return a
      }, [])
  )
}

module.exports = {
  swap,
  functionalSwap,
  brokenSwap
}
