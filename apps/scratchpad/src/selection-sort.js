const chai = require('chai')
const equal = chai.assert.deepEqual

/**
 * Selection sort loops over positions in the array. 
 * 
 * For each position, it finds the index of the minimum value in the subarray 
 * starting at that position. 
 * 
 * Then it swaps the values at the position and at the minimum index. 
 * @param {*} array 
 * @param {*} firstIndex 
 * @param {*} secondIndex 
 */
var swap = function (array, firstIndex, secondIndex) {
  var temp = array[firstIndex]
  array[firstIndex] = array[secondIndex]
  array[secondIndex] = temp
}

/**
 * Find the index of the minimum elemnt in an array
 * @param {Array} array
 * @param {Number} startIndex
 */
var indexOfMinimum = function indexOfMinimum (array, startIndex) {
  var minValue = array[startIndex]
  var minIndex = startIndex

  // We are starting with minIndex + 1 because minValue is already set to array[0] ( o(n-1) )
  for (var i = minIndex + 1; i < array.length; i++) {
    if (array[i] < minValue) {
      minIndex = i
      minValue = array[i]
    }
  }

  return minIndex
}

/**
 * Sort an array
 * @param {Array} array
 */
var selectionSort = function (array) {
  var minimum

  // O(n)
  for (var i = 0; i < array.length; i++) {
    minimum = indexOfMinimum(array, i)
    swap(array, i, minimum)
  }

  return array
}

console.log(
  equal(
    selectionSort([22, 11, 99, 88, 9, 7, 42]),
    [7, 9, 11, 22, 42, 88, 99]
  ) === void 0
)

console.log(
  equal(
    selectionSort([22, 0, 99, 88, 9, 7, 42]),
    [0, 7, 9, 22, 42, 88, 99]
  ) === void 0
)

console.log(
  equal(
    selectionSort([-22, 0, 99, 88, 9, 7, 42]),
    [-22, 0, 7, 9, 42, 88, 99]
  ) === void 0
)
