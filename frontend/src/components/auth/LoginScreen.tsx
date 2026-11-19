import { MotionConfig, motion } from 'framer-motion';
import { CheckCircle2, Clock3, Mail, Send } from 'lucide-react';
import { env } from '../../config/env';
import { useAuth } from '../../state/AuthContext';
import { updateLandingPointer } from '../../utils/pointerEffects';

/**
 * Public sign-in view with Google OAuth and optional local preview login.
 */
export function LoginScreen() {
  const { authError, demoEnabled, demoLoading, startDemoLogin } = useAuth();

  return (
    <MotionConfig reducedMotion="user">
      <main
        className="login-shell flex min-h-screen items-center justify-center px-5 py-10"
        onPointerMove={(event) => updateLandingPointer(event)}
        onPointerLeave={(event) => updateLandingPointer(event, true)}
      >
        <motion.div
          className="login-layout"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <section className="login-card">
            <a href="/" className="login-brand">
              <span className="login-brand-mark">
                <Send size={17} />
              </span>
              ReachInbox
            </a>
            <div className="login-copy">
              <p className="eyebrow">EMAIL WORKSPACE</p>
              <h1>Good to see you.</h1>
              <p>Sign in to keep your email schedule moving.</p>
            </div>
            {authError && (
              <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {authError}
              </p>
            )}
            <a className="google-login-button" href={`${env.apiUrl}/auth/google`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
                G
              </span>
              Continue with Google
            </a>
            {demoEnabled && (
              <div className="demo-login">
                <button
                  type="button"
                  onClick={() => void startDemoLogin()}
                  disabled={demoLoading}
                >
                  {demoLoading ? 'Opening preview...' : 'Open local preview'}
                </button>
                <p>Local-only preview. Google sign-in is unchanged.</p>
              </div>
            )}
            <p className="login-footnote">Your workspace is private to your account.</p>
          </section>

          <motion.aside
            className="login-preview"
            aria-label="Scheduler overview"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="fluid-scene" aria-hidden="true">
              <span className="fluid-orb fluid-orb-one" />
              <span className="fluid-orb fluid-orb-two" />
              <span className="fluid-ring" />
            </div>
            <p className="preview-kicker">
              <span /> SCHEDULER OVERVIEW
            </p>
            <h2>Good outreach starts with good timing.</h2>
            <p className="preview-description">
              Keep every message organized, paced, and easy to follow.
            </p>
            <motion.div
              className="preview-flow"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <span className="flow-icon">
                  <Clock3 size={16} />
                </span>
                <span>
                  <strong>Schedule</strong>
                  <small>Choose when a campaign begins</small>
                </span>
                <b>01</b>
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <span className="flow-icon">
                  <Mail size={16} />
                </span>
                <span>
                  <strong>Send steadily</strong>
                  <small>Respect your sender's limits</small>
                </span>
                <b>02</b>
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <span className="flow-icon">
                  <CheckCircle2 size={16} />
                </span>
                <span>
                  <strong>Track progress</strong>
                  <small>See scheduled and sent emails</small>
                </span>
                <b>03</b>
              </motion.div>
            </motion.div>
            <p className="preview-note">A simple workspace for reliable email scheduling.</p>
            <p className="tech-stack-note">TypeScript · Express · BullMQ · Redis · MySQL · React</p>
          </motion.aside>
        </motion.div>
      </main>
    </MotionConfig>
  );
}
