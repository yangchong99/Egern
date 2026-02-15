// 2025.11.28 15:19
// author：@z-jinke
// 修改时间：2026-02-16 01:23:56

// 处理外部参数
const args = {};
$argument.split("&").forEach((p) => {
  const index = p.indexOf("=");
  const key = p.substring(0, index);
  const value = p.substring(index + 1);
  args[key] = decodeURIComponent(value);
});

// 计算重置日剩余天数
function getResetInfo(resetDay) {
  if (!resetDay) return "";
  const today = new Date();
  const nowDay = today.getDate();
  const nowMonth = today.getMonth();
  const nowYear = today.getFullYear();

  let resetDate;
  if (nowDay < resetDay) {
    resetDate = new Date(nowYear, nowMonth, resetDay);
  } else {
    resetDate = new Date(nowYear, nowMonth + 1, resetDay);
  }

  const diff = Math.ceil((resetDate - today) / (1000 * 60 * 60 * 24));
  return `重置：${diff}天`;
}

// 获取订阅流量信息
function fetchInfo(url, resetDay) {
  return new Promise((resolve) => {
    $httpClient.get(
      { url, headers: { "User-Agent": "Quantumult%20X/1.5.2" } },
      (err, resp) => {
        if (err || !resp || resp.status !== 200) {
          resolve(`订阅请求失败，状态码：${resp ? resp.status : "请求错误"}`);
          return;
        }

        const data = {};
        const headerKey = Object.keys(resp.headers).find(
          (k) => k.toLowerCase() === "subscription-userinfo",
        );

        if (headerKey && resp.headers[headerKey]) {
          resp.headers[headerKey].split(";").forEach((p) => {
            const [k, v] = p.trim().split("=");
            if (k && v) data[k] = parseInt(v);
          });
        }

        const used = (data.upload || 0) + (data.download || 0);
        const total = data.total || 0;
        const percent = total > 0 ? ((used / total) * 100).toFixed(0) : "0";

        function formatUsed(bytes) {
          if (bytes >= 1024 * 1024 * 1024) {
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + "GB";
          } else {
            return (bytes / 1024 / 1024).toFixed(2) + "MB";
          }
        }

        function formatTotal(bytes) {
          if (bytes >= 1024 * 1024 * 1024) {
            return Math.floor(bytes / 1024 / 1024 / 1024) + "GB";
          } else {
            return Math.floor(bytes / 1024 / 1024) + "MB";
          }
        }

        const usedFlow = formatUsed(used);
        const totalFlow = formatTotal(total);

        const lines = [`已用：${usedFlow}➟${percent}%`, `流量：${totalFlow}`];

        if (data.expire) {
          const d = new Date(data.expire * 1000);
          lines.push(
            `到期：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号`,
          );
        }

        if (resetDay) {
          lines.push(getResetInfo(resetDay));
        }

        resolve(lines.join("\n"));
      },
    );
  });
}

// ===== 顶部执行时间（全局一次）=====
function pad2(n) {
  return String(n).padStart(2, "0");
}
function runAtLine() {
  const d = new Date();
  const MM = pad2(d.getMonth() + 1);
  const DD = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `⏱ 执行时间：${MM}-${DD} ${hh}:${mm}:${ss}`;
}

// 依次处理多个订阅
(async () => {
  const panels = [];

  for (let i = 1; i <= 10; i++) {
    const urlKey = `url${i}`;
    const titleKey = `title${i}`;
    const resetKey = `resetDay${i}`;

    if (args[urlKey]) {
      const content = await fetchInfo(
        args[urlKey],
        args[resetKey] ? parseInt(args[resetKey]) : null,
      );

      panels.push(
        args[titleKey] ? `机场：${args[titleKey]}\n${content}` : content,
      );
    }
  }

  $done({
    title: "订阅流量",
    content: runAtLine() + "\n\n" + panels.join("\n\n"),
    icon: "antenna.radiowaves.left.and.right.circle.fill",
    "icon-color": "#00E28F",
  });
})();
