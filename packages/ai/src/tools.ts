import { tool } from 'ai'
import { z } from 'zod'

/*********************
 * GENERAL TOOLS
 *********************/

const CalculatorToolSchema = z.object({
  calculations: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      action: z.enum(['add', 'subtract', 'multiply', 'divide']),
      order: z.number(),
    })
  ),
})
// Define tools for the agent to use
export const calculatorTool = tool({
  description: 'A calculator tool that can evaluate mathematical expressions',
  parameters: CalculatorToolSchema,
  execute: async ({ calculations }: z.infer<typeof CalculatorToolSchema>): Promise<number> => {
    let result = 0
    const sortedCalculations = calculations.sort((a, b) => a.order - b.order)

    try {
      for (const calculation of sortedCalculations) {
        const { x, y, action } = calculation
        switch (action) {
          case 'add':
            result = x + y
            break
          case 'subtract':
            result = x - y
            break
          case 'multiply':
            result = x * y
            break
          case 'divide':
            if (y === 0) {
              throw new Error('Division by zero is not allowed')
            }
            result = x / y
            break
        }
      }
      return result
    } catch (error) {
      throw new Error(`Error in calculation: ${error}`)
    }
  },
})

export const searchTool = tool({
  description: 'Search the web for information',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }: { query: string }): Promise<string> => {
    // This is a placeholder. In a real app, you'd implement a proper search API call
    return `Search results for: ${query}. (This is a placeholder for SERP API results)`
  },
})

export const chat = tool({
  description: 'Chat with the user',
  parameters: z.object({
    message: z.string().describe('User message'),
  }),
  async execute(args: { message: string }) {
    return { message: `Chat response: ${args.message}` }
  },
})

/*********************
 * LOCATION TOOLS
 *********************/

export const get_location_info = tool({
  description: 'Get information about a city or location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Information about ${location}`
  },
})

export const get_driving_directions = tool({
  description: 'Get driving directions to a location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Driving directions to ${location}`
  },
})

export const get_weather = tool({
  description: 'Get the current weather in a location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Current weather in ${location}`
  },
})

/*********************
 * TASK MANAGEMENT TOOLS
 *********************/

export const create_tasks = tool({
  description: 'Create a list of tasks',
  parameters: z.object({
    tasks: z.array(z.string()).describe('List of tasks to create'),
  }),
  async execute(args: { tasks: string[] }) {
    return {
      message: `Created tasks: ${args.tasks.join(', ')}`,
    }
  },
})

export const edit_tasks = tool({
  description: 'Edit an existing task',
  parameters: z.object({
    taskId: z.string().describe('ID of the task to edit'),
    updates: z.record(z.any()).describe('Updates to apply to the task'),
  }),
  async execute(args: { taskId: string; updates: object }) {
    return {
      message: `Edited task ${args.taskId} with updates: ${JSON.stringify(args.updates)}`,
    }
  },
})

export const search_tasks = tool({
  description: 'Search for tasks',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  async execute(args: { query: string }) {
    return {
      message: `Searched for tasks with query: ${args.query}`,
    }
  },
})

/*********************
 * USER MANAGEMENT TOOLS
 *********************/

export const get_user_profile = tool({
  description: 'Get the user profile information',
  parameters: z.object({
    userId: z.string().optional().describe('User ID (defaults to current user if not provided)'),
  }),
  async execute(args: { userId?: string }) {
    return {
      message: `Retrieved profile for user ${args.userId || 'current user'}`,
    }
  },
})

export const update_user_profile = tool({
  description: 'Update user profile information',
  parameters: z.object({
    name: z.string().optional().describe('User name'),
    email: z.string().email().optional().describe('User email'),
    photo_url: z.string().url().optional().describe('Profile photo URL'),
    birthday: z.string().optional().describe('User birthday'),
  }),
  async execute(args) {
    return {
      message: `Updated user profile with: ${JSON.stringify(args)}`,
    }
  },
})

/*********************
 * CHAT MANAGEMENT TOOLS
 *********************/

