/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
exports.twoSum = function(nums, target) {
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];

    if (map.get(diff) !== undefined) return [map.get(diff), i];

    map.set(nums[i], i);
  }

  return 'No two sum solution';
};
