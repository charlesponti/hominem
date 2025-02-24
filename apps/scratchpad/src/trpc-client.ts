function createAPIClient<T>({ path = '/api' }: { path: string }): T {
  const basePath = path
  return new Proxy(
    {},
    {
      get(_, key) {
        return new Proxy(() => {}, {
          get(_, method) {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            return async (...args: any[]) => {
              const url = `${basePath}/${String(key)}/${String(method)}`
              // const response = await fetch(url);
              return { url, args }
            }
          },
        })
      },
    }
  ) as T
}

type AppRouter = {
  posts: {
    all: {
      query: () => Promise<{ id: string; title: string }[]>
    }
    create: {
      mutation: ({ title }: { title: string }) => Promise<{ id: string; title: string }>
    }
  }
  users: {
    get: {
      query: (id: string) => Promise<{ id: string; name: string }>
    }
    profile: {
      details: {
        query: (id: string) => Promise<{ id: string; name: string }>
      }
    }
  }
}

const client = createAPIClient<AppRouter>({ path: '/api' })
client.users.get.query('123') // Logs: "Fetching from /api/users/get", args: ["123"]
client.posts.create.mutation({ title: 'New Post' }) // Logs: "Fetching from /api/posts/create", args: [{ title: "New Post" }]