export const create_chat = tool({
  description: 'Create a new chat conversation',
  parameters: z.object({
    title: z.string().describe('Title for the chat'),
  }),
  async execute(args: { title: string }) {
    return {
      message: `Created new chat: ${args.title}`,
    }
  },
})

export const list_chats = tool({
  description: 'List all chat conversations',
  parameters: z.object({}),
  async execute() {
    return {
      message: 'Listed all chats',
    }
  },
})

export const update_chat = tool({
  description: 'Update a chat conversation',
  parameters: z.object({
    chatId: z.string().describe('ID of the chat to update'),
    title: z.string().describe('New title for the chat'),
  }),
  async execute(args: { chatId: string; title: string }) {
    return {
      message: `Updated chat ${args.chatId} with title: ${args.title}`,
    }
  },
})

export const delete_chat = tool({
  description: 'Delete a chat conversation',
  parameters: z.object({
    chatId: z.string().describe('ID of the chat to delete'),
  }),
  async execute(args: { chatId: string }) {
    return {
      message: `Deleted chat ${args.chatId}`,
    }
  },
})

/*********************
 * NOTES MANAGEMENT TOOLS
 *********************/

export const create_note = tool({
  description: 'Create a new note',
  parameters: z.object({
    title: z.string().describe('Title of the note'),
    content: z.string().describe('Content of the note'),
    tags: z.array(z.string()).optional().describe('Tags for the note'),
  }),
  async execute(args: { title: string; content: string; tags?: string[] }) {
    return {
      message: `Created note: ${args.title} with ${args.tags?.length || 0} tags`,
    }
  },
})

export const get_notes = tool({
  description: 'Get all notes or search for specific notes',
  parameters: z.object({
    query: z.string().optional().describe('Search query for notes'),
    tags: z.array(z.string()).optional().describe('Filter notes by tags'),
  }),
  async execute(args: { query?: string; tags?: string[] }) {
    return {
      message: `Retrieved notes with query: ${args.query || 'all'} and tags: ${
        args.tags?.join(', ') || 'none'
      }`,
    }
  },
})

export const update_note = tool({
  description: 'Update an existing note',
  parameters: z.object({
    noteId: z.string().describe('ID of the note to update'),
    title: z.string().optional().describe('New title of the note'),
    content: z.string().optional().describe('New content of the note'),
    tags: z.array(z.string()).optional().describe('New tags for the note'),
  }),
  async execute(args: { noteId: string; title?: string; content?: string; tags?: string[] }) {
    return {
      message: `Updated note ${args.noteId}`,
    }
  },
})

export const delete_note = tool({
  description: 'Delete a note',
  parameters: z.object({
    noteId: z.string().describe('ID of the note to delete'),
  }),
  async execute(args: { noteId: string }) {
    return {
      message: `Deleted note ${args.noteId}`,
    }
  },
})

/*********************
 * JOB APPLICATION TOOLS
 *********************/

export const create_job_application = tool({
  description: 'Create a new job application',
  parameters: z.object({
    position: z.string().describe('Job position title'),
    company: z.string().describe('Company name'),
    location: z.string().describe('Job location'),
    link: z.string().optional().describe('Link to job posting'),
    salary_quoted: z.string().optional().describe('Quoted salary information'),
    resume: z.string().optional().describe('Resume information'),
    cover_letter: z.string().optional().describe('Cover letter information'),
  }),
  async execute(args) {
    return {
      message: `Created job application for ${args.position} at ${args.company}`,
    }
  },
})

