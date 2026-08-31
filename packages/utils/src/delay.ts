// resolves after `ms` milliseconds - handy for awaiting a pause
export const delay = async (ms: number) => new Promise((res) => setTimeout(res, ms));
