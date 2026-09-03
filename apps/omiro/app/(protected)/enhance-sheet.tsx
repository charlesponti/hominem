import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { InlineEnhanceTray } from '~/components/ai/InlineEnhanceTray';
import { useStyles } from '~/components/theme';
import { consumeActiveEnhanceSession } from '~/services/ai/active-enhance-session';
import { useTextEnhance } from '~/services/ai/use-text-enhance';
import t from '~/translations';

// The wand button navigates here instead of opening an inline panel -- check
// active-enhance-session.ts to see how this screen grabs the triggering
// composer's draft without needing router params or shared context.
export default function EnhanceSheetScreen() {
  const router = useRouter();
  const [session] = useState(consumeActiveEnhanceSession);
  const { enhance, isEnhancing } = useTextEnhance();
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const styles = useStyles((theme) => ({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
    title: { ...theme.textVariants.headline, color: theme.colors.foreground },
  }));

  const runEnhance = useCallback(
    async (presetInstruction?: string) => {
      const text = session.getMessage();
      if (!text.trim() || isEnhancing) {
        return;
      }

      setError(null);
      try {
        const enhanced = await enhance({
          text,
          instruction: presetInstruction?.trim() || instruction.trim() || undefined,
        });
        session.setMessage(enhanced);
        router.back();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Enhancement failed');
      }
    },
    [enhance, instruction, isEnhancing, router, session],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.enhance.title}</Text>
      <InlineEnhanceTray
        instruction={instruction}
        onInstructionChange={setInstruction}
        onPresetSelect={(preset) => {
          void runEnhance(preset);
        }}
        onCancel={() => router.back()}
        onConfirm={() => {
          void runEnhance();
        }}
        isEnhancing={isEnhancing}
        error={error}
      />
    </View>
  );
}