export const update_job_application = tool({
  description: 'Update a job application',
  parameters: z.object({
    applicationId: z.string().describe('ID of the job application'),
    status: z
      .enum(['Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer'])
      .optional()
      .describe('Application status'),
    stage: z
      .enum([
        'Application',
        'Phone Screen',
        'Technical Screen (Call)',
        'Technical Screen (Exercise)',
        'Interview',
        'In Person',
        'Offer',
      ])
      .optional()
      .describe('Current application stage'),
    salary_accepted: z.string().optional().describe('Accepted salary'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  async execute(args) {
    return {
      message: `Updated job application ${args.applicationId}`,
    }
  },
})

export const get_job_applications = tool({
  description: 'Get job applications',
  parameters: z.object({
    status: z
      .enum(['Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer'])
      .optional()
      .describe('Filter by application status'),
    company: z.string().optional().describe('Filter by company name'),
  }),
  async execute(args) {
    return {
      message: `Retrieved job applications${args.status ? ` with status ${args.status}` : ''}${
        args.company ? ` at ${args.company}` : ''
      }`,
    }
  },
})

export const delete_job_application = tool({
  description: 'Delete a job application',
  parameters: z.object({
    applicationId: z.string().describe('ID of the job application to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted job application ${args.applicationId}`,
    }
  },
})

/*********************
 * BOOKMARK TOOLS
 *********************/

export const create_bookmark = tool({
  description: 'Create a new bookmark',
  parameters: z.object({
    url: z.string().url().describe('URL to bookmark'),
    title: z.string().describe('Title of the bookmark'),
    description: z.string().optional().describe('Description of the bookmark'),
    siteName: z.string().describe('Name of the website'),
  }),
  async execute(args) {
    return {
      message: `Created bookmark: ${args.title} (${args.url})`,
    }
  },
})

export const get_bookmarks = tool({
  description: 'Get all bookmarks or search for specific bookmarks',
  parameters: z.object({
    query: z.string().optional().describe('Search query for bookmarks'),
    siteName: z.string().optional().describe('Filter by website name'),
  }),
  async execute(args) {
    return {
      message: `Retrieved bookmarks${args.query ? ` with query: ${args.query}` : ''}${
        args.siteName ? ` from ${args.siteName}` : ''
      }`,
    }
  },
})

export const update_bookmark = tool({
  description: 'Update a bookmark',
  parameters: z.object({
    bookmarkId: z.string().describe('ID of the bookmark to update'),
    title: z.string().optional().describe('New title for the bookmark'),
    description: z.string().optional().describe('New description for the bookmark'),
  }),
  async execute(args) {
    return {
      message: `Updated bookmark ${args.bookmarkId}`,
    }
  },
})

export const delete_bookmark = tool({
  description: 'Delete a bookmark',
  parameters: z.object({
    bookmarkId: z.string().describe('ID of the bookmark to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted bookmark ${args.bookmarkId}`,
    }
  },
})

/*********************
 * LIST MANAGEMENT TOOLS
 *********************/

export const create_list = tool({
  description: 'Create a new list',
  parameters: z.object({
    name: z.string().describe('Name of the list'),
    description: z.string().optional().describe('Description of the list'),
  }),
  async execute(args) {
    return {
      message: `Created list: ${args.name}`,
    }
  },
})

export const get_lists = tool({
  description: 'Get all lists',
  parameters: z.object({}),
  async execute() {
    return {
      message: 'Retrieved all lists',
    }
  },
})

export const update_list = tool({
  description: 'Update a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list to update'),
    name: z.string().optional().describe('New name for the list'),
    description: z.string().optional().describe('New description for the list'),
  }),
  async execute(args) {
    return {
      message: `Updated list ${args.listId}`,
    }
  },
})

export const delete_list = tool({
  description: 'Delete a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted list ${args.listId}`,
    }
  },
})

export const invite_to_list = tool({
  description: 'Invite a user to a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list'),
    email: z.string().email().describe('Email of the user to invite'),
  }),
  async execute(args) {
    return {
      message: `Invited ${args.email} to list ${args.listId}`,
    }
  },
})

export const accept_list_invite = tool({
  description: 'Accept an invitation to a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list'),
    invitedUserEmail: z.string().email().describe('Email of the invited user'),
  }),
  async execute(args) {
    return {
      message: `Accepted invitation to list ${args.listId} for ${args.invitedUserEmail}`,
    }
  },
})

/*********************
 * PLACE MANAGEMENT TOOLS
 *********************/

