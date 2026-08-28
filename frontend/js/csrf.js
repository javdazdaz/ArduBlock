let tokenPromise = null;

async function getCsrfToken() {
  if (!tokenPromise) {
    tokenPromise = fetch('/api/csrf-token')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo obtener el token CSRF');
        return response.json();
      })
      .then((data) => data.csrf_token);
  }
  try {
    return await tokenPromise;
  } catch (error) {
    tokenPromise = null;
    throw error;
  }
}

export async function csrfFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('X-CSRFToken', await getCsrfToken());
  return fetch(url, { ...options, headers });
}
