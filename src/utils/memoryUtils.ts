/**
 * Forces garbage collection hints for low-memory devices.
 * Note: JavaScript doesn't have explicit GC, but this helps by nulling references.
 */
export const releaseMemory = () => {
  if ((globalThis as any).gc) {
    try {
      (globalThis as any).gc();
      console.log('Memory released');
    } catch (e) {
      // Ignore
    }
  }
};

/**
 * Truncates a string to a maximum length to avoid memory bloat.
 */
export const truncateString = (str: string, maxLength: number = 500): string => {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) : str;
};
