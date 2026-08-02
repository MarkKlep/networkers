// The problem bank. A problem is deliberately more than a title and a blurb:
// `functionName` + `starterCode` are the contract the test harness calls into
// (see runner.js), and `tests` is what decides pass/fail. Adding a problem
// should be data entry, never a code change - so everything the workspace
// needs to render and grade lives in this shape.
//
// `tests[].visible` splits the two run modes these sites all have: Run only
// executes the visible cases (the ones spelled out in the statement, safe to
// iterate against), Submit executes every case including the hidden ones.
//
// Kept as a module rather than fetched from a service: nothing here is
// per-user and nothing is secret, so a backend would buy nothing yet. The
// shape is a plain array of plain objects, so moving it behind an HTTP call
// later is a change to this file's exports and nothing else.

const PROBLEMS = [
  // --- Amateur -------------------------------------------------------------
  {
    id: 'two-sum',
    title: 'Two Sum',
    level: 'amateur',
    topics: ['Array', 'Hash map'],
    statement: [
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.',
      'Each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order — but return the lower index first so it matches the expected output.',
    ],
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'nums[0] + nums[1] === 9.',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'nums[1] + nums[2] === 6. Note that [0, 0] is not allowed.',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10⁴',
      'Exactly one valid answer exists',
      'Try to beat the obvious O(n²) double loop',
    ],
    functionName: 'twoSum',
    starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // your code here
}
`,
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1], visible: true },
      { args: [[3, 2, 4], 6], expected: [1, 2], visible: true },
      { args: [[3, 3], 6], expected: [0, 1], visible: false },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], visible: false },
      { args: [[0, 4, 3, 0], 0], expected: [0, 3], visible: false },
    ],
  },
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    level: 'amateur',
    topics: ['String', 'Two pointers'],
    statement: [
      'Given a string `s`, return `true` if it reads the same forwards and backwards once you ignore case and every character that is not a letter or a digit.',
      'An empty string counts as a palindrome.',
    ],
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: 'Reduced to letters and digits it is "amanaplanacanalpanama".',
      },
      {
        input: 's = "race a car"',
        output: 'false',
        explanation: '"raceacar" is not a palindrome.',
      },
    ],
    constraints: [
      '1 <= s.length <= 2 * 10⁵',
      's contains printable ASCII',
      'The two-pointer version needs no extra string',
    ],
    functionName: 'isPalindrome',
    starterCode: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // your code here
}
`,
    tests: [
      { args: ['A man, a plan, a canal: Panama'], expected: true, visible: true },
      { args: ['race a car'], expected: false, visible: true },
      { args: [' '], expected: true, visible: false },
      { args: ['0P'], expected: false, visible: false },
      { args: ['ab_a'], expected: true, visible: false },
    ],
  },
  {
    id: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    level: 'amateur',
    topics: ['Array', 'Greedy'],
    statement: [
      '`prices[i]` is the price of a stock on day `i`. Pick one day to buy and a later day to sell, and return the largest profit you can make.',
      'If no profitable trade exists, return `0`.',
    ],
    examples: [
      {
        input: 'prices = [7, 1, 5, 3, 6, 4]',
        output: '5',
        explanation: 'Buy on day 1 (price 1), sell on day 4 (price 6).',
      },
      {
        input: 'prices = [7, 6, 4, 3, 1]',
        output: '0',
        explanation: 'Prices only fall, so no trade beats not trading.',
      },
    ],
    constraints: [
      '1 <= prices.length <= 10⁵',
      'You must buy before you sell',
      'One pass is enough — track the cheapest price seen so far',
    ],
    functionName: 'maxProfit',
    starterCode: `/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  // your code here
}
`,
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5, visible: true },
      { args: [[7, 6, 4, 3, 1]], expected: 0, visible: true },
      { args: [[1]], expected: 0, visible: false },
      { args: [[2, 4, 1]], expected: 2, visible: false },
      { args: [[3, 2, 6, 5, 0, 3]], expected: 4, visible: false },
    ],
  },

  // --- Intermediate --------------------------------------------------------
  {
    id: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    level: 'intermediate',
    topics: ['String', 'Sliding window', 'Hash map'],
    statement: [
      'Given a string `s`, return the length of the longest substring that contains no repeated character.',
      'A substring is contiguous — "pwke" is a subsequence of "pwwkew", not a substring.',
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc".',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b".',
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke".',
      },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10⁴',
      's consists of letters, digits, symbols and spaces',
      'A sliding window gets this in O(n); resetting the window on every repeat does not',
    ],
    functionName: 'lengthOfLongestSubstring',
    starterCode: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // your code here
}
`,
    tests: [
      { args: ['abcabcbb'], expected: 3, visible: true },
      { args: ['bbbbb'], expected: 1, visible: true },
      { args: ['pwwkew'], expected: 3, visible: true },
      { args: [''], expected: 0, visible: false },
      { args: [' '], expected: 1, visible: false },
      { args: ['dvdf'], expected: 3, visible: false },
      { args: ['abba'], expected: 2, visible: false },
    ],
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    level: 'intermediate',
    topics: ['Array', 'Sorting'],
    statement: [
      'Given an array of intervals where `intervals[i] = [start, end]`, merge every pair that overlaps and return the resulting non-overlapping intervals, sorted by start.',
      'Intervals that only touch at an endpoint — `[1, 4]` and `[4, 5]` — count as overlapping.',
    ],
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        output: '[[1,6],[8,10],[15,18]]',
        explanation: '[1,3] and [2,6] overlap, so they merge into [1,6].',
      },
      {
        input: 'intervals = [[1,4],[4,5]]',
        output: '[[1,5]]',
        explanation: 'Touching at 4 is enough to merge.',
      },
    ],
    constraints: [
      '1 <= intervals.length <= 10⁴',
      'The input is not sorted',
      'Sorting by start first is what makes one pass possible',
    ],
    functionName: 'merge',
    starterCode: `/**
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
  // your code here
}
`,
    tests: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
        visible: true,
      },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]], visible: true },
      { args: [[[1, 4], [0, 4]]], expected: [[0, 4]], visible: false },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]], visible: false },
      { args: [[[5, 6]]], expected: [[5, 6]], visible: false },
      {
        args: [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]],
        expected: [[1, 10]],
        visible: false,
      },
    ],
  },
  {
    id: 'search-insert-position',
    title: 'Search Insert Position',
    level: 'intermediate',
    topics: ['Array', 'Binary search'],
    statement: [
      'Given a sorted array of distinct integers and a `target`, return the index of the target if it is present. If it is not, return the index where it would be inserted to keep the array sorted.',
      'You must write an algorithm with O(log n) runtime.',
    ],
    examples: [
      { input: 'nums = [1, 3, 5, 6], target = 5', output: '2', explanation: '5 is at index 2.' },
      {
        input: 'nums = [1, 3, 5, 6], target = 2',
        output: '1',
        explanation: '2 belongs between 1 and 3.',
      },
      {
        input: 'nums = [1, 3, 5, 6], target = 7',
        output: '4',
        explanation: 'Larger than everything, so it goes on the end.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10⁴',
      'nums is sorted ascending with no duplicates',
      'The off-by-one at the boundaries is the whole exercise',
    ],
    functionName: 'searchInsert',
    starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function searchInsert(nums, target) {
  // your code here
}
`,
    tests: [
      { args: [[1, 3, 5, 6], 5], expected: 2, visible: true },
      { args: [[1, 3, 5, 6], 2], expected: 1, visible: true },
      { args: [[1, 3, 5, 6], 7], expected: 4, visible: true },
      { args: [[1, 3, 5, 6], 0], expected: 0, visible: false },
      { args: [[1], 1], expected: 0, visible: false },
      { args: [[1, 3], 4], expected: 2, visible: false },
    ],
  },

  // --- Advanced ------------------------------------------------------------
  {
    id: 'coin-change',
    title: 'Coin Change',
    level: 'advanced',
    topics: ['Dynamic programming', 'Array'],
    statement: [
      'Given `coins` of different denominations and an `amount`, return the fewest coins needed to make up that amount. You have an unlimited number of each coin.',
      'If the amount cannot be made from the coins, return `-1`.',
    ],
    examples: [
      {
        input: 'coins = [1, 2, 5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1.',
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1',
        explanation: '3 cannot be made from 2s.',
      },
      { input: 'coins = [1], amount = 0', output: '0', explanation: 'Zero coins make zero.' },
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '0 <= amount <= 10⁴',
      'Greedy — always taking the largest coin — is wrong here; [1, 3, 4] with amount 6 shows why',
    ],
    functionName: 'coinChange',
    starterCode: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // your code here
}
`,
    tests: [
      { args: [[1, 2, 5], 11], expected: 3, visible: true },
      { args: [[2], 3], expected: -1, visible: true },
      { args: [[1], 0], expected: 0, visible: true },
      { args: [[1, 3, 4], 6], expected: 2, visible: false },
      { args: [[186, 419, 83, 408], 6249], expected: 20, visible: false },
      { args: [[2, 5, 10, 1], 27], expected: 4, visible: false },
    ],
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    level: 'advanced',
    topics: ['Graph', 'BFS/DFS', 'Matrix'],
    statement: [
      'Given a 2D grid of `"1"` (land) and `"0"` (water), return the number of islands. An island is land connected horizontally or vertically, and the grid is surrounded by water on all four edges.',
      'Diagonal neighbours do not connect.',
    ],
    examples: [
      {
        input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]',
        output: '2',
        explanation: 'The top-left blob is one island; the bottom-right cell is another.',
      },
    ],
    constraints: [
      '1 <= grid.length, grid[0].length <= 300',
      'Cells are the strings "0" and "1", not numbers',
      'Flooding each island as you find it is what stops you counting it twice',
    ],
    functionName: 'numIslands',
    starterCode: `/**
 * @param {string[][]} grid
 * @return {number}
 */
