let start = 0;
const end = 0;

/**
 * @complexity O(n)
 * The running-time is linear as the number of executions grows with the
 * length of the array.
 * @param {*} array
 */
function sumOfNumbers(numbers) {
  let result = 0;

  for (const number of numbers) {
    result += number;
  }

  return result;
}

console.log(sumOfNumbers([1, 2, 3, 4, 5]));

function sumUp(n) {
  let result = 0;

  for (let i = 1; i <= n; i++) {
    result += i;
  }

  return result;
}

function sumUpOne(n) {
  return (n / 2) * (1 + n);
}

start = performance.now();
console.log(sumUp(30000));
console.log(performance.now() - start);

start = performance.now();
console.log(sumUpOne(3000));
console.log(performance.now() - start);
