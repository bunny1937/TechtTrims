export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if online before attempting
      if (!navigator.onLine) {
        throw new Error(
          "You are offline. Please check your internet connection."
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Don't retry if offline or on last attempt
      if (!navigator.onLine || attempt === maxRetries) {
        break;
      }

      // Exponential backoff: wait 1s, 2s, 4s...
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
      );
    }
  }

  throw lastError;
}

// Usage example in your components
export async function apiCall(endpoint, data) {
  try {
    const response = await fetchWithRetry(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    if (!navigator.onLine) {
      alert(
        "📡 You are offline. Please check your internet connection and try again."
      );
    } else {
      alert(`❌ Request failed: ${error.message}`);
    }
    throw error;
  }
}
