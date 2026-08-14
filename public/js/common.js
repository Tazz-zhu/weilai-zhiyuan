// 未来致远 · 页面启动引导
import { api } from './api.js';
import { injectLayout, openLogin, toast, badgeToast } from './ui.js';

export async function bootstrap(active = '', { auth = false, redirect = 'index.html?login=1' } = {}) {
  injectLayout(active);
  const params = new URLSearchParams(location.search);

  // 刷新用户（含会员状态），确保门控判断准确
  let user = api.cachedUserFromStorage();
  if (api.token) {
    try {
      const fresh = await api.me(true);
      if (fresh) { api.setUser(fresh); user = fresh; }
    } catch (e) { /* token 失效则按未登录处理 */ }
  }
  // 只有确认未登录时，带 login=1 才弹登录框（避免登录后循环弹窗）
  if (params.get('login') === '1' && !user) openLogin();
  if (auth && !user) {
    location.href = redirect;
    return null;
  }
  return user;
}

export function toastBadgesFrom(r) {
  if (r && r.badges && r.badges.length) badgeToast(r.badges);
}
