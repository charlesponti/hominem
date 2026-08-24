import { useEffect, useState } from 'react';
import type { PluginConfig } from 'streamdown';

/**
 * Load the Streamdown plugins asynchronously and return them as a PluginConfig object.
 * This hook ensures that the plugins are only loaded once and are available for use in the component.
 *
 * @example
 * const plugins = useStreamdownPlugins();
 * @returns `PluginConfig` - An object containing the loaded Streamdown plugins.
 */
export function useStreamdownPlugins(): PluginConfig {
  const [plugins, setPlugins] = useState<PluginConfig>({});

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      import('@streamdown/cjk'),
      import('@streamdown/code'),
      import('@streamdown/math'),
      import('@streamdown/mermaid'),
    ]).then(([cjk, code, math, mermaid]) => {
      if (!mounted) return;
      setPlugins({ cjk: cjk.cjk, code: code.code, math: math.math, mermaid: mermaid.mermaid });
    });

    return () => {
      mounted = false;
    };
  }, []);

  return plugins;
}
