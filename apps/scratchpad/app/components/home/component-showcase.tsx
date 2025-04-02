import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

export function ComponentShowcase() {
  return (
    <>
      <motion.div
        className="divider text-xl font-light tracking-widest my-12 opacity-60"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        COMPONENTS
      </motion.div>

      <motion.section
        className="grid grid-cols-1 md:grid-cols-2 gap-8 container px-6 py-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <AlertsShowcase />
        <FormsShowcase />
      </motion.section>
    </>
  )
}

function AlertsShowcase() {
  return (
    <motion.div
      className="backdrop-blur-xl bg-base-100/30 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.7 }}
      whileHover={{ translateY: -5 }}
    >
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Alerts</h2>
        <div className="space-y-3">
          <motion.div
            className="alert alert-info bg-info/30 backdrop-blur-sm border border-info/30"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Info className="stroke-current shrink-0 w-6 h-6" />
            <span>New information has been added</span>
          </motion.div>
          <motion.div
            className="alert alert-success bg-success/30 backdrop-blur-sm border border-success/30"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <CheckCircle className="stroke-current shrink-0 h-6 w-6" />
            <span>Your changes have been saved successfully!</span>
          </motion.div>
          <motion.div
            className="alert alert-warning bg-warning/30 backdrop-blur-sm border border-warning/30"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <AlertTriangle className="stroke-current shrink-0 h-6 w-6" />
            <span>Warning: Your account is about to expire</span>
          </motion.div>
          <motion.div
            className="alert alert-error bg-error/30 backdrop-blur-sm border border-error/30"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <XCircle className="stroke-current shrink-0 h-6 w-6" />
            <span>Error! There was a problem with your request.</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

function FormsShowcase() {
  return (
    <motion.div
      className="backdrop-blur-xl bg-base-100/30 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.7 }}
      whileHover={{ translateY: -5 }}
    >
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Form Controls</h2>
        <div className="space-y-4">
          <div className="form-control">
            <label htmlFor="name-input" className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              id="name-input"
              type="text"
              placeholder="Enter your name"
              className="input input-bordered bg-base-200/50 backdrop-blur-sm border-white/10 focus:border-primary/50 transition-all duration-300"
            />
          </div>
          <div className="form-control">
            <label htmlFor="email-input" className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="Enter your email"
              className="input input-bordered bg-base-200/50 backdrop-blur-sm border-white/10 focus:border-primary/50 transition-all duration-300"
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Subscribe to newsletter</span>
              <input
                id="newsletter-toggle"
                type="checkbox"
                className="toggle toggle-primary bg-base-300/50"
              />
            </label>
          </div>
          <div className="form-control">
            <p className="label">
              <span className="label-text">Notification preferences</span>
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="email-radio"
                  type="radio"
                  name="notification-pref"
                  className="radio radio-primary border-white/20"
                  defaultChecked
                />
                <span className="label-text">Email</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="sms-radio"
                  type="radio"
                  name="notification-pref"
                  className="radio radio-primary border-white/20"
                />
                <span className="label-text">SMS</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="push-radio"
                  type="radio"
                  name="notification-pref"
                  className="radio radio-primary border-white/20"
                />
                <span className="label-text">Push</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
