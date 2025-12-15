import type { Plugin } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Vite plugin that automatically injects a build-time version into the service worker.
 * This ensures every build gets a unique version, triggering update notifications.
 *
 * Strategy: Modify the file in the build output directory after React Router copies it.
 * Uses closeBundle hook which runs after all files are written.
 */
export function serviceWorkerVersion(): Plugin {
  return {
    name: 'service-worker-version',
    apply: 'build',
    closeBundle() {
      // Generate a unique version based on build timestamp
      // Format: YYYYMMDDHHmmss (e.g., 20241215143045)
      const buildTimestamp = new Date()
        .toISOString()
        .replace(/[-:T.]/g, '')
        .slice(0, 14)
      const version = `build-${buildTimestamp}`

      // React Router outputs to build/client by default
      // Try multiple possible output locations
      const possiblePaths = [
        join(process.cwd(), 'build', 'client', 'sw.js'), // React Router default client output
        join(process.cwd(), 'build', 'sw.js'), // Alternative location
        join(process.cwd(), 'dist', 'sw.js'), // Standard Vite output
        join(process.cwd(), '.react-router', 'build', 'client', 'sw.js'), // Alternative location
      ]

      let updated = false
      for (const swPath of possiblePaths) {
        if (existsSync(swPath)) {
          try {
            let swContent = readFileSync(swPath, 'utf-8')

            // Replace the VERSION constant with the build version
            // Matches: const VERSION = 'dev' or const VERSION = "1.0.0" or const VERSION = 'build-...'
            const modifiedContent = swContent.replace(
              /const\s+VERSION\s*=\s*['"](.*?)['"]/,
              `const VERSION = '${version}'`
            )

            if (modifiedContent !== swContent) {
              writeFileSync(swPath, modifiedContent, 'utf-8')
              console.log(`✓ Injected version ${version} into service worker at ${swPath}`)
              updated = true
              break // Found and updated, exit
            } else {
              console.warn(
                `Service worker at ${swPath} already has version or pattern didn't match`
              )
            }
          } catch (error) {
            console.warn(`Failed to update service worker at ${swPath}:`, error)
          }
        }
      }

      if (!updated) {
        console.warn(
          'Could not find service worker file in build output. Update detection may not work.'
        )
        console.warn(
          'Checked paths:',
          possiblePaths.map((p) => p.replace(process.cwd(), '.'))
        )
      }
    },
  }
}
