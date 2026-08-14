// 未来致远 · API 封装与登录态管理
const TOKEN_KEY = 'zy_token';

export const api = {
  token: localStorage.getItem(TOKEN_KEY) || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async req(method, path, data) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    let res;
    try {
      res = await fetch(path, { method, headers, body: data !== undefined ? JSON.stringify(data) : undefined });
    } catch (e) {
      throw new Error('网络连接失败，请确认服务已启动');
    }
    let json = null;
    try { json = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
      const err = new Error((json && json.error) || '请求失败 (' + res.status + ')');
      err.status = res.status; err.json = json;
      if (res.status === 401) {
        // token 失效：清空登录态
        this.setToken(null);
        this.setUser(null);
        if (!path.startsWith('/api/auth/')) {
          setTimeout(() => {
            if (!location.pathname.endsWith('index.html')) location.href = 'index.html?login=1';
          }, 300);
        }
      }
      throw err;
    }
    return json;
  },

  get(path) { return this.req('GET', path); },
  post(path, data) { return this.req('POST', path, data); },
  put(path, data) { return this.req('PUT', path, data); },
  patch(path, data) { return this.req('PATCH', path, data); },
  del(path) { return this.req('DELETE', path); },

  cachedUser: null,
  async me(force = false) {
    if (this.cachedUser && !force) return this.cachedUser;
    if (!this.token) return null;
    try {
      const r = await this.get('/api/me');
      this.cachedUser = r.user;
      localStorage.setItem('zy_user', JSON.stringify(r.user));
      return r.user;
    } catch (e) {
      return null;
    }
  },
  setUser(u) { this.cachedUser = u; if (u) localStorage.setItem('zy_user', JSON.stringify(u)); else localStorage.removeItem('zy_user'); },
  cachedUserFromStorage() {
    try { return JSON.parse(localStorage.getItem('zy_user') || 'null'); } catch { return null; }
  },
  logout() {
    try { this.post('/api/auth/logout'); } catch (e) {}
    this.setToken(null); this.setUser(null);
  }
};
