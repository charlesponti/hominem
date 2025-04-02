import { motion } from 'framer-motion'

export function CallToAction() {
  return (
    <motion.section
      className="container py-20 text-center"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="backdrop-blur-2xl bg-gradient-to-r from-primary/10 via-base-100/5 to-secondary/10 border border-white/10 rounded-3xl p-12 shadow-2xl"
        whileHover={{ y: -5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="md:text-xl opacity-70 mb-8 max-w-2xl mx-auto">
          Join thousands of developers creating stunning interfaces with our modern SaaS toolkit and
          design system.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <motion.button
            type="button"
            className="btn btn-lg btn-primary rounded-full px-8 shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Free Trial
          </motion.button>
          <motion.button
            type="button"
            className="btn btn-lg btn-outline rounded-full px-8 border-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Documentation
          </motion.button>
        </div>
      </motion.div>
    </motion.section>
  )
}
