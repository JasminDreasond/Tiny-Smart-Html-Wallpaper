/**
 * @param {string} envStr
 * @returns {Record<string, string>}
 */
export const parseEnv = (envStr) => {
  /** @type {Record<string, string>} */
  const result = {};
  /** @type {string[]} */
  const lines = envStr.split('\n');

  for (let i = 0; i < lines.length; i++) {
    /** @type {string} */
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      /** @type {string[]} */
      const parts = line.split('=');
      /** @type {string} */
      const key = parts[0].trim();
      /** @type {string} */
      const val = parts.slice(1).join('=').replace(/"/g, '').trim();
      if (key) result[key] = val;
    }
  }
  return result;
};