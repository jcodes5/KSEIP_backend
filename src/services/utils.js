/**
 * Fetch with configurable timeout and retries.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @param {number} timeoutMs - Timeout in milliseconds.
 * @param {number} retries - Number of attempts.
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 30000,
  retries = 1,
) {
  let lastError;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
      // eslint-disable-next-line no-shadow
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }

  if (lastError.name === 'AbortError') {
    const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
    timeoutError.code = 'TIMEOUT';
    throw timeoutError;
  }

  throw lastError;
}
