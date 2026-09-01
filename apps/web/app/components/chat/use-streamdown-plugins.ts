import { useEffect, useState } from 'react';
import type { PluginConfig } from 'streamdown';

export function useStreamdownPlugins(): PluginConfig {
  const [plugins, setPlugins] = useState<PluginConfig>({});

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      import('@streamdown/cjk'),
      import('@streamdown/code'),
      import('@streamdown/math'),
      import('@streamdown/mermaid'),
    ])
      .then(([cjk, code, math, mermaid]) => {
        if (!mounted) return;
        setPlugins({ cjk: cjk.cjk, code: code.code, math: math.math, mermaid: mermaid.mermaid });
      })
      .catch(() => {
        if (mounted) setPlugins({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  return plugins;
}