function numIslands(grid) {
  // your code here
}
`,
    tests: [
      {
        args: [[['1', '1', '0'], ['1', '0', '0'], ['0', '0', '1']]],
        expected: 2,
        visible: true,
      },
      {
        args: [
          [
            ['1', '1', '1', '1', '0'],
            ['1', '1', '0', '1', '0'],
            ['1', '1', '0', '0', '0'],
            ['0', '0', '0', '0', '0'],
          ],
        ],
        expected: 1,
        visible: false,
      },
      {
        args: [
          [
            ['1', '1', '0', '0', '0'],
            ['1', '1', '0', '0', '0'],
            ['0', '0', '1', '0', '0'],
            ['0', '0', '0', '1', '1'],
          ],
        ],
        expected: 3,
        visible: false,
      },
      { args: [[['0']]], expected: 0, visible: false },
      { args: [[['1']]], expected: 1, visible: false },
    ],
  },
  {
    id: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    level: 'advanced',
    topics: ['Dynamic programming', 'Binary search'],
    statement: [
      'Given an integer array `nums`, return the length of the longest strictly increasing subsequence.',
      'A subsequence keeps the original order but may skip elements — it does not have to be contiguous.',
    ],
    examples: [
      {
        input: 'nums = [10, 9, 2, 5, 3, 7, 101, 18]',
        output: '4',
        explanation: 'One answer is [2, 3, 7, 101].',
      },
      { input: 'nums = [7, 7, 7, 7]', output: '1', explanation: 'Strictly increasing, so equal values do not extend it.' },
    ],
    constraints: [
      '1 <= nums.length <= 2500',
      'The O(n²) DP passes here; the O(n log n) patience-sorting version is the real target',
    ],
    functionName: 'lengthOfLIS',
    starterCode: `/**
 * @param {number[]} nums
 * @return {number}
 */
function lengthOfLIS(nums) {
  // your code here
}
`,
    tests: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4, visible: true },
      { args: [[7, 7, 7, 7]], expected: 1, visible: true },
      { args: [[0, 1, 0, 3, 2, 3]], expected: 4, visible: false },
      { args: [[4, 10, 4, 3, 8, 9]], expected: 3, visible: false },
      { args: [[1]], expected: 1, visible: false },
    ],
  },
];

export const problemsForLevel = (level) =>
  PROBLEMS.filter((problem) => problem.level === level);

export const findProblem = (id) => PROBLEMS.find((problem) => problem.id === id);

export default PROBLEMS;
