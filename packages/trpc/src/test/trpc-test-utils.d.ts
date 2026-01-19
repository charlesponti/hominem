import type { UserSelect } from '@hominem/db/schema';
import type { Hono } from 'hono';
import type { AppEnv } from '../src/server.js';
/**
 * Creates a tRPC test client that works with the existing test infrastructure
 * Uses x-user-id header for authentication in test mode
 */
export declare const createTRPCTestClient: (server: Hono<AppEnv>, userId: string) => import("@trpc/client").TRPCClient<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../src/procedures.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    user: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                supabaseId: string;
                id: string;
                name: string | null;
                createdAt: string;
                updatedAt: string;
                email: string;
                image: string | null;
                photoUrl: string | null;
                isAdmin: boolean;
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
                supabaseId: string;
                id: string;
                name: string | null;
                createdAt: string;
                updatedAt: string;
                email: string;
                image: string | null;
                photoUrl: string | null;
                isAdmin: boolean;
                birthday: string | null;
                emailVerified: string | null;
            } | null;
            meta: object;
        }>;
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                    metadata: any;
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
                    metadata: any;
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
                metadata?: Record<string, unknown> | undefined;
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
        ctx: import("../src/procedures.js").Context;
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
            input: any;
            output: {
                success: boolean;
                tweet: TwitterTweetResponse;
                content: {
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                total: any;
            };
            meta: object;
        }>;
    }>>;
    tweet: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                strategyType?: "custom" | "default" | undefined;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        search: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                query: string;
                maxResults?: number | undefined;
            };
            output: import("../src/routers/search.js").SearchResponse;
            meta: object;
        }>;
    }>>;
    performance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getSummary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timeWindow?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        getSystemHealth: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
        getRecentErrors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        getTrends: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                hours?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        recordMetric: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                duration: number;
                metadata?: Record<string, unknown> | undefined;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: ("note" | "task" | "timer" | "journal" | "document")[] | undefined;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
                    mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                    analysis: unknown;
                    taskMetadata: {
                        status: "todo" | "in-progress" | "done" | "archived";
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null;
                    tweetMetadata: {
                        status: "draft" | "posted" | "failed";
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                type?: "note" | "task" | "timer" | "journal" | "document" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                taskMetadata?: {
                    status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                type?: "note" | "task" | "timer" | "journal" | "document" | undefined;
                title?: string | null | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | null | undefined;
                taskMetadata?: {
                    status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                    type: "note" | "task" | "timer" | "journal" | "document";
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
                        status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                    type: import("@hominem/db/schema").Note["type"];
                }[];
            };
            meta: object;
        }>;
    }>>;
    messages: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
        ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
                status?: "todo" | "archived" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                userId: string;
                description: string | null;
                id: string;
                title: string;
                startDate: string | null;
                priority: number | null;
                dueDate: string | null;
                status: string;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "todo" | "archived" | "in_progress" | "completed" | undefined;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                startDate: string | null;
                priority: number | null;
                dueDate: string | null;
                status: string;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
    }>>;
    events: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                tagNames?: string[] | undefined;
                companion?: string | undefined;
                sortBy?: "date-asc" | "date-desc" | "summary" | undefined;
            } | undefined;
            output: {
                tags: any;
                people: any;
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
                userId: string;
                description: string | null;
                id: string;
                date: Date;
                title: string;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                createdAt: Date;
                updatedAt: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
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
            output: import("@hominem/services").SyncResult;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                        userId: string;
                        description: string | null;
                        id: string;
                        date: Date;
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        status: string | null;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        note: string | null;
                        location: unknown;
                        source: string | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                            userId: string;
                            description: string | null;
                            id: string;
                            date: Date;
                            type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            status: string | null;
                            tags: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            note: string | null;
                            location: unknown;
                            source: string | null;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            category: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            recurring: boolean | null;
                            pending: boolean | null;
                            paymentChannel: string | null;
                        }[];
                        id: string;
                        userId: string;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
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
                        plaidItemStatus: "active" | "error" | "pending_expiration" | "revoked" | null;
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
                        status: "active" | "error" | "pending_expiration" | "revoked";
                        lastSyncedAt: Date | null;
                        error: string | null;
                        createdAt: Date;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        categories: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
            ctx: import("../src/procedures.js").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            connections: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/finance-services").InstitutionConnection[];
                meta: object;
            }>;
            accounts: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/finance-services").InstitutionAccount[];
                meta: object;
            }>;
            institutionAccounts: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: import("@hominem/finance-services").InstitutionAccount[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: {
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
                } | undefined;
                meta: object;
            }>;
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
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
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
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
                        userId: string;
                        id: string;
                        meta: unknown;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        createdAt: Date;
                        updatedAt: Date;
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        lastUpdated: Date | null;
                        institutionId: string | null;
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
                        userId: string;
                        id: string;
                        meta: unknown;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        createdAt: Date;
                        updatedAt: Date;
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        lastUpdated: Date | null;
                        institutionId: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
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
                    date: Date;
                    type: 6 | "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | {
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                    } | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | {
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
                        (...items: ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment" | ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">)[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((start?: number, end?: number) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => boolean) | ((index: number) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | {
                        (): string;
                        (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                    } | ((index: number, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => string) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                        (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): this is S[];
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): boolean;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => void, thisArg?: any) => void) | (<U>(callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, thisArg?: any) => U[]) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S[];
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | {
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                    } | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "income" | "expense" | "credit" | "debit" | "transfer" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | {
                        (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    };
                    amount: string;
                    accountId: string;
                    description?: string | null | undefined;
                    id?: string | undefined;
                    status?: string | null | undefined;
                    tags?: string | null | undefined;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    note?: string | null | undefined;
                    location?: unknown;
                    source?: string | null | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    category?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    pending?: boolean | null | undefined;
                    paymentChannel?: string | null | undefined;
                };
                output: {
                    userId: string;
                    description: string | null;
                    id: string;
                    date: Date;
                    type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                    status: string | null;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    note: string | null;
                    location: unknown;
                    source: string | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        id?: string | undefined;
                        type?: 6 | "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | {
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                        } | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | {
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
                            (...items: ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment" | ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">)[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((start?: number, end?: number) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => boolean) | ((index: number) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | {
                            (): string;
                            (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                        } | ((index: number, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => string) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                            (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): this is S[];
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): boolean;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => void, thisArg?: any) => void) | (<U>(callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, thisArg?: any) => U[]) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S[];
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | {
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                        } | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "income" | "expense" | "credit" | "debit" | "transfer" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | {
                            (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | undefined;
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
                    userId: string;
                    description: string | null;
                    id: string;
                    date: Date;
                    type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                    status: string | null;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    note: string | null;
                    location: unknown;
                    source: string | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
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
            ctx: import("../src/procedures.js").Context;
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
                    output: import("@hominem/finance-services").BudgetCategoryWithSpending[];
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
                        userId: string;
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        color: string | null;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
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
                output: import("@hominem/finance-services").BudgetTrackingData;
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
                        userId: string;
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        color: string | null;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    }[];
                    created: number;
                    skipped: number;
                };
                meta: object;
            }>;
        }>>;
        analyze: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
                output: import("@hominem/finance-services").TimeSeriesResponse;
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
                output: import("@hominem/finance-services").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    limit?: string | undefined;
                };
                output: import("@hominem/finance-services").CategorySummary[];
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
            ctx: import("../src/procedures.js").Context;
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
                        userId: string;
                        description: string | null;
                        id: string;
                        date: Date;
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        status: string | null;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        note: string | null;
                        location: unknown;
                        source: string | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
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
            ctx: import("../src/procedures.js").Context;
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
            ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    status?: "draft" | "posted" | "failed" | undefined;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    status?: "draft" | "posted" | "failed" | undefined;
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
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    content: string;
                    excerpt: string | null;
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
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
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getUserChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: {
                userId: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        getChatById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
            };
            output: {
                messages: {
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                    userId: string;
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
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
                    userId: string;
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
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
                        userId: string;
                        id: string;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        role: import("@hominem/db/schema").ChatMessageRole;
                        chatId: string;
                        toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                        reasoning: string | null;
                        files: import("@hominem/db/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    } | null;
                    assistant: {
                        userId: string;
                        id: string;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        role: import("@hominem/db/schema").ChatMessageRole;
                        chatId: string;
                        toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                        reasoning: string | null;
                        files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                userId: string;
                id: string;
                content: string;
                createdAt: string;
                updatedAt: string;
                role: import("@hominem/db/schema").ChatMessageRole;
                chatId: string;
                toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                reasoning: string | null;
                files: import("@hominem/db/schema").ChatMessageFile[] | null;
                parentMessageId: string | null;
                messageIndex: string | null;
            }[];
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                description: string | null;
                url: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                image: string | null;
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
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                id: string;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                firstName: string;
                lastName: string | null;
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
    ctx: import("../src/procedures.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    user: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                supabaseId: string;
                id: string;
                name: string | null;
                createdAt: string;
                updatedAt: string;
                email: string;
                image: string | null;
                photoUrl: string | null;
                isAdmin: boolean;
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
                supabaseId: string;
                id: string;
                name: string | null;
                createdAt: string;
                updatedAt: string;
                email: string;
                image: string | null;
                photoUrl: string | null;
                isAdmin: boolean;
                birthday: string | null;
                emailVerified: string | null;
            } | null;
            meta: object;
        }>;
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                    metadata: any;
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
                    metadata: any;
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
                metadata?: Record<string, unknown> | undefined;
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
        ctx: import("../src/procedures.js").Context;
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
            input: any;
            output: {
                success: boolean;
                tweet: TwitterTweetResponse;
                content: {
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                total: any;
            };
            meta: object;
        }>;
    }>>;
    tweet: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        generate: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content: string;
                strategyType?: "custom" | "default" | undefined;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        search: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                query: string;
                maxResults?: number | undefined;
            };
            output: import("../src/routers/search.js").SearchResponse;
            meta: object;
        }>;
    }>>;
    performance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getSummary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timeWindow?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        getSystemHealth: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
        getRecentErrors: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        getTrends: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                hours?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        recordMetric: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                duration: number;
                metadata?: Record<string, unknown> | undefined;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                types?: ("note" | "task" | "timer" | "journal" | "document")[] | undefined;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
                    mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                    analysis: unknown;
                    taskMetadata: {
                        status: "todo" | "in-progress" | "done" | "archived";
                        priority?: "low" | "medium" | "high" | "urgent" | undefined;
                        dueDate?: string | null | undefined;
                        startTime?: string | undefined;
                        firstStartTime?: string | undefined;
                        endTime?: string | undefined;
                        duration?: number | undefined;
                    } | null;
                    tweetMetadata: {
                        status: "draft" | "posted" | "failed";
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                type?: "note" | "task" | "timer" | "journal" | "document" | undefined;
                title?: string | undefined;
                tags?: {
                    value: string;
                }[] | undefined;
                mentions?: {
                    id: string;
                    name: string;
                }[] | undefined;
                taskMetadata?: {
                    status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                type?: "note" | "task" | "timer" | "journal" | "document" | undefined;
                title?: string | null | undefined;
                content?: string | undefined;
                tags?: {
                    value: string;
                }[] | null | undefined;
                taskMetadata?: {
                    status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                userId: string;
                id: string;
                title: string | null;
                type: "note" | "task" | "timer" | "journal" | "document";
                content: string;
                tags: {
                    value: string;
                }[] | null;
                createdAt: string;
                updatedAt: string;
                mentions: import("@hominem/db/schema").NoteMention[] | null | undefined;
                analysis: unknown;
                taskMetadata: {
                    status: "todo" | "in-progress" | "done" | "archived";
                    priority?: "low" | "medium" | "high" | "urgent" | undefined;
                    dueDate?: string | null | undefined;
                    startTime?: string | undefined;
                    firstStartTime?: string | undefined;
                    endTime?: string | undefined;
                    duration?: number | undefined;
                } | null;
                tweetMetadata: {
                    status: "draft" | "posted" | "failed";
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
                    type: "note" | "task" | "timer" | "journal" | "document";
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
                        status?: "todo" | "in-progress" | "done" | "archived" | undefined;
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
                    type: import("@hominem/db/schema").Note["type"];
                }[];
            };
            meta: object;
        }>;
    }>>;
    messages: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
        ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
                status?: "todo" | "archived" | "in_progress" | "completed" | undefined;
                priority?: number | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                userId: string;
                description: string | null;
                id: string;
                title: string;
                startDate: string | null;
                priority: number | null;
                dueDate: string | null;
                status: string;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                title?: string | undefined;
                description?: string | undefined;
                goalCategory?: string | undefined;
                status?: "todo" | "archived" | "in_progress" | "completed" | undefined;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                startDate: string | null;
                priority: number | null;
                dueDate: string | null;
                status: string;
                goalCategory: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
                createdAt: string;
                updatedAt: string;
            };
            meta: object;
        }>;
    }>>;
    events: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                tagNames?: string[] | undefined;
                companion?: string | undefined;
                sortBy?: "date-asc" | "date-desc" | "summary" | undefined;
            } | undefined;
            output: {
                tags: any;
                people: any;
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
                userId: string;
                description: string | null;
                id: string;
                date: Date;
                title: string;
                type: "Transactions" | "Events" | "Birthdays" | "Anniversaries" | "Dates" | "Messages" | "Photos" | "Relationship Start" | "Relationship End" | "Sex" | "Movies" | "Reading";
                createdAt: Date;
                updatedAt: Date;
                placeId: string | null;
                dateStart: Date | null;
                dateEnd: Date | null;
                dateTime: Date | null;
                source: "manual" | "google_calendar";
                externalId: string | null;
                calendarId: string | null;
                lastSyncedAt: Date | null;
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
            output: import("@hominem/services").SyncResult;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                        userId: string;
                        description: string | null;
                        id: string;
                        date: Date;
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        status: string | null;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        note: string | null;
                        location: unknown;
                        source: string | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        recurring: boolean | null;
                        pending: boolean | null;
                        paymentChannel: string | null;
                    }[];
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                    userId: string;
                    id: string;
                    meta: unknown;
                    name: string;
                    type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    createdAt: Date;
                    updatedAt: Date;
                    balance: string;
                    interestRate: string | null;
                    minimumPayment: string | null;
                    mask: string | null;
                    isoCurrencyCode: string | null;
                    subtype: string | null;
                    officialName: string | null;
                    limit: string | null;
                    lastUpdated: Date | null;
                    institutionId: string | null;
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
                            userId: string;
                            description: string | null;
                            id: string;
                            date: Date;
                            type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            status: string | null;
                            tags: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            note: string | null;
                            location: unknown;
                            source: string | null;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            category: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            recurring: boolean | null;
                            pending: boolean | null;
                            paymentChannel: string | null;
                        }[];
                        id: string;
                        userId: string;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
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
                        plaidItemStatus: "active" | "error" | "pending_expiration" | "revoked" | null;
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
                        status: "active" | "error" | "pending_expiration" | "revoked";
                        lastSyncedAt: Date | null;
                        error: string | null;
                        createdAt: Date;
                    }[];
                };
                meta: object;
            }>;
        }>>;
        categories: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
            ctx: import("../src/procedures.js").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            connections: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/finance-services").InstitutionConnection[];
                meta: object;
            }>;
            accounts: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: import("@hominem/finance-services").InstitutionAccount[];
                meta: object;
            }>;
            institutionAccounts: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: import("@hominem/finance-services").InstitutionAccount[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    institutionId: string;
                };
                output: {
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
                } | undefined;
                meta: object;
            }>;
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: void;
                output: {
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
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
                    url: string | null;
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    logo: string | null;
                    primaryColor: string | null;
                    country: string | null;
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
                        userId: string;
                        id: string;
                        meta: unknown;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        createdAt: Date;
                        updatedAt: Date;
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        lastUpdated: Date | null;
                        institutionId: string | null;
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
                        userId: string;
                        id: string;
                        meta: unknown;
                        name: string;
                        type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        createdAt: Date;
                        updatedAt: Date;
                        balance: string;
                        interestRate: string | null;
                        minimumPayment: string | null;
                        mask: string | null;
                        isoCurrencyCode: string | null;
                        subtype: string | null;
                        officialName: string | null;
                        limit: string | null;
                        lastUpdated: Date | null;
                        institutionId: string | null;
                        plaidItemId: string | null;
                        plaidAccountId: string | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "credit" | "investment" | "checking" | "savings" | "loan" | "retirement" | "depository" | "brokerage" | "other";
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
                    date: Date;
                    type: 6 | "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | {
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                    } | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | {
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
                        (...items: ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment" | ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">)[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((start?: number, end?: number) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => boolean) | ((index: number) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | {
                        (): string;
                        (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                    } | ((index: number, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => string) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                        (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): this is S[];
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): boolean;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => void, thisArg?: any) => void) | (<U>(callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, thisArg?: any) => U[]) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S[];
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    } | {
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                    } | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "income" | "expense" | "credit" | "debit" | "transfer" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                        <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                        (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                    } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | {
                        (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                    };
                    amount: string;
                    accountId: string;
                    description?: string | null | undefined;
                    id?: string | undefined;
                    status?: string | null | undefined;
                    tags?: string | null | undefined;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    note?: string | null | undefined;
                    location?: unknown;
                    source?: string | null | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    category?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    pending?: boolean | null | undefined;
                    paymentChannel?: string | null | undefined;
                };
                output: {
                    userId: string;
                    description: string | null;
                    id: string;
                    date: Date;
                    type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                    status: string | null;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    note: string | null;
                    location: unknown;
                    source: string | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    pending: boolean | null;
                    paymentChannel: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        id?: string | undefined;
                        type?: 6 | "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | {
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                        } | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | {
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
                            (...items: ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment" | ConcatArray<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">)[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => number) | ((start?: number, end?: number) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((searchElement: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", fromIndex?: number) => boolean) | ((index: number) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | {
                            (): string;
                            (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
                        } | ((index: number, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => string) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | ((separator?: string) => string) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | (() => "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | {
                            (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | ((...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => number) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): this is S[];
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): boolean;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => boolean) | ((callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => void, thisArg?: any) => void) | (<U>(callbackfn: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, thisArg?: any) => U[]) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S[];
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | {
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            (callbackfn: (previousValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => "income" | "expense" | "credit" | "debit" | "transfer" | "investment", initialValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment"): "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                            <U>(callbackfn: (previousValue: U, currentValue: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", currentIndex: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U, initialValue: U): U;
                        } | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, obj: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | ((value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", start?: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | ((target: number, start: number, end?: number) => ["income", "expense", "credit", "debit", "transfer", "investment"]) | (() => ArrayIterator<[number, "income" | "expense" | "credit" | "debit" | "transfer" | "investment"]>) | (() => ArrayIterator<number>) | (() => ArrayIterator<"income" | "expense" | "credit" | "debit" | "transfer" | "investment">) | (<U, This = undefined>(callback: (this: This, value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => U | readonly U[], thisArg?: This | undefined) => U[]) | (<A, D extends number = 1>(this: A, depth?: D | undefined) => FlatArray<A, D>[]) | {
                            <S extends "income" | "expense" | "credit" | "debit" | "transfer" | "investment">(predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => value is S, thisArg?: any): S | undefined;
                            (predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any): "income" | "expense" | "credit" | "debit" | "transfer" | "investment" | undefined;
                        } | ((predicate: (value: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", index: number, array: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) => unknown, thisArg?: any) => number) | (() => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | ((compareFn?: ((a: "income" | "expense" | "credit" | "debit" | "transfer" | "investment", b: "income" | "expense" | "credit" | "debit" | "transfer" | "investment") => number) | undefined) => ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]) | {
                            (start: number, deleteCount: number, ...items: ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[]): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                            (start: number, deleteCount?: number): ("income" | "expense" | "credit" | "debit" | "transfer" | "investment")[];
                        } | undefined;
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
                    userId: string;
                    description: string | null;
                    id: string;
                    date: Date;
                    type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                    status: string | null;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    note: string | null;
                    location: unknown;
                    source: string | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
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
            ctx: import("../src/procedures.js").Context;
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
                    output: import("@hominem/finance-services").BudgetCategoryWithSpending[];
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
                        userId: string;
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        color: string | null;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
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
                output: import("@hominem/finance-services").BudgetTrackingData;
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
                        userId: string;
                        id: string;
                        name: string;
                        type: "income" | "expense";
                        color: string | null;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    }[];
                    created: number;
                    skipped: number;
                };
                meta: object;
            }>;
        }>>;
        analyze: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../src/procedures.js").Context;
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
                output: import("@hominem/finance-services").TimeSeriesResponse;
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
                output: import("@hominem/finance-services").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    from?: string | undefined;
                    to?: string | undefined;
                    account?: string | undefined;
                    limit?: string | undefined;
                };
                output: import("@hominem/finance-services").CategorySummary[];
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
            ctx: import("../src/procedures.js").Context;
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
                        userId: string;
                        description: string | null;
                        id: string;
                        date: Date;
                        type: "income" | "expense" | "credit" | "debit" | "transfer" | "investment";
                        status: string | null;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        note: string | null;
                        location: unknown;
                        source: string | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
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
            ctx: import("../src/procedures.js").Context;
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
            ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
        ctx: import("../src/procedures.js").Context;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    status?: "draft" | "posted" | "failed" | undefined;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    userId: string;
                    id: string;
                    title: string | null;
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
                    content: string;
                    tags: {
                        value: string;
                    }[] | null;
                    createdAt: string;
                    updatedAt: string;
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
                    status?: "draft" | "posted" | "failed" | undefined;
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
                    type: "note" | "task" | "timer" | "journal" | "document" | "tweet" | "essay" | "blog_post" | "social_post";
                    title: string | null;
                    content: string;
                    excerpt: string | null;
                    status: "archived" | "draft" | "failed" | "scheduled" | "published";
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
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
                userId: string;
                description: string | null;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
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
        ctx: import("../src/procedures.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getUserChats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            };
            output: {
                userId: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
            }[];
            meta: object;
        }>;
        getChatById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                chatId: string;
            };
            output: {
                messages: {
                    userId: string;
                    id: string;
                    content: string;
                    createdAt: string;
                    updatedAt: string;
                    role: import("@hominem/db/schema").ChatMessageRole;
                    chatId: string;
                    toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                    reasoning: string | null;
                    files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                    userId: string;
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
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
                    userId: string;
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
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
                        userId: string;
                        id: string;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        role: import("@hominem/db/schema").ChatMessageRole;
                        chatId: string;
                        toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                        reasoning: string | null;
                        files: import("@hominem/db/schema").ChatMessageFile[] | null;
                        parentMessageId: string | null;
                        messageIndex: string | null;
                    } | null;
                    assistant: {
                        userId: string;
                        id: string;
                        content: string;
                        createdAt: string;
                        updatedAt: string;
                        role: import("@hominem/db/schema").ChatMessageRole;
                        chatId: string;
                        toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                        reasoning: string | null;
                        files: import("@hominem/db/schema").ChatMessageFile[] | null;
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
                userId: string;
                id: string;
                content: string;
                createdAt: string;
                updatedAt: string;
                role: import("@hominem/db/schema").ChatMessageRole;
                chatId: string;
                toolCalls: import("@hominem/db/schema").ChatMessageToolCall[] | null;
                reasoning: string | null;
                files: import("@hominem/db/schema").ChatMessageFile[] | null;
                parentMessageId: string | null;
                messageIndex: string | null;
            }[];
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                description: string | null;
                url: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                image: string | null;
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
        ctx: import("../src/procedures.js").Context;
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
                userId: string;
                id: string;
                title: string | null;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                firstName: string;
                lastName: string | null;
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
//# sourceMappingURL=trpc-test-utils.d.ts.map