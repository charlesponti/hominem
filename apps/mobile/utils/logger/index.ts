type LogArg = string | number | boolean | object | null | undefined;

export const log = (...args: LogArg[]) => {
  console.log(...args);
};
