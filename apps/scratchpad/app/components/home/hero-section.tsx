import { motion } from 'framer-motion'

export function HeroSection() {
  return (
    <motion.section
      className="container hero min-h-[80vh] py-20 flex items-center relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col items-center z-10">
        <div className="text-center max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">ponti.scratchpad</h1>
            <p className="py-8 text-lg md:text-xl opacity-80">a wacky world of wonders.</p>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            <button
              type="button"
              className="btn btn-primary px-8 py-3 rounded-full backdrop-blur-sm bg-primary/80 hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-primary/30 hover:-translate-y-1"
            >
              Get Started
            </button>
            <button
              type="button"
              className="btn btn-outline backdrop-blur-sm bg-base-100/30 border-2 border-primary/50 hover:border-primary px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-primary/20 hover:-translate-y-1"
            >
              Learn More
            </button>
          </motion.div>
        </div>
      </div>

      {/* <DashboardMockup /> */}
    </motion.section>
  )
}

function DashboardMockup() {
  return (
    <motion.div
      className="absolute right-0 -bottom-20 w-2/3 max-w-3xl opacity-90 hidden lg:block"
      initial={{ opacity: 0, y: 100, rotate: 5 }}
      animate={{ opacity: 1, y: 0, rotate: 2 }}
      transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
      style={{ perspective: '1000px' }}
    >
      <div className="p-4 backdrop-blur-xl bg-base-100/30 border border-white/10 rounded-xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
        <div className="w-full h-72 bg-base-200/50 rounded-lg border border-white/20 overflow-hidden">
          <div className="h-8 bg-base-300/50 border-b border-white/10 flex items-center px-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 p-4">
            <div className="col-span-3 bg-base-300/40 h-28 rounded-lg" />
            <div className="col-span-9 space-y-4">
              <div className="h-8 bg-base-300/40 rounded-lg w-3/4" />
              <div className="h-16 bg-base-300/40 rounded-lg" />
            </div>
            <div className="col-span-8 h-20 bg-primary/20 rounded-lg" />
            <div className="col-span-4 h-20 bg-secondary/20 rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
