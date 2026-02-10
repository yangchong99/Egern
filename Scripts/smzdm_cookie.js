/**
 * SMZDM Cookie Getter (Egern/Surge/Loon/QuanX compatible)
 * Trigger: http-request to https://user-api.smzdm.com/checkin
 * Store key: smzdm_cookie
 */
(function () {
  const done = (v) => (typeof $done === "function" ? $done(v || {}) : void 0);

  const notify = (title, subtitle, message) => {
    if (typeof $notify === "function") return $notify(title, subtitle, message);
    if (typeof $notification !== "undefined" && typeof $notification.post === "function") {
      return $notification.post(title, subtitle, message);
    }
  };

  const writeStore = (key, val) => {
    if (typeof $prefs !== "undefined" && typeof $prefs.setValueForKey === "function") {
      return $prefs.setValueForKey(val, key);
    }
    if (typeof $persistentStore !== "undefined" && typeof $persistentStore.write === "function") {
      return $persistentStore.write(val, key);
    }
    throw new Error("No storage API");
  };

  try {
    const req = typeof $request !== "undefined" ? $request : null;
    const url = req && req.url ? req.url : "";

    if (!/^https?:\/\/user-api\.smzdm\.com\/checkin$/.test(url)) return done({});

    const headers = (req && req.headers) ? req.headers : {};
    const cookie = headers["Cookie"] || headers["cookie"] || "";

    if (!cookie) {
      notify("什么值得买", "Cookie 获取失败", "请求头未发现 Cookie");
      return done({});
    }

    writeStore("smzdm_cookie", cookie);
    notify("什么值得买", "Cookie 获取成功", "已保存到 smzdm_cookie");
    return done({});
  } catch (e) {
    try {
      notify("什么值得买", "脚本异常", String(e && (e.stack || e.message) ? (e.stack || e.message) : e));
    } catch (_) {}
    return done({});
  }
})();
