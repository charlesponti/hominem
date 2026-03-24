import { Redirect } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React from 'react';

import { getLegacyWorkspaceRouteRedirect } from '~/components/workspace/mobile-legacy-routes';

export default function StartScreen() {
  return <Redirect href={getLegacyWorkspaceRouteRedirect('start') as RelativePathString} />;
}
