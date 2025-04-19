<script lang="ts">
import { Router, Route } from 'svelte-navigator'
import { onMount } from 'svelte'
import { initializeClerk } from './lib/clerk'

// Import route components
import Home from './routes/Home.svelte'
import Login from './routes/Login.svelte'
import Dashboard from './routes/Dashboard.svelte'
import Lists from './routes/Lists.svelte'
import List from './routes/List.svelte'
import Place from './routes/Place.svelte'
import Examples from './routes/Examples.svelte'
import NotFound from './routes/NotFound.svelte'

// Import layout
import Layout from './layouts/Layout.svelte'

// Initialize Clerk on app load
onMount(async () => {
  await initializeClerk()
})
</script>

<Router>
  <div class="app">
    <Layout>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/lists" component={Lists} />
      <Route path="/lists/:id" component={List} />
      <Route path="/place/:id" component={Place} />
      <Route path="/examples" component={Examples} />
      <Route path="*" component={NotFound} />
    </Layout>
  </div>
</Router>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                 'Helvetica Neue', Arial, sans-serif;
  }
  
  main {
    width: 100%;
    height: 100%;
  }
</style>