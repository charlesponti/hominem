/**
 * QuickUnion implementation using a tree (forest) data structure.
 * - Each node points to its parent (id[i] is parent of i)
 * - Root node points to itself
 * - To find root: follow parent pointers until reaching root
 *
 * Performance:
 * - Union: O(N) - worst case
 * - Find: O(N) - could require up to N array accesses
 *
 * Limitations:
 * - Trees can become unbalanced and tall
 * - Find operations become expensive on tall trees
 *
 * Note: This is the basic implementation. For better performance,
 * consider weighted quick union with path compression.
 */
class QuickUnion {
  private tree: number[]

  constructor(N: number) {
    // Assign tree to an array of length equal to the provided value.
    this.tree = new Array(N)
    for (var i = 0; i < N; i++) {
      this.tree[i] = N
    }
  }

  /**
   * Make the q's root the root of p's root
   * @param {Number} p
   * @param {Number} q
   */
  union(p: number, q: number) {
    const pRoot = this.root(p)
    const qRoot = this.root(q)
    this.tree[pRoot] = this.tree[qRoot]
  }

  /**
   * Determine if the root of each object is the same
   * @param {Number} p
   * @param {Number} q
   */
  connected(p: number, q: number): boolean {
    return this.root(p) === this.root(q)
  }

  /**
   * Find root of object
   * @param {Number} i
   */
  root(i: number): number {
    while (i != this.tree[i]) i = this.tree[i]
    return i
  }
}

module.exports = QuickUnion
