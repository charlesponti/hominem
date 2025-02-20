/**
 * # Quick-Union With Path Compression
 * 
 * ## Data Structure
 * Same as Quick-union with extra array sz[i]
 * to count number of objects in the tree rooted at i
 * 
 * ## Union
 * * Link root of smaller tree to root of larger tree
 * * Update size[] array
 * 
 * ## Analysis
 * Find: takes time proportional to depth of p and q
 * Union: takes constant time, given root
 * Proposition: Depth of any node `x` is at most `lg N` (lg - base-2 logarithm)
 */
class QuickUnionWithPathCompression {
  constructor (N) {
    this.tree = new Array(N)
    this.sz = new Array(N)

    for (var i = 0; i < N; i++) {
      this.tree[i] = N
    }
  }

  /**
   * Make the q's root the root of p's root
   * @param {Number} p 
   * @param {Number} q 
   */
  union (p, q) {
    const pRoot = root(p)
    const qRoot = root(q)

    if (pRoot === qRoot) return

    if (this.sz[pRoot] < this.sz[qRoot]) {
      this.tree[pRoot] = qRoot
      this.sz[qRoot] += this.sz[pRoot]
    } else {
      this.tree[qRoot] = pRoot
      this.sz[pRoot] += this.sz[qRoot]
    }
  }

  /**
   * Determine if the root of each object is the same
   * @param {Number} p 
   * @param {Number} q 
   */
  connected (p, q) {
    return root(p) === root(q)
  }

  /**
   * Find root of object
   * @param {Number} i 
   */
  root (i) {
    let id

    while (i !== this.tree[i]) {
      // Make every other node in path point to its grandparent (thereby halving path length)
      id[i] = id[id[i]]

      // Set next index to the key set to the current index
      i = this.tree[i]
    }

    return i
  }
}

module.exports = QuickUnionWithPathCompression
