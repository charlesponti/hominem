import type { UserSelect } from '@hominem/data/schema';
import type { Hono } from 'hono';
import type { AppEnv } from '../src/server';
/**
 * Creates a tRPC test client that works with the existing test infrastructure
 * Uses x-user-id header for authentication in test mode
 */
export declare const createTRPCTestClient: (server: Hono<AppEnv>, userId: string) => import("@trpc/client").TRPCClient<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../src/trpc/procedures").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    user: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        updateProfile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name?: string | undefined;
                image?: string | undefined;
            };
            output: {
                id: string;
                name: string | null;
                image: string | null;
                email: string;
                supabaseId: string;
                photoUrl: string | null;
                isAdmin: boolean;
                createdAt: string;
                updatedAt: string;
                birthday: string | null;
                emailVerified: string | null;
            };
            meta: object;
        }>;
        findOrCreate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
                name?: string | undefined;
                image?: string | undefined;
            };
            output: {
                id: string;
                name: string | null;
                image: string | null;
                email: string;
                supabaseId: string;
                photoUrl: string | null;
                isAdmin: boolean;
                createdAt: string;
                updatedAt: string;
                birthday: string | null;
                emailVerified: string | null;
            } | null;
            meta: object;
        }>;
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        searchVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                source: string;
                limit?: number | undefined;
            };
            output: {
                results: {
                    id: string;
                    document: string;
                    metadata: unknown;
                    source: string | null;
                    sourceType: string | null;
                }[];
                count: number;
            };
            meta: object;
        }>;
        searchUserVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                limit?: number | undefined;
                threshold?: number | undefined;
            };
            output: {
                results: {
                    id: string;
                    document: string;
                    metadata: unknown;
                    source: string | null;
                    sourceType: string | null;
                }[];
                count: number;
            };
            meta: object;
        }>;
        getUserVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                vectors: {
                    id: string;
                    content: string;
                    metadata: string | null;
                    embedding: number[] | null;
                    userId: string | null;
                    source: string | null;
                    sourceType: string | null;
                    title: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserVectors: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source?: string | undefined;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        ingestText: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                text: string;
                metadata?: Record<string | number | symbol, unknown> | undefined;
            };
            output: {
                success: boolean;
                chunksProcessed: number;
                message: string;
            };
            meta: object;
        }>;
        uploadCsvToVectors: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source: string;
            };
            output: {
                success: boolean;
                recordsProcessed: number;
                fileId: string;
                fileUrl: string;
                message: string;
            };
            meta: object;
        }>;
        getUserFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                files: import("@supabase/storage-js").FileObject[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fileId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    twitter: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                provider: string;
                providerAccountId: string;
                expiresAt: Date | null;
            }[];
            meta: object;
        }>;
        authorize: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                authUrl: string;
            };
            meta: object;
        }>;
        disconnect: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                accountId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        post: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                text: string;
                contentId?: string | undefined;
                saveAsContent?: boolean | undefined;
            };
            output: {
                success: boolean;
                tweet: import("../src/lib/oauth.twitter.utils").TwitterTweetResponse;
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                } | null;
            };
            meta: object;
        }>;
        sync: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
                synced: number;
                total?: undefined;
            } | {
                success: boolean;
                message: string;
                synced: number;
                total: number;
            };
            meta: object;
        }>;
    }>>;
    tweet: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                strategyType?: "default" | "custom" | undefined;
                strategy?: string | undefined;
            };
            output: {
                text: string;
                hashtags: string[];
                characterCount: number;
                isOverLimit: boolean;
            };
            meta: object;
        }>;
    }>>;
    search: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        search: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                query: string;
                maxResults?: number | undefined;
            };
            output: import("../src/trpc/routers/search").SearchResponse;
            meta: object;
        }>;
    }>>;
    performance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getSummary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timeWindow?: number | undefined;
            };
            output: {
                averageResponseTime: number;
                totalRequests: number;
                errorRate: number;
                slowRequests: number;
                topEndpoints: Array<{
                    endpoint: string;
                    count: number;
                    avgDuration: number;
                }>;
            };
            meta: object;
        }>;
        getSystemHealth: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                memoryUsage: NodeJS.MemoryUsage;
                uptime: number;
                cacheStats: {
                    performance: {
                        size: number;
                        max: number;
                    };
                    apiMetrics: {
                        size: number;
                        max: number;
                    };
                    errors: {
                        size: number;
                        max: number;
                    };
                    system: {
                        size: number;
                        max: number;
                    };
                };
            };
            meta: object;
        }>;
        getRecentErrors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: import("../src/services/performance-monitor.service").ErrorMetric[];
            meta: object;
        }>;
        getTrends: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                hours?: number | undefined;
            };
            output: {
                hour: number;
                avgResponseTime: number;
                requestCount: number;
                errorCount: number;
            }[];
            meta: object;
        }>;
        recordMetric: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                duration: number;
                metadata?: Record<string | number | symbol, unknown> | undefined;
                tags?: string[] | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        recordSystemMetrics: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                activeConnections?: number | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        cleanup: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    notes: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: ("document" | "note" | "task" | "timer" | "journal")[] | undefined;
                query?: string | undefined;
                tags?: string[] | undefined;
                since?: string | undefined;
                sortBy?: "title" | "createdAt" | "updatedAt" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                notes: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                    analysis: unknown;
                    taskMetadata: {
                        status: "archived" | "todo" | "in-progress" | "done";
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null;
                    tweetMetadata: {
                        status: "draft" | "failed" | "posted";
                        tweetId?: string | undefined;
                        url?: string | undefined;
                        postedAt?: string | undefined;
                        importedAt?: string | undefined;
                        metrics?: {
                            retweets?: number | undefined;
                            likes?: number | undefined;
                            replies?: number | undefined;
                            views?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    synced: boolean | null;
                }[];
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                type?: "document" | "note" | "task" | "timer" | "journal" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                taskMetadata?: {
                    status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | undefined;
                analysis?: unknown;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                type?: "document" | "note" | "task" | "timer" | "journal" | undefined;
                title?: string | null | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | null | undefined;
                taskMetadata?: {
                    status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null | undefined;
                analysis?: unknown;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        sync: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                items: {
                    type: "document" | "note" | "task" | "timer" | "journal";
                    content: string;
                    id?: string | undefined;
                    title?: string | null | undefined;
                    tags?: {
                        value: string;
                    }[] | undefined;
                    mentions?: {
                        id: string;
                        name: string;
                    }[] | undefined;
                    taskMetadata?: {
                        status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null | undefined;
                    analysis?: unknown;
                    createdAt?: string | undefined;
                    updatedAt?: string | undefined;
                }[];
            };
            output: {
                created: number;
                updated: number;
                failed: number;
                items: {
                    id: string;
                    updatedAt: string;
                    type: import("@hominem/data/schema").Note["type"];
                }[];
            };
            meta: object;
        }>;
    }>>;
    messages: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getMessageById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                messageId: string;
            };
            output: {
                message: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                } | null;
            };
            meta: object;
        }>;
        updateMessage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
                content: string;
            };
            output: {
                message: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                } | null;
            };
            meta: object;
        }>;
        deleteMessage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        deleteMessagesAfter: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
                afterTimestamp: string;
            };
            output: {
                deletedCount: number;
            };
            meta: object;
        }>;
    }>>;
    location: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        geocode: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
            };
            output: import("@hominem/utils/location").GeocodeFeature[];
            meta: object;
        }>;
    }>>;
    goals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                showArchived?: boolean | undefined;
                sortBy?: string | undefined;
                category?: string | undefined;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                status: string;
                priority: number | null;
                startDate: string | null;
                dueDate: string | null;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        archive: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                status: string;
                priority: number | null;
                startDate: string | null;
                dueDate: string | null;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
            };
            meta: object;
        }>;
    }>>;
    events: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                tagNames?: string[] | undefined;
                companion?: string | undefined;
                sortBy?: "summary" | "date-asc" | "date-desc" | undefined;
            } | undefined;
            output: {
                tags: {};
                people: {};
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                description?: string | undefined;
                date?: string | Date | undefined;
                type?: string | undefined;
                tags?: string[] | undefined;
                people?: string[] | undefined;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                date: Date;
                description: string | null;
                title: string;
                source: "manual" | "google_calendar";
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                lastSyncedAt: Date | null;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                externalId: string | null;
                calendarId: string | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                deletedAt: Date | null;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            } | null;
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                date?: string | Date | undefined;
                dateStart?: string | Date | undefined;
                dateEnd?: string | Date | undefined;
                type?: string | undefined;
                tags?: string[] | undefined;
                people?: string[] | undefined;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            } | null;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: boolean;
            meta: object;
        }>;
        getGoogleCalendars: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                summary: string;
            }[];
            meta: object;
        }>;
        syncGoogleCalendar: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                calendarId?: string | undefined;
                timeMin?: string | undefined;
                timeMax?: string | undefined;
            };
            output: import("@hominem/data/services").SyncResult;
            meta: object;
        }>;
        getSyncStatus: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                connected: boolean;
                lastSyncedAt: Date | null;
                syncError: string | null;
                eventCount: number;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                }[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    id: string;
                };
                output: {
                    transactions: {
                        id: string;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        date: Date;
                        description: string | null;
                        tags: string | null;
                        status: string | null;
                        category: string | null;
                        source: string | null;
                        location: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        note: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                    institutionName: string | null;
                    institutionLogo: string | null;
                    isPlaidConnected: boolean;
                    plaidItemStatus: string | null;
                    plaidItemError: unknown;
                    plaidLastSyncedAt: Date | null;
                    plaidItemInternalId: string | null;
                    plaidInstitutionId: string | null;
                    plaidInstitutionName: string | null;
                } | null;
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings";
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    name?: string | undefined;
                    type?: "credit" | "investment" | "checking" | "savings" | undefined;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                };
                meta: object;
            }>;
            delete: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
            all: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    accounts: {
                        transactions: {
                            id: string;
                            type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            date: Date;
                            description: string | null;
                            tags: string | null;
                            status: string | null;
                            category: string | null;
                            source: string | null;
                            location: unknown;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            note: string | null;
                            recurring: boolean | null;
                            pending: boolean | null;
                            paymentChannel: string | null;
                        }[];
                        id: string;
                        userId: string;
                        name: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        institutionId: string | null;
                        plaidAccountId: string | null;
                        plaidItemId: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        meta: unknown;
                        lastUpdated: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        institutionName: string | null;
                        institutionLogo: string | null;
                        isPlaidConnected: boolean;
                        plaidItemStatus: "error" | "active" | "pending_expiration" | "revoked" | null;
                        plaidItemError: string | null;
                        plaidLastSyncedAt: Date | null;
                        plaidItemInternalId: string | null;
                        plaidInstitutionId: string | null;
                        plaidInstitutionName: string | null;
                    }[];
                    connections: {
                        id: string;
                        itemId: string;
                        institutionId: string;
                        institutionName: string;
                        status: "error" | "active" | "pending_expiration" | "revoked";
                        lastSyncedAt: Date | null;
                        error: string | null;
                        createdAt: Date;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        categories: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    category: string | null;
                }[];
                meta: object;
            }>;
        }>>;
        institutions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            connections: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/data/finance").InstitutionConnection[];
                meta: object;
            }>;
            accounts: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/data/finance").InstitutionAccount[];
                meta: object;
            }>;
            institutionAccounts: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: import("@hominem/data/finance").InstitutionAccount[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                } | undefined;
                meta: object;
            }>;
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                }[];
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    name: string;
                    url?: string | undefined;
                    logo?: string | undefined;
                    primaryColor?: string | undefined;
                    country?: string | undefined;
                };
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                };
                meta: object;
            }>;
            link: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    accountId: string;
                    institutionId: string;
                    plaidItemId?: string | undefined;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        id: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        name: string;
                        balance: string;
                        lastUpdated: Date | null;
                        meta: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        institutionId: string | null;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
            unlink: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    accountId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        id: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        name: string;
                        balance: string;
                        lastUpdated: Date | null;
                        meta: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        institutionId: string | null;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    category?: string | undefined;
                    min?: string | undefined;
                    max?: string | undefined;
                    account?: string | undefined;
                    limit?: number | undefined;
                    offset?: number | undefined;
                    description?: string | undefined;
                    search?: string | undefined;
                    sortBy?: string | string[] | undefined;
                    sortDirection?: "asc" | "desc" | ("asc" | "desc")[] | undefined;
                };
                output: {
                    data: {
                        id: string;
                        date: Date;
                        description: string | null;
                        amount: string;
                        status: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                            balance: string;
                            interestRate: string | null;
                            minimumPayment: string | null;
                            name: string;
                            mask: string | null;
                            isoCurrencyCode: string | null;
                            subtype: string | null;
                            officialName: string | null;
                            limit: string | null;
                            meta: unknown;
                            lastUpdated: Date | null;
                            createdAt: Date;
                            updatedAt: Date;
                            institutionId: string | null;
                            plaidItemId: string | null;
                            plaidAccountId: string | null;
                            userId: string;
                        } | null;
                    }[];
                    filteredCount: number;
                    totalUserCount: number;
                };
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type: "transfer" | 6 | "income" | "expense" | "credit" | "debit" | "investment" | {
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                    } | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | {
                        [x: number]: boolean | undefined;
                        length?: boolean | undefined;
                        toString?: boolean | undefined;
                        toLocaleString?: boolean | undefined;
                        pop?: boolean | undefined;
                        push?: boolean | undefined;
                        concat?: boolean | undefined;
                        join?: boolean | undefined;
                        reverse?: boolean | undefined;
                        shift?: boolean | undefined;
                        slice?: boolean | undefined;
                        sort?: boolean | undefined;
                        splice?: boolean | undefined;
                        unshift?: boolean | undefined;
                        indexOf?: boolean | undefined;
                        lastIndexOf?: boolean | undefined;
                        every?: boolean | undefined;
                        some?: boolean | undefined;
                        forEach?: boolean | undefined;
                        map?: boolean | undefined;
                        filter?: boolean | undefined;
                        reduce?: boolean | undefined;
                        reduceRight?: boolean | undefined;
                        find?: boolean | undefined;
                        findIndex?: boolean | undefined;
                        fill?: boolean | undefined;
                        copyWithin?: boolean | undefined;
                        entries?: boolean | undefined;
                        keys?: boolean | undefined;
                        values?: boolean | undefined;
                        includes?: boolean | undefined;
                        flatMap?: boolean | undefined;
                        flat?: boolean | undefined;
                        at?: boolean | undefined;
                        findLast?: boolean | undefined;
                        findLastIndex?: boolean | undefined;
                        toReversed?: boolean | undefined;
                        toSorted?: boolean | undefined;
                        toSpliced?: boolean | undefined;
                        with?: boolean | undefined;
                        [Symbol.iterator]?: boolean | undefined;
                        readonly [Symbol.unscopables]?: boolean | undefined;
                    } | {
                        (...items: ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment" | ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">)[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                        (searchElement: string, fromIndex?: number): number;
                    } | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                        (searchElement: string, fromIndex?: number): number;
                    } | ((start?: number, end?: number) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): boolean;
                        (searchElement: string, fromIndex?: number): boolean;
                    } | ((index: number) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | {
                        (): string;
                        (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                    } | (() => string) | (<U>(callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, thisArg?: any) => U[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                        (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): this is S[];
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): boolean;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => void, thisArg?: any) => void) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S[];
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: BooleanConstructor, thisArg?: any): TSReset.NonFalsy<S>[];
                    } | {
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                    } | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "transfer" | "income" | "expense" | "credit" | "debit" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                        (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | ((index: number, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]);
                    date: Date;
                    amount: string;
                    accountId: string;
                    id?: string | undefined;
                    description?: string | null | undefined;
                    tags?: string | null | undefined;
                    status?: string | null | undefined;
                    category?: string | null | undefined;
                    source?: string | null | undefined;
                    location?: unknown;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    note?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    pending?: boolean | null | undefined;
                    paymentChannel?: string | null | undefined;
                };
                output: {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                } & {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                }[];
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        id?: string | undefined;
                        type?: "transfer" | 6 | "income" | "expense" | "credit" | "debit" | "investment" | {
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                        } | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | {
                            [x: number]: boolean | undefined;
                            length?: boolean | undefined;
                            toString?: boolean | undefined;
                            toLocaleString?: boolean | undefined;
                            pop?: boolean | undefined;
                            push?: boolean | undefined;
                            concat?: boolean | undefined;
                            join?: boolean | undefined;
                            reverse?: boolean | undefined;
                            shift?: boolean | undefined;
                            slice?: boolean | undefined;
                            sort?: boolean | undefined;
                            splice?: boolean | undefined;
                            unshift?: boolean | undefined;
                            indexOf?: boolean | undefined;
                            lastIndexOf?: boolean | undefined;
                            every?: boolean | undefined;
                            some?: boolean | undefined;
                            forEach?: boolean | undefined;
                            map?: boolean | undefined;
                            filter?: boolean | undefined;
                            reduce?: boolean | undefined;
                            reduceRight?: boolean | undefined;
                            find?: boolean | undefined;
                            findIndex?: boolean | undefined;
                            fill?: boolean | undefined;
                            copyWithin?: boolean | undefined;
                            entries?: boolean | undefined;
                            keys?: boolean | undefined;
                            values?: boolean | undefined;
                            includes?: boolean | undefined;
                            flatMap?: boolean | undefined;
                            flat?: boolean | undefined;
                            at?: boolean | undefined;
                            findLast?: boolean | undefined;
                            findLastIndex?: boolean | undefined;
                            toReversed?: boolean | undefined;
                            toSorted?: boolean | undefined;
                            toSpliced?: boolean | undefined;
                            with?: boolean | undefined;
                            [Symbol.iterator]?: boolean | undefined;
                            readonly [Symbol.unscopables]?: boolean | undefined;
                        } | {
                            (...items: ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment" | ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">)[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                            (searchElement: string, fromIndex?: number): number;
                        } | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                            (searchElement: string, fromIndex?: number): number;
                        } | ((start?: number, end?: number) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): boolean;
                            (searchElement: string, fromIndex?: number): boolean;
                        } | ((index: number) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | {
                            (): string;
                            (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                        } | (() => string) | (<U>(callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, thisArg?: any) => U[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                            (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): this is S[];
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): boolean;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => void, thisArg?: any) => void) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S[];
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: BooleanConstructor, thisArg?: any): TSReset.NonFalsy<S>[];
                        } | {
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                        } | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "transfer" | "income" | "expense" | "credit" | "debit" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                            (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | ((index: number, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | undefined;
                        amount?: string | undefined;
                        date?: Date | undefined;
                        description?: string | null | undefined;
                        merchantName?: string | null | undefined;
                        accountId?: string | undefined;
                        fromAccountId?: string | null | undefined;
                        toAccountId?: string | null | undefined;
                        status?: string | null | undefined;
                        category?: string | null | undefined;
                        parentCategory?: string | null | undefined;
                        excluded?: boolean | null | undefined;
                        tags?: string | null | undefined;
                        accountMask?: string | null | undefined;
                        note?: string | null | undefined;
                        recurring?: boolean | null | undefined;
                        pending?: boolean | null | undefined;
                        paymentChannel?: string | null | undefined;
                        location?: unknown;
                        source?: string | null | undefined;
                        createdAt?: Date | undefined;
                        updatedAt?: Date | undefined;
                        userId?: string | undefined;
                    };
                };
                output: {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                };
                meta: object;
            }>;
            delete: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        budget: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            categories: {
                list: import("@trpc/server").TRPCQueryProcedure<{
                    input: void;
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    }[];
                    meta: object;
                }>;
                listWithSpending: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        monthYear: string;
                    };
                    output: import("@hominem/data/finance").BudgetCategoryWithSpending[];
                    meta: object;
                }>;
                get: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    };
                    meta: object;
                }>;
                create: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        name: string;
                        type: "income" | "expense";
                        averageMonthlyExpense?: string | undefined;
                        budgetId?: string | undefined;
                        color?: string | undefined;
                    };
                    output: {
                        id: string;
                        type: "income" | "expense";
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                    };
                    meta: object;
                }>;
                update: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                        name?: string | undefined;
                        type?: "income" | "expense" | undefined;
                        averageMonthlyExpense?: string | undefined;
                        budgetId?: string | undefined;
                        color?: string | undefined;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    };
                    meta: object;
                }>;
                delete: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        success: boolean;
                        message: string;
                    };
                    meta: object;
                }>;
            };
            tracking: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    monthYear: string;
                };
                output: import("@hominem/data/finance").BudgetTrackingData;
                meta: object;
            }>;
            history: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    months?: number | undefined;
                };
                output: {
                    date: string;
                    budgeted: number;
                    actual: number;
                }[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    income: number;
                    expenses: {
                        category: string;
                        amount: number;
                    }[];
                } | undefined;
                output: {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        category: string;
                        amount: number;
                    }[];
                    projections: {
                        month: number;
                        savings: number;
                        totalSaved: number;
                    }[];
                    calculatedAt: string;
                    source: "manual";
                } | {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        category: string;
                        amount: number;
                    }[];
                    projections: {
                        month: number;
                        savings: number;
                        totalSaved: number;
                    }[];
                    calculatedAt: string;
                    source: "categories";
                };
                meta: object;
            }>;
            transactionCategories: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    name: string;
                    transactionCount: number;
                    totalAmount: number;
                    averageAmount: number;
                    suggestedBudget: number;
                    monthsWithTransactions: number;
                }[];
                meta: object;
            }>;
            bulkCreateFromTransactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    categories: {
                        name: string;
                        type: "income" | "expense";
                        averageMonthlyExpense?: string | undefined;
                        color?: string | undefined;
                    }[];
                };
                output: {
                    success: boolean;
                    message: string;
                    categories: never[];
                    skipped: number;
                    created?: undefined;
                } | {
                    success: boolean;
                    message: string;
                    categories: {
                        id: string;
                        type: "income" | "expense";
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                    }[];
                    created: number;
                    skipped: number;
                };
                meta: object;
            }>;
        }>>;
        analyze: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            spendingTimeSeries: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    category?: string | undefined;
                    limit?: number | undefined;
                    groupBy?: "day" | "month" | "week" | undefined;
                    includeStats?: boolean | undefined;
                    compareToPrevious?: boolean | undefined;
                };
                output: import("@hominem/data/finance").TimeSeriesResponse;
                meta: object;
            }>;
            topMerchants: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    category?: string | undefined;
                    limit?: number | undefined;
                };
                output: import("@hominem/data/finance").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    limit?: string | undefined;
                };
                output: import("@hominem/data/finance").CategorySummary[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    category?: string | undefined;
                    accounts?: string[] | undefined;
                    type?: "income" | "expense" | undefined;
                };
                output: {
                    value: number;
                    calculationType: "sum" | "average" | "count";
                } | {
                    count: number;
                    total: string;
                    average: string;
                    minimum: string;
                    maximum: string;
                };
                meta: object;
            }>;
            monthlyStats: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    month: string;
                };
                output: {
                    month: string;
                    startDate: string;
                    endDate: string;
                    totalIncome: number;
                    totalExpenses: number;
                    netIncome: number;
                    transactionCount: number;
                    categorySpending: {
                        name: string | null;
                        amount: number;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        export: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            transactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        id: string;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        date: Date;
                        description: string | null;
                        tags: string | null;
                        status: string | null;
                        category: string | null;
                        source: string | null;
                        location: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        note: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    filename: string;
                };
                meta: object;
            }>;
            summary: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        totalIncome: number;
                        totalExpenses: number;
                        netCashflow: number;
                        categorySummary: never[];
                    };
                    filename: string;
                };
                meta: object;
            }>;
        }>>;
        data: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            deleteAll: import("@trpc/server").TRPCMutationProcedure<{
                input: void;
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        plaid: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            createLinkToken: import("@trpc/server").TRPCMutationProcedure<{
                input: void;
                output: {
                    success: boolean;
                    linkToken: string;
                    expiration: string;
                };
                meta: object;
            }>;
            exchangeToken: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    publicToken: string;
                    institutionId: string;
                    institutionName: string;
                };
                output: {
                    success: boolean;
                    message: string;
                    institutionName: string;
                };
                meta: object;
            }>;
            syncItem: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    itemId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
            removeConnection: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    itemId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        runway: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                balance: number;
                monthlyExpenses: number;
                plannedPurchases?: {
                    description: string;
                    amount: number;
                    date: string;
                }[] | undefined;
            };
            output: {
                success: boolean;
                data: {
                    projectionData: {
                        month: string;
                        balance: number;
                    }[];
                    runwayMonths: number;
                    burnRate: number;
                    initialBalance: number;
                    currentBalance: number;
                    runwayEndDate: string;
                    monthlyBreakdown: Array<{
                        month: string;
                        expenses: number;
                        purchases: number;
                        endingBalance: number;
                    }>;
                    isRunwayDangerous: boolean;
                    minimumBalance: number;
                    totalPlannedExpenses: number;
                };
                error?: undefined;
            } | {
                success: boolean;
                error: string;
                data?: undefined;
            };
            meta: object;
        }>;
    }>>;
    files: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        fetch: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                data: ArrayBuffer;
                contentType: string;
                message: string;
            };
            meta: object;
        }>;
        getUrl: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                url: string;
                expiresAt: string;
                message: string;
            };
            meta: object;
        }>;
        remove: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fileId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                files: import("@supabase/storage-js").FileObject[];
                count: number;
            };
            meta: object;
        }>;
    }>>;
    content: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: string | undefined;
                query?: string | undefined;
                tags?: string | undefined;
                since?: string | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                }[];
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                type?: "tweet" | "essay" | "blog_post" | "social_post" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                tweetMetadata?: {
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    status?: "draft" | "failed" | "posted" | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                };
            };
            meta: object;
        }>;
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                };
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                type?: "tweet" | "essay" | "blog_post" | "social_post" | undefined;
                title?: string | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                tweetMetadata?: {
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    status?: "draft" | "failed" | "posted" | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    content: string;
                    excerpt: string | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    tags: {
                        value: string;
                    }[] | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    userId: string;
                    contentStrategyId: string | null;
                    createdAt: string;
                    updatedAt: string;
                    publishedAt: string | null;
                    scheduledFor: string | null;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    contentStrategies: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
                description?: string | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            }[];
            meta: object;
        }>;
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                strategy?: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                } | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                topic: string;
                audience: string;
                platforms: string[];
            };
            output: {};
            meta: object;
        }>;
    }>>;
    chats: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getUserChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: {
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
            }[];
            meta: object;
        }>;
        getChatById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
            };
            output: {
                messages: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                }[];
                id: string;
                title: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        createChat: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
            };
            output: {
                chat: {
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                };
            };
            meta: object;
        }>;
        deleteChat: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        updateChatTitle: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
                title: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        searchChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                userId?: string | undefined;
                limit?: number | undefined;
            };
            output: {
                chats: {
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                }[];
            };
            meta: object;
        }>;
        send: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                message: string;
                chatId?: string | undefined;
            };
            output: {
                streamId: string;
                chatId: string;
                chatTitle: string;
                messages: {
                    user: {
                        id: string;
                        reasoning: string | null;
                        role: import("@hominem/data/schema").ChatMessageRole;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        userId: string;
                        chatId: string;
                        toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                        files: import("@hominem/data/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    } | null;
                    assistant: {
                        id: string;
                        reasoning: string | null;
                        role: import("@hominem/data/schema").ChatMessageRole;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        userId: string;
                        chatId: string;
                        toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                        files: import("@hominem/data/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    };
                };
                metadata: {
                    startTime: number;
                    timestamp: string;
                };
            };
            meta: object;
        }>;
        getMessages: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                id: string;
                reasoning: string | null;
                role: import("@hominem/data/schema").ChatMessageRole;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                chatId: string;
                toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                files: import("@hominem/data/schema").ChatMessageFile[] | null;
                parentMessageId: string | null;
                messageIndex: string | null;
            }[];
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                image: string | null;
                title: string;
                description: string | null;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
                url: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                url: string;
            };
            output: {
                id: string;
                url: string;
                description: string | null;
                title: string;
                image: string | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                url: string;
            };
            output: {
                id: string;
                image: string | null;
                title: string;
                description: string | null;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
                url: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
    }>>;
    people: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                firstName: string;
                lastName?: string | undefined;
                email?: string | undefined;
                phone?: string | undefined;
            };
            output: {
                id: string;
                firstName: string;
                lastName: string | null;
                title: string | null;
                email: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                phone: string | null;
                linkedinUrl: string | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                firstName?: string | undefined;
                lastName?: string | undefined;
                email?: string | undefined;
                phone?: string | undefined;
            };
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: boolean;
            meta: object;
        }>;
    }>>;
}>>>;
/**
 * Creates a tRPC test client with custom context
 */
