/**
 * Lightweight Zero-Dependency HTTP Client for Opaque-Box E2E Testing
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

class HttpClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  request(options = {}) {
    return new Promise((resolve, reject) => {
      const fullUrl = options.url.startsWith('http://') || options.url.startsWith('https://')
        ? options.url
        : `${this.baseUrl}${options.url.startsWith('/') ? '' : '/'}${options.url}`;

      const parsedUrl = new URL(fullUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const headers = Object.assign({}, options.headers || {});
      let bodyData = null;

      if (options.data !== undefined && options.data !== null) {
        if (typeof options.data === 'object' && !(options.data instanceof Buffer)) {
          bodyData = JSON.stringify(options.data);
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
          }
        } else {
          bodyData = String(options.data);
        }
        headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const reqOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: (options.method || 'GET').toUpperCase(),
        headers,
        timeout: options.timeout || 15000
      };

      const req = transport.request(reqOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (e) {}

          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: buffer,
            text,
            json,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            location: res.headers.location || null
          };

          if (options.followRedirect && (res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            const redirectUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, fullUrl).href;
            return resolve(this.request(Object.assign({}, options, { url: redirectUrl, method: 'GET', data: null })));
          }

          resolve(response);
        });
      });

      req.on('error', (err) => {
        reject(new Error(`[HttpClient] Request failed (${reqOptions.method} ${fullUrl}): ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`[HttpClient] Request timed out after ${reqOptions.timeout}ms (${reqOptions.method} ${fullUrl})`));
      });

      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    });
  }

  get(url, headers = {}, options = {}) {
    return this.request(Object.assign({ url, method: 'GET', headers }, options));
  }

  post(url, data = null, headers = {}, options = {}) {
    return this.request(Object.assign({ url, method: 'POST', data, headers }, options));
  }

  put(url, data = null, headers = {}, options = {}) {
    return this.request(Object.assign({ url, method: 'PUT', data, headers }, options));
  }

  delete(url, headers = {}, options = {}) {
    return this.request(Object.assign({ url, method: 'DELETE', headers }, options));
  }
}

module.exports = { HttpClient };
