import type { ListProblem } from "../db.js";

/**
 * Small demo list so the bot is usable immediately after setup, before
 * anyone has imported a real curated list. Every entry's `slug` is the
 * exact path segment from the problem's LeetCode URL
 * (leetcode.com/problems/<slug>/), which is also what /solved and the
 * auto-checker match against.
 *
 * Replace or supplement this with /list import — see README for the CSV
 * format (title,slug,difficulty per line) to bring in NeetCode 150,
 * Blind 75, or your own hand-picked list.
 */
export const STARTER_LIST_NAME = "starter";

export const STARTER_LIST: ListProblem[] = [
  { title: "Two Sum", slug: "two-sum", difficulty: "Easy" },
  { title: "Valid Anagram", slug: "valid-anagram", difficulty: "Easy" },
  { title: "Contains Duplicate", slug: "contains-duplicate", difficulty: "Easy" },
  { title: "Valid Parentheses", slug: "valid-parentheses", difficulty: "Easy" },
  { title: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "Easy" },
  { title: "Valid Palindrome", slug: "valid-palindrome", difficulty: "Easy" },
  { title: "Maximum Subarray", slug: "maximum-subarray", difficulty: "Medium" },
  { title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy" },
  { title: "Single Number", slug: "single-number", difficulty: "Easy" },
  { title: "Reverse Linked List", slug: "reverse-linked-list", difficulty: "Easy" },
  { title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "Easy" },
  { title: "Invert Binary Tree", slug: "invert-binary-tree", difficulty: "Easy" },
];
