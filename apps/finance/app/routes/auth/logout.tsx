import { redirect } from 'react-router';

import { serverEnv } from '~/lib/env';

const logoutUrl = new URL('/logout', serverEnv.VITE_PUBLIC_API_URL).toString();

export const action = () => redirect(logoutUrl);
export const loader = () => redirect(logoutUrl);
