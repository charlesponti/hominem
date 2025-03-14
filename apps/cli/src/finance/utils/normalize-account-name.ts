/**
 * Utility function to normalize account names to handle typos and variations
 */
export function normalizeAccountName(name: string): string {
  if (!name) return name;
  
  // Fix common typos
  if (name.match(/captial\s+one/i)) {
    return name.replace(/captial\s+one/i, 'Capital One');
  }
  
  // Fix other variations of Capital One
  if (name.match(/cap(\.|ital)?\s*one/i) && !name.match(/capital\s+one/i)) {
    return name.replace(/cap(\.|ital)?\s*one/i, 'Capital One');
  }
  
  // Fix American Express variations
  if (name.match(/amex/i) && !name.match(/american\s+express/i)) {
    return name.replace(/amex/i, 'American Express');
  }
  
  // Fix Chase variations
  if (name.match(/chase\s+sapphire|chase\s+freedom/i) && !name.match(/^chase\s/i)) {
    return 'Chase ' + name;
  }
  
  // Additional normalizations can be added here
  
  return name;
}