export const create_place = tool({
  description: 'Create a new place',
  parameters: z.object({
    name: z.string().describe('Name of the place'),
    description: z.string().optional().describe('Description of the place'),
    address: z.string().optional().describe('Address of the place'),
    latitude: z.number().describe('Latitude coordinate'),
    longitude: z.number().describe('Longitude coordinate'),
    types: z.array(z.string()).optional().describe('Types/categories of the place'),
    isPublic: z.boolean().optional().describe('Whether the place is public'),
    bestFor: z.string().optional().describe('What the place is best for (e.g., "breakfast")'),
    wifiInfo: z
      .object({
        network: z.string(),
        password: z.string(),
      })
      .optional()
      .describe('WiFi information for the place'),
  }),
  async execute(args) {
    return {
      message: `Created place: ${args.name} at (${args.latitude}, ${args.longitude})`,
    }
  },
})

export const get_places = tool({
  description: 'Get all places or search for specific places',
  parameters: z.object({
    query: z.string().optional().describe('Search query for places'),
    types: z.array(z.string()).optional().describe('Filter by place types'),
    bestFor: z.string().optional().describe('Filter by what the place is best for'),
    nearby: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number(),
      })
      .optional()
      .describe('Find places near a location'),
  }),
  async execute(args) {
    return {
      message: `Retrieved places${args.query ? ` with query: ${args.query}` : ''}${
        args.types ? ` of types: ${args.types.join(', ')}` : ''
      }${args.bestFor ? ` best for: ${args.bestFor}` : ''}${
        args.nearby ? ` near (${args.nearby.latitude}, ${args.nearby.longitude})` : ''
      }`,
    }
  },
})

export const update_place = tool({
  description: 'Update a place',
  parameters: z.object({
    placeId: z.string().describe('ID of the place to update'),
    name: z.string().optional().describe('New name for the place'),
    description: z.string().optional().describe('New description for the place'),
    address: z.string().optional().describe('New address for the place'),
    isPublic: z.boolean().optional().describe('Whether the place is public'),
    bestFor: z.string().optional().describe('What the place is best for'),
    wifiInfo: z
      .object({
        network: z.string(),
        password: z.string(),
      })
      .optional()
      .describe('WiFi information for the place'),
  }),
  async execute(args) {
    return {
      message: `Updated place ${args.placeId}`,
    }
  },
})

