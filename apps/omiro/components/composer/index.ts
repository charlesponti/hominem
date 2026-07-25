import { ComposerMedia } from '~/components/composer/ComposerMedia';
import { ComposerShell } from '~/components/composer/ComposerShell';
import { ComposerTextInput } from '~/components/composer/ComposerTextInput';
import { ComposerToolbar } from '~/components/composer/ComposerToolbar';

// Internal visual foundation for the public mode-based Composer component.
export const ComposerKit = Object.assign(ComposerShell, {
  Input: ComposerTextInput,
  Toolbar: ComposerToolbar,
  Media: ComposerMedia,
});

export { useComposerController } from '~/components/composer/useComposerController';
export * from '~/components/composer/constants';
