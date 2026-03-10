import { useEffect, useState } from 'react'

import { useDesktopAuth } from './auth/desktop-auth-provider'

export function AppShell() {
  const [isPackaged, setIsPackaged] = useState(false)
  const { signOut, state } = useDesktopAuth()

  useEffect(() => {
    void window.electronAPI.isPackaged().then(setIsPackaged)
  }, [])

  return (
    <main className="desktop-shell">
      <div className="desktop-shell__frame">
        <header className="desktop-shell__topbar">
          <div>
            <p className="desktop-shell__eyebrow">Hominem desktop</p>
            <h1 className="desktop-shell__title">Desktop shell</h1>
          </div>
          <div className="desktop-shell__actions" role="group" aria-label="Window controls">
            <button
              className="desktop-shell__button"
              onClick={() => void signOut()}
              type="button"
            >
              Sign out
            </button>
            <button
              className="desktop-shell__button"
              onClick={() => void window.electronAPI.minimizeWindow()}
              type="button"
            >
              Minimize window
            </button>
            <button
              className="desktop-shell__button"
              onClick={() => void window.electronAPI.closeWindow()}
              type="button"
            >
              Close window
            </button>
          </div>
        </header>

        <section className="desktop-shell__hero">
          <div className="desktop-shell__hero-copy">
            <p className="desktop-shell__eyebrow">Authenticated shell</p>
            <h2 className="desktop-shell__section-title">
              Desktop auth is aligned with the rest of Hominem.
            </h2>
            <p className="desktop-shell__body">
              Signed in as <strong>{state.user?.email ?? 'unknown user'}</strong>. The desktop app can now
              bootstrap auth state, restore sessions, and gate product features behind the same backend
              contract used by the other first-party apps.
            </p>
          </div>
          <dl className="desktop-shell__status-list">
            <div className="desktop-shell__status-item">
              <dt className="desktop-shell__label">Runtime</dt>
              <dd className="desktop-shell__value">{isPackaged ? 'Packaged build' : 'Development build'}</dd>
            </div>
            <div className="desktop-shell__status-item">
              <dt className="desktop-shell__label">Platform</dt>
              <dd className="desktop-shell__value">{window.electronAPI.platform}</dd>
            </div>
            <div className="desktop-shell__status-item">
              <dt className="desktop-shell__label">Auth state</dt>
              <dd className="desktop-shell__value">Signed in</dd>
            </div>
          </dl>
        </section>

        <section className="desktop-shell__grid" aria-label="Authenticated desktop status">
          <article className="desktop-shell__panel">
            <h2 className="desktop-shell__panel-title">Ready now</h2>
            <ul className="desktop-shell__list">
              <li>Session bootstrap runs on desktop startup.</li>
              <li>Email OTP can move the renderer into a signed-in shell.</li>
              <li>Desktop sign-out clears the local session and returns to auth.</li>
            </ul>
          </article>
          <article className="desktop-shell__panel">
            <h2 className="desktop-shell__panel-title">Next</h2>
            <p className="desktop-shell__body">
              The next implementation pass can connect this signed-in shell to shared notes and tracker
              features without rebuilding auth primitives first.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}
