# Sqitch Change Inventory

This is the initial decomposition plan for translating the current dump-based baseline into authored Sqitch changes.

The list is ordered by dependency, not by urgency.

## Foundation

1. `extensions`
2. `app-current-user-id-fn`
3. `app-is-service-role-fn`
4. `set-updated-at-fn`
5. `shared-trigger-helpers`

## Partitioning

6. `partition-bounds-fn`
7. `ensure-range-partition-fn`
8. `ensure-future-partitions-fn`
9. `drop-old-range-partitions-fn`
10. `partition-future-coverage-fn`
11. `default-partition-spill-rows-fn`
12. `run-partition-maintenance-fn`

## Identity And Auth

13. `users-table`
14. `user-accounts-table`
15. `user-sessions-table`
16. `auth-sessions-table`
17. `auth-refresh-tokens-table`
18. `auth-subjects-table`
19. `user-api-keys-table`
20. `user-person-relations-table`

## Core Collaboration And Content

21. `notes-table`
22. `note-tags-table`
23. `note-shares-table`
24. `tags-table`
25. `tagged-items-table`
26. `tag-shares-table`
27. `chat-table`
28. `chat-message-table`

## Task And Productivity Domains

29. `task-lists-table`
30. `tasks-table`
31. `task-list-collaborators-table`
32. `task-list-invites-table`
33. `goals-table`
34. `key-results-table`
35. `bookmarks-table`

## Personal Graph And Places

36. `persons-table`
37. `contacts-table`
38. `places-table`
39. `places-sync-location-fn`
40. `schools-table`
41. `possessions-table`
42. `possession-containers-table`
43. `possessions-usage-table`

## Finance

44. `financial-institutions-table`
45. `finance-accounts-table`
46. `finance-transactions-parent-table`
47. `finance-transactions-partitions`
48. `plaid-items-table`
49. `budget-goals-table`

## Health And Activity

50. `health-records-parent-table`
51. `health-records-partitions`
52. `logs-parent-table`
53. `logs-partitions`
54. `searches-parent-table`
55. `searches-partitions`

## Calendar, Career, Travel

56. `calendar-events-table`
57. `calendar-attendees-table`
58. `career-companies-table`
59. `career-jobs-table`
60. `career-applications-table`
61. `career-interviews-table`
62. `travel-trips-table`
63. `travel-flights-table`
64. `travel-hotels-table`

## Media Domains

65. `music-artists-table`
66. `music-albums-table`
67. `music-tracks-table`
68. `music-playlists-table`
69. `music-playlist-tracks-table`
70. `music-liked-table`
71. `music-listening-parent-table`
72. `music-listening-partitions`
73. `music-playlist-track-count-fn`
74. `video-channels-table`
75. `video-subscriptions-table`
76. `video-viewings-parent-table`
77. `video-viewings-partitions`

## Indexes And Search

78. `core-foreign-key-indexes`
79. `search-and-fts-indexes`
80. `domain-performance-indexes`

## RLS And Policies

81. `rls-enable-core`
82. `users-policies`
83. `notes-policies`
84. `tags-policies`
85. `tasks-policies`
86. `chat-policies`
87. `finance-policies`
88. `places-policies`
89. `health-policies`
90. `media-policies`
91. `travel-policies`
92. `calendar-policies`
93. `career-policies`

## Verification

Every change above should ship with:

- `deploy/<change>.sql`
- `verify/<change>.sql`
- `revert/<change>.sql` where we decide the revert is worth carrying

The initial cutover should prioritize:

1. foundation
2. auth and identity
3. notes, tags, tasks, chat
4. finance and places
5. partitions
6. policies
