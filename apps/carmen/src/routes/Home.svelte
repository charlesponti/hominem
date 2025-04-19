<script lang="ts">
  import { isAuthenticated } from '../lib/store'
  import { DASHBOARD } from '../lib/routes'
  import { navigate } from 'svelte-navigator'
  import { onMount } from 'svelte'
  import AppIcon from '../components/AppIcon.svelte'
  
  // Redirect to dashboard if authenticated
  onMount(() => {
    if ($isAuthenticated) {
      navigate(DASHBOARD)
    }
  })
  
  // Background grid animation
  let showGrid = false
  
  onMount(() => {
    setTimeout(() => {
      showGrid = true
    }, 100)
  })
</script>

<div class="min-h-screen overflow-hidden">
  <!-- Y2K-inspired minimalist hero section with animated grid -->
  <div class="relative h-screen overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
    <!-- Animated Grid Background -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="grid-bg {showGrid ? 'show' : ''}"></div>
    </div>
    
    <!-- Floating Shapes -->
    <div class="absolute top-20 left-20 shape shape-circle shape-gradient-1 animate-float-slow"></div>
    <div class="absolute bottom-40 right-32 shape shape-square shape-gradient-2 rotate-12 animate-float"></div>
    <div class="absolute top-1/2 right-1/4 shape shape-triangle shape-gradient-3 animate-spin-slow"></div>
    
    <!-- Header -->
    <header class="relative z-10 p-6">
      <div class="container mx-auto flex justify-between items-center">
        <div class="flex items-center gap-2">
          <AppIcon size={32} />
          <h1 class="text-2xl font-display font-black text-white tracking-tighter">CARMEN</h1>
        </div>
        <nav>
          <a href="#/login" class="px-6 py-2 bg-white text-indigo-600 rounded-full font-display font-bold hover:bg-opacity-90 transition-all">
            LOG IN
          </a>
        </nav>
      </div>
    </header>
    
    <!-- Hero Content -->
    <div class="container relative mx-auto px-6 pt-20 flex flex-col md:flex-row items-center justify-between">
      <div class="md:w-1/2 text-white z-10">
        <h2 class="text-4xl md:text-5xl lg:text-6xl font-display font-black mb-2 tracking-tight">PLACES <span class="text-yellow-300">NOT</span> SPACES</h2>
        <p class="text-2xl font-display font-medium mb-8 max-w-lg">
          Remember the spots that matter. Share the vibes that count.
        </p>
        <div class="space-y-4 mb-8">
          <div class="flex items-center gap-3">
            <div class="h-2 w-2 bg-yellow-300 rounded-full"></div>
            <p class="text-white/90">Create lists of places you've been, love, or want to explore</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-2 w-2 bg-pink-400 rounded-full"></div>
            <p class="text-white/90">Squad up and plan your next trip with friends</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-2 w-2 bg-blue-300 rounded-full"></div>
            <p class="text-white/90">Map your world—only the spots that actually matter</p>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="#/login" class="inline-block px-8 py-3 bg-gradient-to-r from-white to-white/90 text-indigo-600 rounded-full font-display font-bold text-center hover:shadow-lg hover:shadow-white/20 transform hover:-translate-y-1 transition-all">
            GET STARTED
          </a>
          <a href="#examples" class="inline-block px-8 py-3 bg-transparent border-2 border-white text-white rounded-full font-display font-bold text-center hover:bg-white/10 hover:shadow-lg hover:shadow-white/10 transform hover:-translate-y-1 transition-all">
            EXPLORE
          </a>
        </div>
      </div>
      
      <!-- Abstract Illustration -->
      <div class="hidden md:block md:w-1/2 relative z-10">
        <div class="relative h-96">
          <!-- Map Pin Mockup -->
          <div class="absolute w-60 h-80 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl -rotate-6 overflow-hidden left-10 top-10">
            <div class="h-20 bg-gradient-to-r from-pink-500 to-rose-500"></div>
            <div class="p-4">
              <div class="w-32 h-6 bg-white/30 rounded-full mb-4"></div>
              <div class="w-40 h-4 bg-white/30 rounded-full mb-3"></div>
              <div class="w-36 h-4 bg-white/30 rounded-full mb-6"></div>
              <div class="flex gap-2 mb-4">
                <div class="w-10 h-10 rounded-full bg-indigo-400"></div>
                <div class="w-10 h-10 rounded-full bg-yellow-400"></div>
                <div class="w-10 h-10 rounded-full bg-green-400"></div>
              </div>
              <div class="w-full h-32 rounded-lg bg-white/20 overflow-hidden">
                <div class="h-full w-full bg-gradient-to-br from-indigo-800/40 to-purple-800/40"></div>
              </div>
            </div>
          </div>
          <!-- Second Card -->
          <div class="absolute w-56 h-64 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl rotate-12 overflow-hidden left-40 top-20">
            <div class="h-16 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
            <div class="p-4">
              <div class="w-32 h-6 bg-white/30 rounded-full mb-4"></div>
              <div class="w-40 h-4 bg-white/30 rounded-full mb-3"></div>
              <div class="flex gap-2 items-center mb-3">
                <div class="w-6 h-6 rounded-full bg-yellow-300"></div>
                <div class="w-24 h-3 bg-white/30 rounded-full"></div>
              </div>
              <div class="flex gap-2 items-center mb-3">
                <div class="w-6 h-6 rounded-full bg-pink-400"></div>
                <div class="w-28 h-3 bg-white/30 rounded-full"></div>
              </div>
              <div class="flex gap-2 items-center">
                <div class="w-6 h-6 rounded-full bg-blue-300"></div>
                <div class="w-20 h-3 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Call-to-action ticker -->
    <div class="absolute bottom-0 left-0 right-0 bg-indigo-800/40 backdrop-blur-sm py-3 overflow-hidden">
      <div class="ticker">
        <div class="ticker-wrapper">
          <div class="ticker-item">SAVE THE PLACES YOU LOVE</div>
          <div class="ticker-dot"></div>
          <div class="ticker-item">SHARE YOUR FAVE SPOTS</div>
          <div class="ticker-dot"></div>
          <div class="ticker-item">PLAN YOUR NEXT ADVENTURE</div>
          <div class="ticker-dot"></div>
          <div class="ticker-item">COLLABORATE WITH FRIENDS</div>
          <div class="ticker-dot"></div>
          <div class="ticker-item">MAP YOUR MEMORIES</div>
          <div class="ticker-dot"></div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Features Section -->
  <section id="features" class="py-24 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <h3 class="inline-block px-4 py-1 text-sm font-bold font-display tracking-wider bg-indigo-100 text-indigo-600 rounded-full mb-4">WHAT'S THE DEAL?</h3>
        <h2 class="text-display-2 font-black mb-4">Not Just Another Travel App</h2>
        <p class="text-gray-600 text-xl max-w-lg mx-auto">
          It's where your memories, wishlist, and squad's recommendations live.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="bg-indigo-50 p-8 rounded-3xl hover:shadow-lg hover:shadow-indigo-100 transform hover:-translate-y-1 transition-all duration-300">
          <div class="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-6">
            01
          </div>
          <h3 class="text-xl font-display font-bold mb-3">CURATE YOUR SPOTS</h3>
          <p class="text-gray-600">
            Not every place deserves a spot in your collection. Save only what matters—your future self will thank you.
          </p>
        </div>
        
        <!-- Feature 2 -->
        <div class="bg-rose-50 p-8 rounded-3xl hover:shadow-lg hover:shadow-rose-100 transform hover:-translate-y-1 transition-all duration-300">
          <div class="h-14 w-14 bg-rose-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-6">
            02
          </div>
          <h3 class="text-xl font-display font-bold mb-3">SQUAD COLLAB</h3>
          <p class="text-gray-600">
            Share lists, add friends' spots, plan together. Because nobody wants to be the group's designated planner forever.
          </p>
        </div>
        
        <!-- Feature 3 -->
        <div class="bg-amber-50 p-8 rounded-3xl hover:shadow-lg hover:shadow-amber-100 transform hover:-translate-y-1 transition-all duration-300">
          <div class="h-14 w-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-6">
            03
          </div>
          <h3 class="text-xl font-display font-bold mb-3">MAP IT OUT</h3>
          <p class="text-gray-600">
            See your world visualized. All those "we should go there someday" spots, finally organized.
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- How It Works Section -->
  <section class="py-24 bg-indigo-50">
    <div class="container mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div class="order-2 md:order-1">
          <div class="relative">
            <!-- App Mockup -->
            <div class="w-full h-96 bg-white rounded-3xl shadow-xl overflow-hidden border-8 border-white">
              <div class="h-12 bg-indigo-100 flex items-center px-4">
                <div class="w-24 h-4 bg-indigo-200 rounded-full"></div>
              </div>
              <div class="p-4 grid grid-cols-2 gap-4">
                <div class="col-span-2 h-32 bg-indigo-50 rounded-xl"></div>
                <div class="h-24 bg-rose-50 rounded-xl"></div>
                <div class="h-24 bg-amber-50 rounded-xl"></div>
                <div class="h-24 bg-cyan-50 rounded-xl"></div>
                <div class="h-24 bg-emerald-50 rounded-xl"></div>
              </div>
            </div>
            <!-- Decorative elements -->
            <div class="absolute -bottom-6 -left-6 h-24 w-24 bg-rose-400 rounded-full"></div>
            <div class="absolute -top-6 -right-6 h-20 w-20 bg-indigo-400 rounded-full"></div>
            <div class="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 h-16 w-16 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
        
        <div class="order-1 md:order-2">
          <h3 class="inline-block px-4 py-1 text-sm font-bold font-display tracking-wider bg-indigo-100 text-indigo-600 rounded-full mb-4">HOW IT WORKS</h3>
          <h2 class="text-3xl font-display font-black mb-8">Three taps to your perfect collection</h2>
          
          <div class="space-y-8">
            <div class="flex gap-4">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
              <div>
                <h4 class="font-display font-bold mb-2">CREATE LISTS</h4>
                <p class="text-gray-600">
                  Bucket lists, date night spots, hidden gems you accidentally found—organize them all.
                </p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
              <div>
                <h4 class="font-display font-bold mb-2">SAVE PLACES</h4>
                <p class="text-gray-600">
                  That café with the killer flat white? That viewpoint everyone missed? Save them all with one tap.
                </p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
              <div>
                <h4 class="font-display font-bold mb-2">INVITE YOUR PEOPLE</h4>
                <p class="text-gray-600">
                  Because your taste is elite and your friends deserve to benefit from it.
                </p>
              </div>
            </div>
          </div>
          
          <div class="mt-10">
            <a href="#/login" class="inline-block px-8 py-3 bg-indigo-600 text-white rounded-full font-display font-bold text-center hover:bg-indigo-700 transition-all">
              GET STARTED FOR FREE
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Testimonials / Social Proof -->
  <section class="py-24 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <h3 class="inline-block px-4 py-1 text-sm font-bold font-display tracking-wider bg-indigo-100 text-indigo-600 rounded-full mb-4">DON'T TRUST US? COOL.</h3>
        <h2 class="text-display-2 font-black mb-4">These People Already Do</h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Testimonial 1 -->
        <div class="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm transform hover:scale-105 transition-transform duration-300">
          <div class="flex items-center gap-2 mb-4">
            <div class="flex">
              {#each Array(5) as _}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              {/each}
            </div>
          </div>
          <p class="text-gray-600 mb-6">
            "Finally deleted the notes app list of 'cool spots' I've been keeping since 2017. Carmen is where all my places live now."
          </p>
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-indigo-100"></div>
            <div>
              <h4 class="font-bold">Alex K.</h4>
              <p class="text-sm text-gray-500">Food Tour Guide</p>
            </div>
          </div>
        </div>
        
        <!-- Testimonial 2 -->
        <div class="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm transform hover:scale-105 transition-transform duration-300">
          <div class="flex items-center gap-2 mb-4">
            <div class="flex">
              {#each Array(5) as _}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              {/each}
            </div>
          </div>
          <p class="text-gray-600 mb-6">
            "Planned our entire Tokyo trip with friends without a single 'where should we go' text. We just collabed on Carmen."
          </p>
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-rose-100"></div>
            <div>
              <h4 class="font-bold">Jamie T.</h4>
              <p class="text-sm text-gray-500">Travel Enthusiast</p>
            </div>
          </div>
        </div>
        
        <!-- Testimonial 3 -->
        <div class="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm transform hover:scale-105 transition-transform duration-300">
          <div class="flex items-center gap-2 mb-4">
            <div class="flex">
              {#each Array(5) as _}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              {/each}
            </div>
          </div>
          <p class="text-gray-600 mb-6">
            "I've got all my secret spots mapped out for every city I've visited. Way better than dropping pins no one can ever find again."
          </p>
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-amber-100"></div>
            <div>
              <h4 class="font-bold">Morgan L.</h4>
              <p class="text-sm text-gray-500">Digital Nomad</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Final CTA -->
  <section class="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-display-1 font-black mb-6">Ready To Map Your World?</h2>
      <p class="text-xl text-white/80 max-w-2xl mx-auto mb-10">
        Your collection of places is waiting to be built. 
        No more forgotten spots, no more "where was that place again?" moments.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="#/login" class="inline-block px-8 py-4 bg-gradient-to-r from-white to-white/90 text-indigo-600 rounded-full font-display font-bold text-lg hover:shadow-lg hover:shadow-white/20 transform hover:-translate-y-1 transition-all">
          CREATE YOUR COLLECTION
        </a>
        <a href="#/examples" class="inline-block px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-display font-bold text-lg hover:bg-white/10 hover:shadow-lg hover:shadow-white/10 transform hover:-translate-y-1 transition-all">
          SEE EXAMPLES
        </a>
      </div>
    </div>
  </section>
  
  <!-- Footer -->
  <footer class="bg-indigo-900 text-white py-12">
    <div class="container mx-auto px-6">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-6 md:mb-0">
          <div class="flex items-center gap-2">
            <AppIcon size={32} />
            <h1 class="text-2xl font-display font-black tracking-tighter">CARMEN</h1>
          </div>
          <p class="text-indigo-200 mt-2">Map what matters.</p>
        </div>
        
        <div class="flex gap-8">
          <a href="#features" class="text-indigo-200 hover:text-white transition-colors">Features</a>
          <a href="#/examples" class="text-indigo-200 hover:text-white transition-colors">Examples</a>
          <a href="#/login" class="text-indigo-200 hover:text-white transition-colors">Login</a>
        </div>
      </div>
      <div class="border-t border-indigo-800 mt-8 pt-8 text-center text-indigo-300 text-sm">
        &copy; {new Date().getFullYear()} Carmen App. All rights reserved.
      </div>
    </div>
  </footer>
</div>

<style>
  /* Y2K Grid Background */
  .grid-bg {
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    width: 200%;
    height: 200%;
    transform: translateX(-25%) translateY(-25%) rotate(-10deg) scale(0.5);
    opacity: 0;
    transition: all 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .grid-bg.show {
    opacity: 1;
    transform: translateX(-25%) translateY(-25%) rotate(-10deg) scale(1.2);
  }
  
  /* Shapes */
  .shape {
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .shape-circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
  }
  
  .shape-square {
    width: 80px;
    height: 80px;
    border-radius: 10px;
  }
  
  .shape-triangle {
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 100px solid rgba(255, 255, 255, 0.1);
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
  }
  
  .shape-gradient-1 {
    background: linear-gradient(45deg, rgba(255, 105, 180, 0.3), rgba(147, 112, 219, 0.3));
  }
  
  .shape-gradient-2 {
    background: linear-gradient(45deg, rgba(255, 223, 0, 0.3), rgba(255, 105, 180, 0.3));
  }
  
  .shape-gradient-3 {
    background: transparent;
  }
  
  /* Animations */
  @keyframes float {
    0%, 100% {
      transform: translateY(0) rotate(12deg);
    }
    50% {
      transform: translateY(-20px) rotate(12deg);
    }
  }
  
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-30px);
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: floatSlow 10s ease-in-out infinite;
  }
  
  .animate-spin-slow {
    animation: spin 12s linear infinite;
  }
  
  /* Ticker */
  .ticker {
    width: 100%;
    height: 40px;
    overflow: hidden;
  }
  
  .ticker-wrapper {
    display: flex;
    align-items: center;
    animation: ticker 20s linear infinite;
    white-space: nowrap;
  }
  
  .ticker-item {
    font-family: var(--font-display);
    font-weight: 900;
    color: white;
    padding: 0 1rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .ticker-dot {
    width: 8px;
    height: 8px;
    background-color: yellow;
    border-radius: 50%;
  }
  
  @keyframes ticker {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
</style>