export const delete_place = tool({
  description: 'Delete a place',
  parameters: z.object({
    placeId: z.string().describe('ID of the place to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted place ${args.placeId}`,
    }
  },
})

/*********************
 * HEALTH TRACKING TOOLS
 *********************/

export const log_health_activity = tool({
  description: 'Log a health activity',
  parameters: z.object({
    activityType: z.string().describe('Type of activity (e.g., "running", "cycling")'),
    duration: z.number().describe('Duration of activity in minutes'),
    caloriesBurned: z.number().describe('Calories burned during activity'),
    date: z.string().describe('Date of activity (YYYY-MM-DD)'),
    notes: z.string().optional().describe('Additional notes about the activity'),
  }),
  async execute(args) {
    return {
      message: `Logged ${args.activityType} activity for ${args.duration} minutes on ${args.date}`,
    }
  },
})

export const get_health_activities = tool({
  description: 'Get health activities',
  parameters: z.object({
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    activityType: z.string().optional().describe('Filter by activity type'),
  }),
  async execute(args) {
    return {
      message: `Retrieved health activities${
        args.startDate ? ` from ${args.startDate}` : ''
      }${args.endDate ? ` to ${args.endDate}` : ''}${
        args.activityType ? ` of type: ${args.activityType}` : ''
      }`,
    }
  },
})

export const update_health_activity = tool({
  description: 'Update a health activity',
  parameters: z.object({
    activityId: z.string().describe('ID of the activity to update'),
    activityType: z.string().optional().describe('New type of activity'),
    duration: z.number().optional().describe('New duration in minutes'),
    caloriesBurned: z.number().optional().describe('New calories burned'),
    notes: z.string().optional().describe('New notes'),
  }),
  async execute(args) {
    return {
      message: `Updated health activity ${args.activityId}`,
    }
  },
})

export const delete_health_activity = tool({
  description: 'Delete a health activity',
  parameters: z.object({
    activityId: z.string().describe('ID of the activity to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted health activity ${args.activityId}`,
    }
  },
})

/*********************
 * FINANCE TOOLS
 *********************/

export const create_finance_account = tool({
  description: 'Create a new finance account',
  parameters: z.object({
    name: z.string().describe('Name of the account'),
    type: z
      .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
      .describe('Type of account'),
    balance: z.number().describe('Initial balance'),
    interestRate: z.number().optional().describe('Interest rate (if applicable)'),
    minimumPayment: z.number().optional().describe('Minimum payment (if applicable)'),
  }),
  async execute(args) {
    return {
      message: `Created ${args.type} account: ${args.name} with balance ${args.balance}`,
    }
  },
})

export const get_finance_accounts = tool({
  description: 'Get all finance accounts',
  parameters: z.object({
    type: z
      .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
      .optional()
      .describe('Filter by account type'),
  }),
  async execute(args) {
    return {
      message: `Retrieved finance accounts${args.type ? ` of type: ${args.type}` : ''}`,
    }
  },
})

export const update_finance_account = tool({
  description: 'Update a finance account',
  parameters: z.object({
    accountId: z.string().describe('ID of the account to update'),
    name: z.string().optional().describe('New name for the account'),
    balance: z.number().optional().describe('New balance'),
    interestRate: z.number().optional().describe('New interest rate'),
    minimumPayment: z.number().optional().describe('New minimum payment'),
  }),
  async execute(args) {
    return {
      message: `Updated finance account ${args.accountId}`,
    }
  },
})

export const delete_finance_account = tool({
  description: 'Delete a finance account',
  parameters: z.object({
    accountId: z.string().describe('ID of the account to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted finance account ${args.accountId}`,
    }
  },
})

export const create_transaction = tool({
  description: 'Create a new financial transaction',
  parameters: z.object({
    type: z
      .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
      .describe('Type of transaction'),
    amount: z.number().describe('Transaction amount'),
    date: z.string().describe('Transaction date (YYYY-MM-DD)'),
    description: z.string().optional().describe('Transaction description'),
    fromAccountId: z.string().optional().describe('Source account ID (for transfers)'),
    toAccountId: z.string().optional().describe('Destination account ID (for transfers)'),
    category: z.string().optional().describe('Transaction category'),
    parentCategory: z.string().optional().describe('Parent category'),
    notes: z.string().optional().describe('Additional notes'),
    recurring: z.boolean().optional().describe('Whether this is a recurring transaction'),
  }),
  async execute(args) {
    return {
      message: `Created ${args.type} transaction for ${args.amount} on ${args.date}`,
    }
  },
})

export const get_transactions = tool({
  description: 'Get financial transactions',
  parameters: z.object({
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    type: z
      .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
      .optional()
      .describe('Filter by transaction type'),
    category: z.string().optional().describe('Filter by category'),
    accountId: z.string().optional().describe('Filter by account ID'),
    minAmount: z.number().optional().describe('Minimum transaction amount'),
    maxAmount: z.number().optional().describe('Maximum transaction amount'),
  }),
  async execute(args) {
    return {
      message: `Retrieved transactions${args.startDate ? ` from ${args.startDate}` : ''}${
        args.endDate ? ` to ${args.endDate}` : ''
      }${args.type ? ` of type: ${args.type}` : ''}${
        args.category ? ` in category: ${args.category}` : ''
      }`,
    }
  },
})

export const update_transaction = tool({
  description: 'Update a financial transaction',
  parameters: z.object({
    transactionId: z.string().describe('ID of the transaction to update'),
    amount: z.number().optional().describe('New transaction amount'),
    date: z.string().optional().describe('New transaction date'),
    description: z.string().optional().describe('New description'),
    category: z.string().optional().describe('New category'),
    parentCategory: z.string().optional().describe('New parent category'),
    notes: z.string().optional().describe('New notes'),
  }),
  async execute(args) {
    return {
      message: `Updated transaction ${args.transactionId}`,
    }
  },
})

export const delete_transaction = tool({
  description: 'Delete a financial transaction',
  parameters: z.object({
    transactionId: z.string().describe('ID of the transaction to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted transaction ${args.transactionId}`,
    }
  },
})