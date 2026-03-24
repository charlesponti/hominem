const MIN_DB = -50;
const MAX_DB = 0;
const MIN_HEIGHT = 7;
const MAX_HEIGHT = 50;
export const BAR_WIDTH = 3;
export const BAR_GAP = 5;

export const normalizeDb = (db: number): number => {
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  return MIN_HEIGHT + ((clamped - MIN_DB) / (MAX_DB - MIN_DB)) * (MAX_HEIGHT - MIN_HEIGHT);
};

export function buildAudioBarModels(levels: number[]) {
  return levels.map((level, index) => {
    const x = index * (BAR_WIDTH + BAR_GAP);
    return {
      key: `bar-${x}`,
      x,
      targetHeight: normalizeDb(level),
    };
  });
}
