export function sumRange(n: number) {
	let total = 0;

	for (let i = n; i > 0; i--) {
		total += i;
	}

	return total;
}

export function sumRangeRecursive(n, total = 0) {
	if (n <= 0) {
		return total;
	}

	return sumRangeRecursive(n - 1, total + n);
}

type Child = {
	name: string;
	children: Child[];
};
export function printChildren(
	tree: {
		name: string;
		children: Child[];
	},
	children: string[] = [],
) {
	for (const child of tree.children) {
		children.push(child.name);
		printChildren(child, children);
	}

	return children;
}

// const tree = {
//   name: 'John',
//   children: [
//     {name: 'Jim', children: []},
//     {name: 'Zoe',
//       children: [
//         {name: 'Jane', children: []},
//         {name: 'Kyle', children: [
//           {name: 'Brad', children: []},
//           {name: 'Chad', children: []},
//         ]},
//       ],
//     },
//   ],
// };

export function searchTree(t, searchTerm) {
	if (t.name === searchTerm) return t;

	for (const child of t.children) {
		const value = searchTree(child, searchTerm);
		if (value) return value;
	}
}

export function getParent(t, searchTerm, parent) {
	if (t.name === searchTerm) {
		return parent;
	}

	for (const child of t.children) {
		const value = getParent(child, searchTerm, t);
		if (value) return value;
	}
}

/**
 * Flatten an array which contains arrays.
 * @param {T[]} arr - Array containing arrays
 * @param {T[]} result - Array to store non-array values
 * @return {T[]} Flattened array
 */
export function flattenArray<T>(arr: (T | T[])[], result: T[] = []): T[] {
	for (const item of arr) {
		if (Array.isArray(item)) flattenArray(item, result);
		else result.push(item);
	}

	return result;
}

/**
 * Determine if a number `a` is divisible by a number `b`
 *
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function isDivisible(a: number, b: number): boolean {
	return a % b === 0;
}

/**
 * Determine if a number `n` is even
 *
 * @param {number} n
 * @returns {boolean}
 */
export function isEven(n: number): boolean {
	return n % 2 === 0;
}

/**
 * Determine if a number `n` is odd
 *
 * @param {number} n
 * @returns {boolean}
 */
export function isOdd(n: number): boolean {
	return !isEven(n);
}

/**
 * Determine the value of a number `a` to the power of a number `b`.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} The value of a to the power of b
 */
export function power(a: number, b: number): number {
	/**
	 * base case: n is zero
	 * n = 0, x^0 = 1
	 */
	if (b === 0) return 1;

	/**
	 * recursive case: n is negative
	 * y = 1 / x^-n
	 */
	if (b < 0) return 1 / power(a, -b);

	/**
	 * recursive case: n is odd
	 * y = x * x^(n - 1 ... 1)
	 */
	if (isOdd(b)) return a * power(a, b - 1);

	/**
	 * recursive case: n is even
	 * y = x^n/2 ... x^n = y * y
	 */
	if (isEven(b)) {
		const y = power(a, b / 2);
		return y * y;
	}

	return 0;
}

/**
 * Calculates the factorial of a number using recursion
 * Factorial is the product of all positive integers less than or equal to n
 * Example: 5! = 5 * 4 * 3 * 2 * 1 = 120
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial of n
 */
export function factorial(n: number): number {
	// Base case: if n is 0 or 1, return 1
	// This is important to stop the recursion
	if (n <= 1) {
		return 1;
	}

	// Recursive case:
	// 1. Multiply n by factorial of (n-1)
	// 2. This will keep calling factorial with a smaller number
	// 3. Eventually hits base case when n <= 1
	// Example flow for factorial(4):
	// factorial(4) = 4 * factorial(3)
	// factorial(3) = 3 * factorial(2)
	// factorial(2) = 2 * factorial(1)
	// factorial(1) = 1
	// Then it resolves back up: 4 * 3 * 2 * 1 = 24
	return n * factorial(n - 1);
}