export declare const createTRPCTestClientWithContext: (server: Hono<AppEnv>, context: {
    userId: string;
    user?: UserSelect;
}) => import("@trpc/client").TRPCClient<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../src/trpc/procedures").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    user: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        updateProfile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name?: string | undefined;
                image?: string | undefined;
            };
            output: {
                id: string;
                name: string | null;
                image: string | null;
                email: string;
                supabaseId: string;
                photoUrl: string | null;
                isAdmin: boolean;
                createdAt: string;
                updatedAt: string;
                birthday: string | null;
                emailVerified: string | null;
            };
            meta: object;
        }>;
        findOrCreate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
                name?: string | undefined;
                image?: string | undefined;
            };
            output: {
                id: string;
                name: string | null;
                image: string | null;
                email: string;
                supabaseId: string;
                photoUrl: string | null;
                isAdmin: boolean;
                createdAt: string;
                updatedAt: string;
                birthday: string | null;
                emailVerified: string | null;
            } | null;
            meta: object;
        }>;
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        searchVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                source: string;
                limit?: number | undefined;
            };
            output: {
                results: {
                    id: string;
                    document: string;
                    metadata: unknown;
                    source: string | null;
                    sourceType: string | null;
                }[];
                count: number;
            };
            meta: object;
        }>;
        searchUserVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                limit?: number | undefined;
                threshold?: number | undefined;
            };
            output: {
                results: {
                    id: string;
                    document: string;
                    metadata: unknown;
                    source: string | null;
                    sourceType: string | null;
                }[];
                count: number;
            };
            meta: object;
        }>;
        getUserVectors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                vectors: {
                    id: string;
                    content: string;
                    metadata: string | null;
                    embedding: number[] | null;
                    userId: string | null;
                    source: string | null;
                    sourceType: string | null;
                    title: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserVectors: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source?: string | undefined;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        ingestText: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                text: string;
                metadata?: Record<string | number | symbol, unknown> | undefined;
            };
            output: {
                success: boolean;
                chunksProcessed: number;
                message: string;
            };
            meta: object;
        }>;
        uploadCsvToVectors: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source: string;
            };
            output: {
                success: boolean;
                recordsProcessed: number;
                fileId: string;
                fileUrl: string;
                message: string;
            };
            meta: object;
        }>;
        getUserFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                files: import("@supabase/storage-js").FileObject[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fileId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    twitter: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                provider: string;
                providerAccountId: string;
                expiresAt: Date | null;
            }[];
            meta: object;
        }>;
        authorize: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                authUrl: string;
            };
            meta: object;
        }>;
        disconnect: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                accountId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        post: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                text: string;
                contentId?: string | undefined;
                saveAsContent?: boolean | undefined;
            };
            output: {
                success: boolean;
                tweet: import("../src/lib/oauth.twitter.utils").TwitterTweetResponse;
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                } | null;
            };
            meta: object;
        }>;
        sync: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
                synced: number;
                total?: undefined;
            } | {
                success: boolean;
                message: string;
                synced: number;
                total: number;
            };
            meta: object;
        }>;
    }>>;
    tweet: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                strategyType?: "default" | "custom" | undefined;
                strategy?: string | undefined;
            };
            output: {
                text: string;
                hashtags: string[];
                characterCount: number;
                isOverLimit: boolean;
            };
            meta: object;
        }>;
    }>>;
    search: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        search: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                query: string;
                maxResults?: number | undefined;
            };
            output: import("../src/trpc/routers/search").SearchResponse;
            meta: object;
        }>;
    }>>;
    performance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getSummary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timeWindow?: number | undefined;
            };
            output: {
                averageResponseTime: number;
                totalRequests: number;
                errorRate: number;
                slowRequests: number;
                topEndpoints: Array<{
                    endpoint: string;
                    count: number;
                    avgDuration: number;
                }>;
            };
            meta: object;
        }>;
        getSystemHealth: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                memoryUsage: NodeJS.MemoryUsage;
                uptime: number;
                cacheStats: {
                    performance: {
                        size: number;
                        max: number;
                    };
                    apiMetrics: {
                        size: number;
                        max: number;
                    };
                    errors: {
                        size: number;
                        max: number;
                    };
                    system: {
                        size: number;
                        max: number;
                    };
                };
            };
            meta: object;
        }>;
        getRecentErrors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: import("../src/services/performance-monitor.service").ErrorMetric[];
            meta: object;
        }>;
        getTrends: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                hours?: number | undefined;
            };
            output: {
                hour: number;
                avgResponseTime: number;
                requestCount: number;
                errorCount: number;
            }[];
            meta: object;
        }>;
        recordMetric: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                duration: number;
                metadata?: Record<string | number | symbol, unknown> | undefined;
                tags?: string[] | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        recordSystemMetrics: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                activeConnections?: number | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        cleanup: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    notes: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: ("document" | "note" | "task" | "timer" | "journal")[] | undefined;
                query?: string | undefined;
                tags?: string[] | undefined;
                since?: string | undefined;
                sortBy?: "title" | "createdAt" | "updatedAt" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                notes: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                    analysis: unknown;
                    taskMetadata: {
                        status: "archived" | "todo" | "in-progress" | "done";
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null;
                    tweetMetadata: {
                        status: "draft" | "failed" | "posted";
                        tweetId?: string | undefined;
                        url?: string | undefined;
                        postedAt?: string | undefined;
                        importedAt?: string | undefined;
                        metrics?: {
                            retweets?: number | undefined;
                            likes?: number | undefined;
                            replies?: number | undefined;
                            views?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    synced: boolean | null;
                }[];
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                type?: "document" | "note" | "task" | "timer" | "journal" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                taskMetadata?: {
                    status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | undefined;
                analysis?: unknown;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                type?: "document" | "note" | "task" | "timer" | "journal" | undefined;
                title?: string | null | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | null | undefined;
                taskMetadata?: {
                    status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null | undefined;
                analysis?: unknown;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                type: "document" | "note" | "task" | "timer" | "journal";
                title: string | null;
                tags: {
                    value: string;
                }[] | null;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                mentions: import("@hominem/data/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "archived" | "todo" | "in-progress" | "done";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "failed" | "posted";
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | null;
                synced: boolean | null;
            };
            meta: object;
        }>;
        sync: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                items: {
                    type: "document" | "note" | "task" | "timer" | "journal";
                    content: string;
                    id?: string | undefined;
                    title?: string | null | undefined;
                    tags?: {
                        value: string;
                    }[] | undefined;
                    mentions?: {
                        id: string;
                        name: string;
                    }[] | undefined;
                    taskMetadata?: {
                        status?: "archived" | "todo" | "in-progress" | "done" | undefined;
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null | undefined;
                    analysis?: unknown;
                    createdAt?: string | undefined;
                    updatedAt?: string | undefined;
                }[];
            };
            output: {
                created: number;
                updated: number;
                failed: number;
                items: {
                    id: string;
                    updatedAt: string;
                    type: import("@hominem/data/schema").Note["type"];
                }[];
            };
            meta: object;
        }>;
    }>>;
    messages: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getMessageById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                messageId: string;
            };
            output: {
                message: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                } | null;
            };
            meta: object;
        }>;
        updateMessage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
                content: string;
            };
            output: {
                message: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                } | null;
            };
            meta: object;
        }>;
        deleteMessage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        deleteMessagesAfter: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
                afterTimestamp: string;
            };
            output: {
                deletedCount: number;
            };
            meta: object;
        }>;
    }>>;
    location: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        geocode: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
            };
            output: import("@hominem/utils/location").GeocodeFeature[];
            meta: object;
        }>;
    }>>;
    goals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                showArchived?: boolean | undefined;
                sortBy?: string | undefined;
                category?: string | undefined;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                status: string;
                priority: number | null;
                startDate: string | null;
                dueDate: string | null;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        archive: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                title: string;
                description: string | null;
                goalCategory: string | null;
                status: string;
                priority: number | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                startDate: string | null;
                dueDate: string | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                status: string;
                priority: number | null;
                startDate: string | null;
                dueDate: string | null;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
            };
            meta: object;
        }>;
    }>>;
    events: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                tagNames?: string[] | undefined;
                companion?: string | undefined;
                sortBy?: "summary" | "date-asc" | "date-desc" | undefined;
            } | undefined;
            output: {
                tags: {};
                people: {};
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                description?: string | undefined;
                date?: string | Date | undefined;
                type?: string | undefined;
                tags?: string[] | undefined;
                people?: string[] | undefined;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                date: Date;
                description: string | null;
                title: string;
                source: "manual" | "google_calendar";
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                lastSyncedAt: Date | null;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                externalId: string | null;
                calendarId: string | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                deletedAt: Date | null;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            } | null;
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                date?: string | Date | undefined;
                dateStart?: string | Date | undefined;
                dateEnd?: string | Date | undefined;
                type?: string | undefined;
                tags?: string[] | undefined;
                people?: string[] | undefined;
            };
            output: {
                tags: {
                    id: string;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
                people: {
                    id: string;
                    firstName: string;
                    lastName: string | null;
                }[];
                id: string;
                title: string;
                description: string | null;
                date: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                userId: string;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
                syncError: string | null;
                visitNotes: string | null;
                visitRating: number | null;
                visitReview: string | null;
                visitPeople: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            } | null;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: boolean;
            meta: object;
        }>;
        getGoogleCalendars: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                summary: string;
            }[];
            meta: object;
        }>;
        syncGoogleCalendar: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                calendarId?: string | undefined;
                timeMin?: string | undefined;
                timeMax?: string | undefined;
            };
            output: import("@hominem/data/services").SyncResult;
            meta: object;
        }>;
        getSyncStatus: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                connected: boolean;
                lastSyncedAt: Date | null;
                syncError: string | null;
                eventCount: number;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                }[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    id: string;
                };
                output: {
                    transactions: {
                        id: string;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        date: Date;
                        description: string | null;
                        tags: string | null;
                        status: string | null;
                        category: string | null;
                        source: string | null;
                        location: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        note: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                    institutionName: string | null;
                    institutionLogo: string | null;
                    isPlaidConnected: boolean;
                    plaidItemStatus: string | null;
                    plaidItemError: unknown;
                    plaidLastSyncedAt: Date | null;
                    plaidItemInternalId: string | null;
                    plaidInstitutionId: string | null;
                    plaidInstitutionName: string | null;
                } | null;
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings";
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    name?: string | undefined;
                    type?: "credit" | "investment" | "checking" | "savings" | undefined;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    id: string;
                    type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                    name: string;
                    balance: string;
                    lastUpdated: Date | null;
                    meta: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    institutionId: string | null;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    plaidItemId: string | null;
                    plaidAccountId: string | null;
                };
                meta: object;
            }>;
            delete: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
            all: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    accounts: {
                        transactions: {
                            id: string;
                            type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            date: Date;
                            description: string | null;
                            tags: string | null;
                            status: string | null;
                            category: string | null;
                            source: string | null;
                            location: unknown;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            note: string | null;
                            recurring: boolean | null;
                            pending: boolean | null;
                            paymentChannel: string | null;
                        }[];
                        id: string;
                        userId: string;
                        name: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        institutionId: string | null;
                        plaidAccountId: string | null;
                        plaidItemId: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        meta: unknown;
                        lastUpdated: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        institutionName: string | null;
                        institutionLogo: string | null;
                        isPlaidConnected: boolean;
                        plaidItemStatus: "error" | "active" | "pending_expiration" | "revoked" | null;
                        plaidItemError: string | null;
                        plaidLastSyncedAt: Date | null;
                        plaidItemInternalId: string | null;
                        plaidInstitutionId: string | null;
                        plaidInstitutionName: string | null;
                    }[];
                    connections: {
                        id: string;
                        itemId: string;
                        institutionId: string;
                        institutionName: string;
                        status: "error" | "active" | "pending_expiration" | "revoked";
                        lastSyncedAt: Date | null;
                        error: string | null;
                        createdAt: Date;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        categories: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    category: string | null;
                }[];
                meta: object;
            }>;
        }>>;
        institutions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            connections: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/data/finance").InstitutionConnection[];
                meta: object;
            }>;
            accounts: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/data/finance").InstitutionAccount[];
                meta: object;
            }>;
            institutionAccounts: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: import("@hominem/data/finance").InstitutionAccount[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                } | undefined;
                meta: object;
            }>;
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                }[];
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    name: string;
                    url?: string | undefined;
                    logo?: string | undefined;
                    primaryColor?: string | undefined;
                    country?: string | undefined;
                };
                output: {
                    id: string;
                    url: string | null;
                    name: string;
                    country: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                };
                meta: object;
            }>;
            link: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    accountId: string;
                    institutionId: string;
                    plaidItemId?: string | undefined;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        id: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        name: string;
                        balance: string;
                        lastUpdated: Date | null;
                        meta: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        institutionId: string | null;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
            unlink: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    accountId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        id: string;
                        type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                        name: string;
                        balance: string;
                        lastUpdated: Date | null;
                        meta: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        institutionId: string | null;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    category?: string | undefined;
                    min?: string | undefined;
                    max?: string | undefined;
                    account?: string | undefined;
                    limit?: number | undefined;
                    offset?: number | undefined;
                    description?: string | undefined;
                    search?: string | undefined;
                    sortBy?: string | string[] | undefined;
                    sortDirection?: "asc" | "desc" | ("asc" | "desc")[] | undefined;
                };
                output: {
                    data: {
                        id: string;
                        date: Date;
                        description: string | null;
                        amount: string;
                        status: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "other" | "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage";
                            balance: string;
                            interestRate: string | null;
                            minimumPayment: string | null;
                            name: string;
                            mask: string | null;
                            isoCurrencyCode: string | null;
                            subtype: string | null;
                            officialName: string | null;
                            limit: string | null;
                            meta: unknown;
                            lastUpdated: Date | null;
                            createdAt: Date;
                            updatedAt: Date;
                            institutionId: string | null;
                            plaidItemId: string | null;
                            plaidAccountId: string | null;
                            userId: string;
                        } | null;
                    }[];
                    filteredCount: number;
                    totalUserCount: number;
                };
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type: "transfer" | 6 | "income" | "expense" | "credit" | "debit" | "investment" | {
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                    } | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | {
                        [x: number]: boolean | undefined;
                        length?: boolean | undefined;
                        toString?: boolean | undefined;
                        toLocaleString?: boolean | undefined;
                        pop?: boolean | undefined;
                        push?: boolean | undefined;
                        concat?: boolean | undefined;
                        join?: boolean | undefined;
                        reverse?: boolean | undefined;
                        shift?: boolean | undefined;
                        slice?: boolean | undefined;
                        sort?: boolean | undefined;
                        splice?: boolean | undefined;
                        unshift?: boolean | undefined;
                        indexOf?: boolean | undefined;
                        lastIndexOf?: boolean | undefined;
                        every?: boolean | undefined;
                        some?: boolean | undefined;
                        forEach?: boolean | undefined;
                        map?: boolean | undefined;
                        filter?: boolean | undefined;
                        reduce?: boolean | undefined;
                        reduceRight?: boolean | undefined;
                        find?: boolean | undefined;
                        findIndex?: boolean | undefined;
                        fill?: boolean | undefined;
                        copyWithin?: boolean | undefined;
                        entries?: boolean | undefined;
                        keys?: boolean | undefined;
                        values?: boolean | undefined;
                        includes?: boolean | undefined;
                        flatMap?: boolean | undefined;
                        flat?: boolean | undefined;
                        at?: boolean | undefined;
                        findLast?: boolean | undefined;
                        findLastIndex?: boolean | undefined;
                        toReversed?: boolean | undefined;
                        toSorted?: boolean | undefined;
                        toSpliced?: boolean | undefined;
                        with?: boolean | undefined;
                        [Symbol.iterator]?: boolean | undefined;
                        readonly [Symbol.unscopables]?: boolean | undefined;
                    } | {
                        (...items: ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment" | ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">)[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                        (searchElement: string, fromIndex?: number): number;
                    } | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                        (searchElement: string, fromIndex?: number): number;
                    } | ((start?: number, end?: number) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                        (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): boolean;
                        (searchElement: string, fromIndex?: number): boolean;
                    } | ((index: number) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | {
                        (): string;
                        (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                    } | (() => string) | (<U>(callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, thisArg?: any) => U[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                        (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): this is S[];
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): boolean;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => void, thisArg?: any) => void) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S[];
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: BooleanConstructor, thisArg?: any): TSReset.NonFalsy<S>[];
                    } | {
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                    } | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "transfer" | "income" | "expense" | "credit" | "debit" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                        <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                    } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                        (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                    } | ((index: number, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]);
                    date: Date;
                    amount: string;
                    accountId: string;
                    id?: string | undefined;
                    description?: string | null | undefined;
                    tags?: string | null | undefined;
                    status?: string | null | undefined;
                    category?: string | null | undefined;
                    source?: string | null | undefined;
                    location?: unknown;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    note?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    pending?: boolean | null | undefined;
                    paymentChannel?: string | null | undefined;
                };
                output: {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                } & {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                }[];
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        id?: string | undefined;
                        type?: "transfer" | 6 | "income" | "expense" | "credit" | "debit" | "investment" | {
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                        } | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | {
                            [x: number]: boolean | undefined;
                            length?: boolean | undefined;
                            toString?: boolean | undefined;
                            toLocaleString?: boolean | undefined;
                            pop?: boolean | undefined;
                            push?: boolean | undefined;
                            concat?: boolean | undefined;
                            join?: boolean | undefined;
                            reverse?: boolean | undefined;
                            shift?: boolean | undefined;
                            slice?: boolean | undefined;
                            sort?: boolean | undefined;
                            splice?: boolean | undefined;
                            unshift?: boolean | undefined;
                            indexOf?: boolean | undefined;
                            lastIndexOf?: boolean | undefined;
                            every?: boolean | undefined;
                            some?: boolean | undefined;
                            forEach?: boolean | undefined;
                            map?: boolean | undefined;
                            filter?: boolean | undefined;
                            reduce?: boolean | undefined;
                            reduceRight?: boolean | undefined;
                            find?: boolean | undefined;
                            findIndex?: boolean | undefined;
                            fill?: boolean | undefined;
                            copyWithin?: boolean | undefined;
                            entries?: boolean | undefined;
                            keys?: boolean | undefined;
                            values?: boolean | undefined;
                            includes?: boolean | undefined;
                            flatMap?: boolean | undefined;
                            flat?: boolean | undefined;
                            at?: boolean | undefined;
                            findLast?: boolean | undefined;
                            findLastIndex?: boolean | undefined;
                            toReversed?: boolean | undefined;
                            toSorted?: boolean | undefined;
                            toSpliced?: boolean | undefined;
                            with?: boolean | undefined;
                            [Symbol.iterator]?: boolean | undefined;
                            readonly [Symbol.unscopables]?: boolean | undefined;
                        } | {
                            (...items: ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment" | ConcatArray<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">)[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                            (searchElement: string, fromIndex?: number): number;
                        } | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): number;
                            (searchElement: string, fromIndex?: number): number;
                        } | ((start?: number, end?: number) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                            (searchElement: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", fromIndex?: number): boolean;
                            (searchElement: string, fromIndex?: number): boolean;
                        } | ((index: number) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | {
                            (): string;
                            (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                        } | (() => string) | (<U>(callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, thisArg?: any) => U[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | (() => "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                            (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | ((...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => number) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): this is S[];
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): boolean;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => void, thisArg?: any) => void) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S[];
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: BooleanConstructor, thisArg?: any): TSReset.NonFalsy<S>[];
                        } | {
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            (callbackfn: (previousValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => "transfer" | "income" | "expense" | "credit" | "debit" | "investment", initialValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment"): "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", currentIndex: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U, initialValue: U): U;
                        } | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, obj: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "transfer" | "income" | "expense" | "credit" | "debit" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"transfer" | "income" | "expense" | "credit" | "debit" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                            <S extends "transfer" | "income" | "expense" | "credit" | "debit" | "investment">(predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any): "transfer" | "income" | "expense" | "credit" | "debit" | "investment" | undefined;
                        } | ((predicate: (value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", index: number, array: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | ((compareFn?: ((a: "transfer" | "income" | "expense" | "credit" | "debit" | "investment", b: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => number) | undefined) => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | {
                            (start: number, deleteCount: number, ...items: ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                            (start: number, deleteCount?: number): ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[];
                        } | ((index: number, value: "transfer" | "income" | "expense" | "credit" | "debit" | "investment") => ("transfer" | "income" | "expense" | "credit" | "debit" | "investment")[]) | undefined;
                        amount?: string | undefined;
                        date?: Date | undefined;
                        description?: string | null | undefined;
                        merchantName?: string | null | undefined;
                        accountId?: string | undefined;
                        fromAccountId?: string | null | undefined;
                        toAccountId?: string | null | undefined;
                        status?: string | null | undefined;
                        category?: string | null | undefined;
                        parentCategory?: string | null | undefined;
                        excluded?: boolean | null | undefined;
                        tags?: string | null | undefined;
                        accountMask?: string | null | undefined;
                        note?: string | null | undefined;
                        recurring?: boolean | null | undefined;
                        pending?: boolean | null | undefined;
                        paymentChannel?: string | null | undefined;
                        location?: unknown;
                        source?: string | null | undefined;
                        createdAt?: Date | undefined;
                        updatedAt?: Date | undefined;
                        userId?: string | undefined;
                    };
                };
                output: {
                    id: string;
                    type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                    date: Date;
                    description: string | null;
                    tags: string | null;
                    status: string | null;
                    category: string | null;
                    source: string | null;
                    location: unknown;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    note: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                };
                meta: object;
            }>;
            delete: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        budget: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            categories: {
                list: import("@trpc/server").TRPCQueryProcedure<{
                    input: void;
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    }[];
                    meta: object;
                }>;
                listWithSpending: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        monthYear: string;
                    };
                    output: import("@hominem/data/finance").BudgetCategoryWithSpending[];
                    meta: object;
                }>;
                get: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    };
                    meta: object;
                }>;
                create: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        name: string;
                        type: "income" | "expense";
                        averageMonthlyExpense?: string | undefined;
                        budgetId?: string | undefined;
                        color?: string | undefined;
                    };
                    output: {
                        id: string;
                        type: "income" | "expense";
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                    };
                    meta: object;
                }>;
                update: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                        name?: string | undefined;
                        type?: "income" | "expense" | undefined;
                        averageMonthlyExpense?: string | undefined;
                        budgetId?: string | undefined;
                        color?: string | undefined;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                        userId: string;
                    };
                    meta: object;
                }>;
                delete: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        success: boolean;
                        message: string;
                    };
                    meta: object;
                }>;
            };
            tracking: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    monthYear: string;
                };
                output: import("@hominem/data/finance").BudgetTrackingData;
                meta: object;
            }>;
            history: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    months?: number | undefined;
                };
                output: {
                    date: string;
                    budgeted: number;
                    actual: number;
                }[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    income: number;
                    expenses: {
                        category: string;
                        amount: number;
                    }[];
                } | undefined;
                output: {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        category: string;
                        amount: number;
                    }[];
                    projections: {
                        month: number;
                        savings: number;
                        totalSaved: number;
                    }[];
                    calculatedAt: string;
                    source: "manual";
                } | {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        category: string;
                        amount: number;
                    }[];
                    projections: {
                        month: number;
                        savings: number;
                        totalSaved: number;
                    }[];
                    calculatedAt: string;
                    source: "categories";
                };
                meta: object;
            }>;
            transactionCategories: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    name: string;
                    transactionCount: number;
                    totalAmount: number;
                    averageAmount: number;
                    suggestedBudget: number;
                    monthsWithTransactions: number;
                }[];
                meta: object;
            }>;
            bulkCreateFromTransactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    categories: {
                        name: string;
                        type: "income" | "expense";
                        averageMonthlyExpense?: string | undefined;
                        color?: string | undefined;
                    }[];
                };
                output: {
                    success: boolean;
                    message: string;
                    categories: never[];
                    skipped: number;
                    created?: undefined;
                } | {
                    success: boolean;
                    message: string;
                    categories: {
                        id: string;
                        type: "income" | "expense";
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                        color: string | null;
                    }[];
                    created: number;
                    skipped: number;
                };
                meta: object;
            }>;
        }>>;
        analyze: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            spendingTimeSeries: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    category?: string | undefined;
                    limit?: number | undefined;
                    groupBy?: "day" | "month" | "week" | undefined;
                    includeStats?: boolean | undefined;
                    compareToPrevious?: boolean | undefined;
                };
                output: import("@hominem/data/finance").TimeSeriesResponse;
                meta: object;
            }>;
            topMerchants: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    category?: string | undefined;
                    limit?: number | undefined;
                };
                output: import("@hominem/data/finance").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    limit?: string | undefined;
                };
                output: import("@hominem/data/finance").CategorySummary[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    category?: string | undefined;
                    accounts?: string[] | undefined;
                    type?: "income" | "expense" | undefined;
                };
                output: {
                    value: number;
                    calculationType: "sum" | "average" | "count";
                } | {
                    count: number;
                    total: string;
                    average: string;
                    minimum: string;
                    maximum: string;
                };
                meta: object;
            }>;
            monthlyStats: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    month: string;
                };
                output: {
                    month: string;
                    startDate: string;
                    endDate: string;
                    totalIncome: number;
                    totalExpenses: number;
                    netIncome: number;
                    transactionCount: number;
                    categorySpending: {
                        name: string | null;
                        amount: number;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        export: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            transactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        id: string;
                        type: "transfer" | "income" | "expense" | "credit" | "debit" | "investment";
                        date: Date;
                        description: string | null;
                        tags: string | null;
                        status: string | null;
                        category: string | null;
                        source: string | null;
                        location: unknown;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        note: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    filename: string;
                };
                meta: object;
            }>;
            summary: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    endDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        totalIncome: number;
                        totalExpenses: number;
                        netCashflow: number;
                        categorySummary: never[];
                    };
                    filename: string;
                };
                meta: object;
            }>;
        }>>;
        data: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            deleteAll: import("@trpc/server").TRPCMutationProcedure<{
                input: void;
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        plaid: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/trpc/procedures").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            createLinkToken: import("@trpc/server").TRPCMutationProcedure<{
                input: void;
                output: {
                    success: boolean;
                    linkToken: string;
                    expiration: string;
                };
                meta: object;
            }>;
            exchangeToken: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    publicToken: string;
                    institutionId: string;
                    institutionName: string;
                };
                output: {
                    success: boolean;
                    message: string;
                    institutionName: string;
                };
                meta: object;
            }>;
            syncItem: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    itemId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
            removeConnection: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    itemId: string;
                };
                output: {
                    success: boolean;
                    message: string;
                };
                meta: object;
            }>;
        }>>;
        runway: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                balance: number;
                monthlyExpenses: number;
                plannedPurchases?: {
                    description: string;
                    amount: number;
                    date: string;
                }[] | undefined;
            };
            output: {
                success: boolean;
                data: {
                    projectionData: {
                        month: string;
                        balance: number;
                    }[];
                    runwayMonths: number;
                    burnRate: number;
                    initialBalance: number;
                    currentBalance: number;
                    runwayEndDate: string;
                    monthlyBreakdown: Array<{
                        month: string;
                        expenses: number;
                        purchases: number;
                        endingBalance: number;
                    }>;
                    isRunwayDangerous: boolean;
                    minimumBalance: number;
                    totalPlannedExpenses: number;
                };
                error?: undefined;
            } | {
                success: boolean;
                error: string;
                data?: undefined;
            };
            meta: object;
        }>;
    }>>;
    files: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        fetch: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                data: ArrayBuffer;
                contentType: string;
                message: string;
            };
            meta: object;
        }>;
        getUrl: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                url: string;
                expiresAt: string;
                message: string;
            };
            meta: object;
        }>;
        remove: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fileId: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                files: import("@supabase/storage-js").FileObject[];
                count: number;
            };
            meta: object;
        }>;
    }>>;
    content: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: string | undefined;
                query?: string | undefined;
                tags?: string | undefined;
                since?: string | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                }[];
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                type?: "tweet" | "essay" | "blog_post" | "social_post" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                tweetMetadata?: {
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    status?: "draft" | "failed" | "posted" | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                };
            };
            meta: object;
        }>;
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    tags: {
                        value: string;
                    }[] | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    scheduledFor: string | null;
                    publishedAt: string | null;
                    excerpt: string | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    contentStrategyId: string | null;
                };
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                type?: "tweet" | "essay" | "blog_post" | "social_post" | undefined;
                title?: string | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                tweetMetadata?: {
                    tweetId?: string | undefined;
                    url?: string | undefined;
                    status?: "draft" | "failed" | "posted" | undefined;
                    postedAt?: string | undefined;
                    importedAt?: string | undefined;
                    metrics?: {
                        retweets?: number | undefined;
                        likes?: number | undefined;
                        replies?: number | undefined;
                        views?: number | undefined;
                    } | undefined;
                    threadPosition?: number | undefined;
                    threadId?: string | undefined;
                    inReplyTo?: string | undefined;
                } | undefined;
            };
            output: {
                content: {
                    id: string;
                    type: "document" | "note" | "task" | "timer" | "journal" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    content: string;
                    excerpt: string | null;
                    status: "draft" | "published" | "archived" | "scheduled" | "failed";
                    tags: {
                        value: string;
                    }[] | null;
                    socialMediaMetadata: {
                        platform?: string | undefined;
                        externalId?: string | undefined;
                        url?: string | undefined;
                        scheduledFor?: string | undefined;
                        publishedAt?: string | undefined;
                        metrics?: {
                            views?: number | undefined;
                            likes?: number | undefined;
                            reposts?: number | undefined;
                            replies?: number | undefined;
                            clicks?: number | undefined;
                        } | undefined;
                        threadPosition?: number | undefined;
                        threadId?: string | undefined;
                        inReplyTo?: string | undefined;
                    } | null;
                    seoMetadata: {
                        metaTitle?: string | undefined;
                        metaDescription?: string | undefined;
                        keywords?: string[] | undefined;
                        canonicalUrl?: string | undefined;
                        featuredImage?: string | undefined;
                        excerpt?: string | undefined;
                    } | null;
                    userId: string;
                    contentStrategyId: string | null;
                    createdAt: string;
                    updatedAt: string;
                    publishedAt: string | null;
                    scheduledFor: string | null;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    contentStrategies: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
                description?: string | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            }[];
            meta: object;
        }>;
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                strategy?: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                } | undefined;
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                strategy: {
                    topic: string;
                    targetAudience: string;
                    platforms?: string[] | undefined;
                    keyInsights?: string[] | undefined;
                    contentPlan?: {
                        blog?: {
                            title: string;
                            outline: {
                                heading: string;
                                content: string;
                            }[];
                            wordCount: number;
                            seoKeywords: string[];
                            callToAction: string;
                        } | undefined;
                        socialMedia?: {
                            platform: string;
                            contentIdeas: string[];
                            hashtagSuggestions: string[];
                            bestTimeToPost: string;
                        }[] | undefined;
                        visualContent?: {
                            infographicIdeas: string[];
                            imageSearchTerms: string[];
                        } | undefined;
                    } | undefined;
                    monetization?: string[] | undefined;
                    competitiveAnalysis?: {
                        gaps: string;
                        opportunities: string[];
                    } | undefined;
                };
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                topic: string;
                audience: string;
                platforms: string[];
            };
            output: {};
            meta: object;
        }>;
    }>>;
    chats: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getUserChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: {
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
            }[];
            meta: object;
        }>;
        getChatById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
            };
            output: {
                messages: {
                    id: string;
                    reasoning: string | null;
                    role: import("@hominem/data/schema").ChatMessageRole;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                    chatId: string;
                    toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                    files: import("@hominem/data/schema").ChatMessageFile[] | null;
                    parentMessageId: string | null;
                    messageIndex: string | null;
                }[];
                id: string;
                title: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        createChat: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
            };
            output: {
                chat: {
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                };
            };
            meta: object;
        }>;
        deleteChat: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        updateChatTitle: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                chatId: string;
                title: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        searchChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                userId?: string | undefined;
                limit?: number | undefined;
            };
            output: {
                chats: {
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: string;
                }[];
            };
            meta: object;
        }>;
        send: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                message: string;
                chatId?: string | undefined;
            };
            output: {
                streamId: string;
                chatId: string;
                chatTitle: string;
                messages: {
                    user: {
                        id: string;
                        reasoning: string | null;
                        role: import("@hominem/data/schema").ChatMessageRole;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        userId: string;
                        chatId: string;
                        toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                        files: import("@hominem/data/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    } | null;
                    assistant: {
                        id: string;
                        reasoning: string | null;
                        role: import("@hominem/data/schema").ChatMessageRole;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        userId: string;
                        chatId: string;
                        toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                        files: import("@hominem/data/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    };
                };
                metadata: {
                    startTime: number;
                    timestamp: string;
                };
            };
            meta: object;
        }>;
        getMessages: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                id: string;
                reasoning: string | null;
                role: import("@hominem/data/schema").ChatMessageRole;
                content: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                chatId: string;
                toolCalls: import("@hominem/data/schema").ChatMessageToolCall[] | null;
                files: import("@hominem/data/schema").ChatMessageFile[] | null;
                parentMessageId: string | null;
                messageIndex: string | null;
            }[];
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                image: string | null;
                title: string;
                description: string | null;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
                url: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                url: string;
            };
            output: {
                id: string;
                url: string;
                description: string | null;
                title: string;
                image: string | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                url: string;
            };
            output: {
                id: string;
                image: string | null;
                title: string;
                description: string | null;
                imageHeight: string | null;
                imageWidth: string | null;
                locationAddress: string | null;
                locationLat: string | null;
                locationLng: string | null;
                siteName: string;
                url: string;
                userId: string;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
    }>>;
    people: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/trpc/procedures").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                firstName: string;
                lastName?: string | undefined;
                email?: string | undefined;
                phone?: string | undefined;
            };
            output: {
                id: string;
                firstName: string;
                lastName: string | null;
                title: string | null;
                email: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                phone: string | null;
                linkedinUrl: string | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                firstName?: string | undefined;
                lastName?: string | undefined;
                email?: string | undefined;
                phone?: string | undefined;
            };
            output: {
                id: string;
                userId: string;
                firstName: string;
                lastName: string | null;
                email: string | null;
                phone: string | null;
                linkedinUrl: string | null;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
            };
            output: boolean;
            meta: object;
        }>;
    }>>;
}>>>;
