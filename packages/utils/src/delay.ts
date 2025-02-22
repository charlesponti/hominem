/**
 * Function used to delay further actions in a async/await environment.
 *
 * **Usage:**
 * function doSomething() {
 *  return delay(1000).then(() => {
 *      console.log('Delayed!');
 *  });
 * }
 *
 * async function doSomething() {
 *  await delay(1000)
 *  console.log('Delayed!');
 * }
 *
 * @param ms The number of milliseconds to delay for.
 * @returns
 */
const delay = async (ms: number) => new Promise((res) => setTimeout(res, ms))

export default delay
