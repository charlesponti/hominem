import { composeStories, setProjectAnnotations } from '@storybook/react';

import preview from '../../.storybook/preview';
import * as inlineStories from '../components/layout/inline.stories';
import * as pageStories from '../components/layout/page.stories';
import * as stackStories from '../components/layout/stack.stories';
import * as headingStories from '../components/typography/heading.stories';
import * as textStories from '../components/typography/text.stories';
import * as buttonStories from '../components/ui/button.stories';
import * as cardStories from '../components/ui/card.stories';
import * as fieldStories from '../components/ui/field.stories';
import * as formStories from '../components/ui/form.stories';
import * as textAreaStories from '../components/ui/text-area.stories';
import * as textFieldStories from '../components/ui/text-field.stories';
import { render } from '../test-utils';

setProjectAnnotations(preview);

const primitiveStoryModules = [
  buttonStories,
  textFieldStories,
  textAreaStories,
  fieldStories,
  formStories,
  cardStories,
  stackStories,
  inlineStories,
  pageStories,
  textStories,
  headingStories,
] as const;

describe('primitive story snapshots', () => {
  for (const storyModule of primitiveStoryModules) {
    const stories = composeStories(storyModule);

    for (const [storyName, Story] of Object.entries(stories)) {
      it(`${storyModule.default.title}/${storyName}`, () => {
        const { container } = render(<Story />);

        expect(container.firstElementChild).toMatchSnapshot();
      });
    }
  }
});
