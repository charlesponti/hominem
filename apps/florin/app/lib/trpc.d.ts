import { QueryClient } from '@tanstack/react-query';
export declare const trpc: import("@trpc/react-query").CreateTRPCReactBase<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../../../api/src/trpc").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    goals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                category?: string | undefined;
                showArchived?: boolean | undefined;
                sortBy?: string | undefined;
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
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                title?: string | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
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
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                }[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    id: string;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                } | null;
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type: "checking" | "savings" | "investment" | "credit";
                    name: string;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    type?: "checking" | "savings" | "investment" | "credit" | undefined;
                    name?: string | undefined;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
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
                            note: string | null;
                            type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                            status: string | null;
                            date: Date;
                            id: string;
                            tags: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            description: string | null;
                            pending: boolean | null;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            location: unknown;
                            eventId: string | null;
                            investmentDetails: unknown;
                            category: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            recurring: boolean | null;
                            plaidTransactionId: string | null;
                            paymentChannel: string | null;
                            source: string | null;
                        }[];
                        id: string;
                        name: string;
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        balance: string;
                        mask: string | null;
                        subtype: string | null;
                        institutionId: string | null;
                        plaidItemId: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
            link: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    institutionId: string;
                    accountId: string;
                    plaidItemId?: string | undefined;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
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
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    search?: string | undefined;
                    description?: string | undefined;
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    offset?: number | undefined;
                    sortBy?: string | string[] | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    min?: string | undefined;
                    max?: string | undefined;
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
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                            balance: string;
                            interestRate: string | null;
                            minimumPayment: string | null;
                            name: string;
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
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    date: Date;
                    amount: string;
                    accountId: string;
                    note?: string | null | undefined;
                    status?: string | null | undefined;
                    id?: string | undefined;
                    tags?: string | null | undefined;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    description?: string | null | undefined;
                    pending?: boolean | null | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    location?: import("drizzle-zod").Json | undefined;
                    eventId?: string | null | undefined;
                    investmentDetails?: import("drizzle-zod").Json | undefined;
                    category?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    plaidTransactionId?: string | null | undefined;
                    paymentChannel?: string | null | undefined;
                    source?: string | null | undefined;
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        note?: string | null | undefined;
                        type?: "investment" | "credit" | "income" | "expense" | "debit" | "transfer" | undefined;
                        status?: string | null | undefined;
                        date?: Date | undefined;
                        id?: string | undefined;
                        tags?: string | null | undefined;
                        createdAt?: Date | undefined;
                        updatedAt?: Date | undefined;
                        userId?: string | undefined;
                        description?: string | null | undefined;
                        pending?: boolean | null | undefined;
                        amount?: string | undefined;
                        merchantName?: string | null | undefined;
                        accountId?: string | undefined;
                        fromAccountId?: string | null | undefined;
                        toAccountId?: string | null | undefined;
                        location?: import("drizzle-zod").Json | undefined;
                        eventId?: string | null | undefined;
                        investmentDetails?: import("drizzle-zod").Json | undefined;
                        category?: string | null | undefined;
                        parentCategory?: string | null | undefined;
                        excluded?: boolean | null | undefined;
                        accountMask?: string | null | undefined;
                        recurring?: boolean | null | undefined;
                        plaidTransactionId?: string | null | undefined;
                        paymentChannel?: string | null | undefined;
                        source?: string | null | undefined;
                    };
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            categories: {
                list: import("@trpc/server").TRPCQueryProcedure<{
                    input: void;
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    }[];
                    meta: object;
                }>;
                get: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                create: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        type: "income" | "expense";
                        name: string;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                update: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                        type?: "income" | "expense" | undefined;
                        name?: string | undefined;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
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
                        amount: number;
                        category: string;
                    }[];
                } | undefined;
                output: {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        amount: number;
                        category: string;
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
                }[];
                meta: object;
            }>;
            bulkCreateFromTransactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    categories: {
                        type: "income" | "expense";
                        name: string;
                        allocatedAmount?: number | undefined;
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
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            spendingTimeSeries: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    groupBy?: "month" | "week" | "day" | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    includeStats?: boolean | undefined;
                    compareToPrevious?: boolean | undefined;
                };
                output: import("node_modules/@hominem/utils/src/finance/finance-analyze.service").TimeSeriesResponse;
                meta: object;
            }>;
            topMerchants: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").CategorySummary[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type?: "income" | "expense" | undefined;
                    category?: string | undefined;
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            transactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        note: string | null;
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        status: string | null;
                        date: Date;
                        id: string;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        description: string | null;
                        pending: boolean | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        location: unknown;
                        eventId: string | null;
                        investmentDetails: unknown;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        recurring: boolean | null;
                        plaidTransactionId: string | null;
                        paymentChannel: string | null;
                        source: string | null;
                    }[];
                    filename: string;
                };
                meta: object;
            }>;
            summary: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
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
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        uploadCsv: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                indexName: string;
            };
            output: {
                success: boolean;
                recordsProcessed: number;
                filePath: string;
                message: string;
            };
            meta: object;
        }>;
        query: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                indexName: string;
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
        ingestMarkdown: import("@trpc/server").TRPCMutationProcedure<{
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
        searchUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
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
        getUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                documents: {
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
        deleteUserDocuments: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source?: string | undefined;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        getUserFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                indexName?: string | undefined;
            };
            output: {
                files: unknown[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                filePath: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
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
                url: string;
                id: string;
                title: string;
                image: string | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
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
                url: string;
                id: string;
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
}>>, unknown> & import("node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs").DecorateRouterRecord<{
    ctx: import("../../../api/src/trpc").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    goals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                category?: string | undefined;
                showArchived?: boolean | undefined;
                sortBy?: string | undefined;
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
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                title?: string | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
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
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                }[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    id: string;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                } | null;
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type: "checking" | "savings" | "investment" | "credit";
                    name: string;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    type?: "checking" | "savings" | "investment" | "credit" | undefined;
                    name?: string | undefined;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
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
                            note: string | null;
                            type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                            status: string | null;
                            date: Date;
                            id: string;
                            tags: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            description: string | null;
                            pending: boolean | null;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            location: unknown;
                            eventId: string | null;
                            investmentDetails: unknown;
                            category: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            recurring: boolean | null;
                            plaidTransactionId: string | null;
                            paymentChannel: string | null;
                            source: string | null;
                        }[];
                        id: string;
                        name: string;
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        balance: string;
                        mask: string | null;
                        subtype: string | null;
                        institutionId: string | null;
                        plaidItemId: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
            link: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    institutionId: string;
                    accountId: string;
                    plaidItemId?: string | undefined;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
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
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    search?: string | undefined;
                    description?: string | undefined;
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    offset?: number | undefined;
                    sortBy?: string | string[] | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    min?: string | undefined;
                    max?: string | undefined;
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
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                            balance: string;
                            interestRate: string | null;
                            minimumPayment: string | null;
                            name: string;
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
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    date: Date;
                    amount: string;
                    accountId: string;
                    note?: string | null | undefined;
                    status?: string | null | undefined;
                    id?: string | undefined;
                    tags?: string | null | undefined;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    description?: string | null | undefined;
                    pending?: boolean | null | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    location?: import("drizzle-zod").Json | undefined;
                    eventId?: string | null | undefined;
                    investmentDetails?: import("drizzle-zod").Json | undefined;
                    category?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    plaidTransactionId?: string | null | undefined;
                    paymentChannel?: string | null | undefined;
                    source?: string | null | undefined;
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        note?: string | null | undefined;
                        type?: "investment" | "credit" | "income" | "expense" | "debit" | "transfer" | undefined;
                        status?: string | null | undefined;
                        date?: Date | undefined;
                        id?: string | undefined;
                        tags?: string | null | undefined;
                        createdAt?: Date | undefined;
                        updatedAt?: Date | undefined;
                        userId?: string | undefined;
                        description?: string | null | undefined;
                        pending?: boolean | null | undefined;
                        amount?: string | undefined;
                        merchantName?: string | null | undefined;
                        accountId?: string | undefined;
                        fromAccountId?: string | null | undefined;
                        toAccountId?: string | null | undefined;
                        location?: import("drizzle-zod").Json | undefined;
                        eventId?: string | null | undefined;
                        investmentDetails?: import("drizzle-zod").Json | undefined;
                        category?: string | null | undefined;
                        parentCategory?: string | null | undefined;
                        excluded?: boolean | null | undefined;
                        accountMask?: string | null | undefined;
                        recurring?: boolean | null | undefined;
                        plaidTransactionId?: string | null | undefined;
                        paymentChannel?: string | null | undefined;
                        source?: string | null | undefined;
                    };
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            categories: {
                list: import("@trpc/server").TRPCQueryProcedure<{
                    input: void;
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    }[];
                    meta: object;
                }>;
                get: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                create: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        type: "income" | "expense";
                        name: string;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                update: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                        type?: "income" | "expense" | undefined;
                        name?: string | undefined;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
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
                        amount: number;
                        category: string;
                    }[];
                } | undefined;
                output: {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        amount: number;
                        category: string;
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
                }[];
                meta: object;
            }>;
            bulkCreateFromTransactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    categories: {
                        type: "income" | "expense";
                        name: string;
                        allocatedAmount?: number | undefined;
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
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            spendingTimeSeries: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    groupBy?: "month" | "week" | "day" | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    includeStats?: boolean | undefined;
                    compareToPrevious?: boolean | undefined;
                };
                output: import("node_modules/@hominem/utils/src/finance/finance-analyze.service").TimeSeriesResponse;
                meta: object;
            }>;
            topMerchants: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").CategorySummary[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type?: "income" | "expense" | undefined;
                    category?: string | undefined;
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            transactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        note: string | null;
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        status: string | null;
                        date: Date;
                        id: string;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        description: string | null;
                        pending: boolean | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        location: unknown;
                        eventId: string | null;
                        investmentDetails: unknown;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        recurring: boolean | null;
                        plaidTransactionId: string | null;
                        paymentChannel: string | null;
                        source: string | null;
                    }[];
                    filename: string;
                };
                meta: object;
            }>;
            summary: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
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
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        uploadCsv: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                indexName: string;
            };
            output: {
                success: boolean;
                recordsProcessed: number;
                filePath: string;
                message: string;
            };
            meta: object;
        }>;
        query: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                indexName: string;
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
        ingestMarkdown: import("@trpc/server").TRPCMutationProcedure<{
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
        searchUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
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
        getUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                documents: {
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
        deleteUserDocuments: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source?: string | undefined;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        getUserFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                indexName?: string | undefined;
            };
            output: {
                files: unknown[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                filePath: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
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
                url: string;
                id: string;
                title: string;
                image: string | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
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
                url: string;
                id: string;
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
}>>;
export declare const queryClient: QueryClient;
export declare const trpcClient: import("@trpc/client").TRPCClient<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../../../api/src/trpc").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    goals: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                category?: string | undefined;
                showArchived?: boolean | undefined;
                sortBy?: string | undefined;
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
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
                startDate?: string | undefined;
                dueDate?: string | undefined;
                milestones?: {
                    description: string;
                    completed?: boolean | undefined;
                }[] | undefined;
            };
            output: {
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                status?: "archived" | "todo" | "in_progress" | "completed" | undefined;
                title?: string | undefined;
                description?: string | undefined;
                priority?: number | undefined;
                goalCategory?: string | undefined;
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
                status: string;
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
                priority: number | null;
                goalCategory: string | null;
                startDate: string | null;
                dueDate: string | null;
                milestones: {
                    description: string;
                    completed: boolean;
                }[] | null;
            };
            meta: object;
        }>;
    }>>;
    finance: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        accounts: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    includeInactive?: boolean | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                }[];
                meta: object;
            }>;
            get: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    id: string;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                } | null;
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type: "checking" | "savings" | "investment" | "credit";
                    name: string;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    type?: "checking" | "savings" | "investment" | "credit" | undefined;
                    name?: string | undefined;
                    balance?: number | undefined;
                    institution?: string | undefined;
                };
                output: {
                    type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    meta: unknown;
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
                    lastUpdated: Date | null;
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
                            note: string | null;
                            type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                            status: string | null;
                            date: Date;
                            id: string;
                            tags: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            description: string | null;
                            pending: boolean | null;
                            amount: string;
                            merchantName: string | null;
                            accountId: string;
                            fromAccountId: string | null;
                            toAccountId: string | null;
                            location: unknown;
                            eventId: string | null;
                            investmentDetails: unknown;
                            category: string | null;
                            parentCategory: string | null;
                            excluded: boolean | null;
                            accountMask: string | null;
                            recurring: boolean | null;
                            plaidTransactionId: string | null;
                            paymentChannel: string | null;
                            source: string | null;
                        }[];
                        id: string;
                        name: string;
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        balance: string;
                        mask: string | null;
                        subtype: string | null;
                        institutionId: string | null;
                        plaidItemId: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
            link: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    institutionId: string;
                    accountId: string;
                    plaidItemId?: string | undefined;
                };
                output: {
                    success: boolean;
                    message: string;
                    account: {
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
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
                        type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        meta: unknown;
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
                        lastUpdated: Date | null;
                    };
                };
                meta: object;
            }>;
        }>>;
        transactions: import("@trpc/server").TRPCBuiltRouter<{
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            list: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    search?: string | undefined;
                    description?: string | undefined;
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    offset?: number | undefined;
                    sortBy?: string | string[] | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    min?: string | undefined;
                    max?: string | undefined;
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
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        accountMask: string | null;
                        note: string | null;
                        accountId: string;
                        account: {
                            id: string;
                            type: "checking" | "savings" | "investment" | "credit" | "loan" | "retirement" | "depository" | "brokerage" | "other";
                            balance: string;
                            interestRate: string | null;
                            minimumPayment: string | null;
                            name: string;
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
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    date: Date;
                    amount: string;
                    accountId: string;
                    note?: string | null | undefined;
                    status?: string | null | undefined;
                    id?: string | undefined;
                    tags?: string | null | undefined;
                    createdAt?: Date | undefined;
                    updatedAt?: Date | undefined;
                    description?: string | null | undefined;
                    pending?: boolean | null | undefined;
                    merchantName?: string | null | undefined;
                    fromAccountId?: string | null | undefined;
                    toAccountId?: string | null | undefined;
                    location?: import("drizzle-zod").Json | undefined;
                    eventId?: string | null | undefined;
                    investmentDetails?: import("drizzle-zod").Json | undefined;
                    category?: string | null | undefined;
                    parentCategory?: string | null | undefined;
                    excluded?: boolean | null | undefined;
                    accountMask?: string | null | undefined;
                    recurring?: boolean | null | undefined;
                    plaidTransactionId?: string | null | undefined;
                    paymentChannel?: string | null | undefined;
                    source?: string | null | undefined;
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
                };
                meta: object;
            }>;
            update: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    id: string;
                    data: {
                        note?: string | null | undefined;
                        type?: "investment" | "credit" | "income" | "expense" | "debit" | "transfer" | undefined;
                        status?: string | null | undefined;
                        date?: Date | undefined;
                        id?: string | undefined;
                        tags?: string | null | undefined;
                        createdAt?: Date | undefined;
                        updatedAt?: Date | undefined;
                        userId?: string | undefined;
                        description?: string | null | undefined;
                        pending?: boolean | null | undefined;
                        amount?: string | undefined;
                        merchantName?: string | null | undefined;
                        accountId?: string | undefined;
                        fromAccountId?: string | null | undefined;
                        toAccountId?: string | null | undefined;
                        location?: import("drizzle-zod").Json | undefined;
                        eventId?: string | null | undefined;
                        investmentDetails?: import("drizzle-zod").Json | undefined;
                        category?: string | null | undefined;
                        parentCategory?: string | null | undefined;
                        excluded?: boolean | null | undefined;
                        accountMask?: string | null | undefined;
                        recurring?: boolean | null | undefined;
                        plaidTransactionId?: string | null | undefined;
                        paymentChannel?: string | null | undefined;
                        source?: string | null | undefined;
                    };
                };
                output: {
                    note: string | null;
                    type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                    status: string | null;
                    date: Date;
                    id: string;
                    tags: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    description: string | null;
                    pending: boolean | null;
                    amount: string;
                    merchantName: string | null;
                    accountId: string;
                    fromAccountId: string | null;
                    toAccountId: string | null;
                    location: unknown;
                    eventId: string | null;
                    investmentDetails: unknown;
                    category: string | null;
                    parentCategory: string | null;
                    excluded: boolean | null;
                    accountMask: string | null;
                    recurring: boolean | null;
                    plaidTransactionId: string | null;
                    paymentChannel: string | null;
                    source: string | null;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            categories: {
                list: import("@trpc/server").TRPCQueryProcedure<{
                    input: void;
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    }[];
                    meta: object;
                }>;
                get: import("@trpc/server").TRPCQueryProcedure<{
                    input: {
                        id: string;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                create: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        type: "income" | "expense";
                        name: string;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
                    };
                    meta: object;
                }>;
                update: import("@trpc/server").TRPCMutationProcedure<{
                    input: {
                        id: string;
                        type?: "income" | "expense" | undefined;
                        name?: string | undefined;
                        budgetId?: string | undefined;
                        allocatedAmount?: number | undefined;
                    };
                    output: {
                        id: string;
                        name: string;
                        type: string;
                        budgetId: string | null;
                        averageMonthlyExpense: string | null;
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
                        amount: number;
                        category: string;
                    }[];
                } | undefined;
                output: {
                    income: number;
                    totalExpenses: number;
                    surplus: number;
                    savingsRate: number;
                    categories: {
                        percentage: number;
                        amount: number;
                        category: string;
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
                }[];
                meta: object;
            }>;
            bulkCreateFromTransactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    categories: {
                        type: "income" | "expense";
                        name: string;
                        allocatedAmount?: number | undefined;
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
                        type: string;
                        id: string;
                        name: string;
                        userId: string;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            spendingTimeSeries: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    groupBy?: "month" | "week" | "day" | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                    includeStats?: boolean | undefined;
                    compareToPrevious?: boolean | undefined;
                };
                output: import("node_modules/@hominem/utils/src/finance/finance-analyze.service").TimeSeriesResponse;
                meta: object;
            }>;
            topMerchants: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: number | undefined;
                    category?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").TopMerchant[];
                meta: object;
            }>;
            categoryBreakdown: import("@trpc/server").TRPCQueryProcedure<{
                input: {
                    limit?: string | undefined;
                    account?: string | undefined;
                    from?: string | undefined;
                    to?: string | undefined;
                };
                output: import("@hominem/utils/types").CategorySummary[];
                meta: object;
            }>;
            calculate: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    type?: "income" | "expense" | undefined;
                    category?: string | undefined;
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
            meta: object;
            errorShape: import("@trpc/server").TRPCDefaultErrorShape;
            transformer: false;
        }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
            transactions: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
                };
                output: {
                    format: string;
                    data: string;
                    filename: string;
                } | {
                    format: string;
                    data: {
                        note: string | null;
                        type: "investment" | "credit" | "income" | "expense" | "debit" | "transfer";
                        status: string | null;
                        date: Date;
                        id: string;
                        tags: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        description: string | null;
                        pending: boolean | null;
                        amount: string;
                        merchantName: string | null;
                        accountId: string;
                        fromAccountId: string | null;
                        toAccountId: string | null;
                        location: unknown;
                        eventId: string | null;
                        investmentDetails: unknown;
                        category: string | null;
                        parentCategory: string | null;
                        excluded: boolean | null;
                        accountMask: string | null;
                        recurring: boolean | null;
                        plaidTransactionId: string | null;
                        paymentChannel: string | null;
                        source: string | null;
                    }[];
                    filename: string;
                };
                meta: object;
            }>;
            summary: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    format: "json" | "csv";
                    startDate?: string | undefined;
                    accounts?: string[] | undefined;
                    categories?: string[] | undefined;
                    endDate?: string | undefined;
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
            ctx: import("../../../api/src/trpc").Context;
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
    }>>;
    vector: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        uploadCsv: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                indexName: string;
            };
            output: {
                success: boolean;
                recordsProcessed: number;
                filePath: string;
                message: string;
            };
            meta: object;
        }>;
        query: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                indexName: string;
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
        ingestMarkdown: import("@trpc/server").TRPCMutationProcedure<{
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
        searchUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
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
        getUserDocuments: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                documents: {
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
        deleteUserDocuments: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                source?: string | undefined;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        getUserFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                indexName?: string | undefined;
            };
            output: {
                files: unknown[];
                count: number;
            };
            meta: object;
        }>;
        deleteUserFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                filePath: string;
            };
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
    }>>;
    bookmarks: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../../../api/src/trpc").Context;
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
                url: string;
                id: string;
                title: string;
                image: string | null;
                createdAt: string;
                updatedAt: string;
                userId: string;
                description: string | null;
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
                url: string;
                id: string;
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
}>>>;
