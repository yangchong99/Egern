//2026-02-27 - Modified for Egern

/*
@Name：NS论坛cookie获取和签到 (Egern 适配版本)
@Author：怎么肥事(modified by yangchongUncle)

1️⃣使用方法：将此脚本保存到 Egern 可读取的目录中，并在 Egern 中创建一个本地模块或复写使用以下模块配置。配置好后，先点击个人头像进入信息页面获取 Headers，获取成功后定时任务会自动进行签到。

Egern 模块配置 (module.yaml) 示例：

name: NodeSeek_cookie
description: NodeSeek论坛获取cookie
mitm:
  hostnames:
    - www.nodeseek.com
scriptings:
  - http_request:
      name: NS_获取_Headers
      match: ^https:\/\/www\.nodeseek\.com\/api\/account\/getInfo\/\d+\?readme=1$
      script_url: nodeseekcheckin.js
      body_required: false

*/

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Connection",
  "Accept-Encoding",
  "Priority",
  "Content-Type",
  "Origin",
  "refract-sign",
  "User-Agent",
  "refract-key",
  "Sec-Fetch-Mode",
  "Cookie",
  "Host",
  "Referer",
  "Accept-Language",
  "Accept",
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const get = (name) =>
    src[name] ?? src[name.toLowerCase()] ?? src[name.toUpperCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    console.log("[NS] picked headers empty:", JSON.stringify(allHeaders));
    $notification.post(
      "NS Headers 获取失败",
      "",
      "未获取到指定请求头，请重新再试一次。",
    );
    $done({});
  } else {
    // Egern 使用 $persistentStore.write 替代 QX 的 $prefs.setValueForKey
    const ok = $persistentStore.write(JSON.stringify(picked), NS_HEADER_KEY);
    console.log("[NS] saved picked headers:", JSON.stringify(picked));
    if (ok) {
      $notification.post("NS Headers 获取成功", "", "指定请求头已持久化保存。");
    } else {
      $notification.post(
        "NS Headers 保存失败",
        "",
        "写入持久化存储失败，请检查配置。",
      );
    }
    $done({});
  }
} else {
  // 🔹 读取已保存指定 headers，重放签到请求：https://www.nodeseek.com/api/attendance?random=true
  // Egern 使用 $persistentStore.read 替代 QX 的 $prefs.valueForKey
  const raw = $persistentStore.read(NS_HEADER_KEY);
  if (!raw) {
    $notification.post(
      "NS签到结果",
      "无法签到",
      "本地没有已保存的请求头，请先抓包访问一次个人页面。",
    );
    $done();
  } else {
    let savedHeaders = {};
    let parseFailed = false;
    try {
      savedHeaders = JSON.parse(raw) || {};
    } catch (e) {
      console.log("[NS] parse saved headers failed:", e);
      $notification.post(
        "NS签到结果",
        "无法签到",
        "本地保存的请求头数据损坏，请重新访问一次个人页面。",
      );
      parseFailed = true;
      $done();
    }

    if (!parseFailed) {
      const url = `https://www.nodeseek.com/api/attendance?random=true`;

      const headers = {
        Connection: savedHeaders["Connection"] || `keep-alive`,
        "Accept-Encoding":
          savedHeaders["Accept-Encoding"] || `gzip, deflate, br`,
        Priority: savedHeaders["Priority"] || `u=3, i`,
        "Content-Type":
          savedHeaders["Content-Type"] || `text/plain;charset=UTF-8`,
        Origin: savedHeaders["Origin"] || `https://www.nodeseek.com`,
        "refract-sign": savedHeaders["refract-sign"] || ``,
        "User-Agent":
          savedHeaders["User-Agent"] ||
          `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.2 Mobile/15E148 Safari/604.1`,
        "refract-key": savedHeaders["refract-key"] || ``,
        "Sec-Fetch-Mode": savedHeaders["Sec-Fetch-Mode"] || `cors`,
        Cookie: savedHeaders["Cookie"] || ``,
        Host: savedHeaders["Host"] || `www.nodeseek.com`,
        Referer:
          savedHeaders["Referer"] || `https://www.nodeseek.com/sw.js?v=0.3.33`,
        "Accept-Language":
          savedHeaders["Accept-Language"] || `zh-CN,zh-Hans;q=0.9`,
        Accept: savedHeaders["Accept"] || `*/*`,
      };

      const myRequest = {
        url: url,
        headers: headers,
        body: ``,
      };

      // Egern 使用 $httpClient.post 替代 QX 的 $task.fetch
      $httpClient.post(myRequest, function (error, response, data) {
        if (error) {
          const err = String(error || "");
          console.log(`[NS签到] request error: ${err}`);
          $notification.post("NS签到结果", "请求错误", err);
          $done();
        } else {
          const status = response.status || response.statusCode;
          const body = data || "";

          let msg = "";
          try {
            const obj = JSON.parse(body);
            msg = obj?.message ? String(obj.message) : "";
            console.log(`[NS签到] parsed message: ${msg || "(empty)"}`);
          } catch (e) {
            console.log(`[NS签到] JSON parse failed: ${e}`);
          }

          if (status === 403) {
            const content = `暂时被风控，稍后再试\n${
              msg ? `内容：${msg}` : `响应体：${body}`
            }`;
            console.log(`[NS签到] notify(403): ${content}`);
            $notification.post("NS签到结果", "403 风控", content);
          } else if (status === 500) {
            const content = msg || body || "服务器错误(500)，无返回内容";
            console.log(`[NS签到] notify(500): ${content}`);
            $notification.post("NS签到结果", "500 服务器错误", content);
          } else if (status >= 200 && status < 300) {
            const content = msg || "NS签到成功，但未返回 message";
            console.log(`[NS签到] notify(success): ${content}`);
            $notification.post("NS签到结果", "签到成功", content);
          } else {
            const content = msg || body || `请求失败，status=${status}`;
            console.log(`[NS签到] notify(other): ${content}`);
            $notification.post("NS签到结果", `请求异常 ${status}`, content);
          }

          $done();
        }
      });
    }
  }
}
