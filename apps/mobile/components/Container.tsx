import { PropsWithChildren } from 'react';
import { Box } from 'theme';

export const Container = ({ children }: PropsWithChildren) => {
  return <Box flex={1}>{children}</Box>;
};
