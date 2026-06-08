window.API_BASE_URL = window.API_BASE_URL || '';

function apiUrl(path) {
  const base = (window.API_BASE_URL || '').replace(/\/+$/g, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base + normalizedPath;
}

function apiFetch(path, options = {}) {
  options.headers = { ...(options.headers || {}) };
  return fetch(apiUrl(path), options);
}

function parseResponseData(res) {
  return res.clone().json().catch(async () => {
    const text = await res.clone().text().catch(() => '');
    return { error: text || 'Invalid JSON response from server' };
  });
}

function apiFetchJson(path, options = {}) {
  return apiFetch(path, options).then(async res => {
    const data = await parseResponseData(res);
    return { res, data };
  });
}
