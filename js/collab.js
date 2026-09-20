/* ============================================================
 * WebsFlow · 多人协同编辑 (collab.js)
 *
 * v1.1 采用轮询同步(4s)+ 幂等合并:
 *   - 本地改动自动推送云端(PUT,内容未变则跳过)
 *   - 拉取远端数据,与本地不同且用户空闲时合并(远端序 + 本地新增块追加)
 *   - 输入保护:用户正在输入(3s 内)时延迟拉取,避免打断编辑
 * 冲突策略:整页 last-writer-wins;块级 union 保新增;块内 props 以云端为准。
 * (实时 OT/CRDT 留待 v1.2)
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const MAP_KEY = (id) => "websflow.cloud." + id;
  let timer = null;
  let lastSynced = "";
  let busy = false;

  WF.collab = {
    /* 云端映射:本地项目 id → 云端项目 id */
    getMap(localId) { try { return localStorage.getItem(MAP_KEY(localId)); } catch (e) { return null; } },
    setMap(localId, cloudId) { try { localStorage.setItem(MAP_KEY(localId), cloudId); } catch (e) {} },
    clearMap(localId) { try { localStorage.removeItem(MAP_KEY(localId)); } catch (e) {} },

    isActive() { return !!timer; },
    lastInputAt: 0,
    markInput() { WF.collab.lastInputAt = Date.now(); },
    isIdle() { return Date.now() - WF.collab.lastInputAt > 3000; },

    /* 启动协同轮询 */
    start(opts) {
      this.stop();
      const { localId, getData, applyRemote, onStatus, intervalMs } = opts || {};
      const interval = intervalMs || 4000;

      const tick = async () => {
        if (busy || !WF.apiIsLoggedIn()) return;
        busy = true;
        try {
          const cloudId = WF.collab.getMap(localId);
          if (!cloudId) return;
          const data = getData();
          const json = JSON.stringify(data);

          // 1) 推送本地改动(内容未变则跳过)
          if (json !== lastSynced) {
            await WF.apiUpdateProject(cloudId, { data });
          }

          // 2) 拉取远端并比对
          const remote = await WF.apiGetProject(cloudId);
          const rj = JSON.stringify(remote && remote.data);
          if (rj !== json && rj !== lastSynced && WF.collab.isIdle()) {
            applyRemote(remote.data);
            lastSynced = JSON.stringify(getData());
            WF.toast(WF.t("remoteUpdated"), "success");
          } else {
            lastSynced = json;
          }
        } catch (e) { /* 静默重试 */ }
        finally { busy = false; }
      };

      lastSynced = JSON.stringify(getData ? getData() : {});
      timer = setInterval(tick, interval);
      if (onStatus) onStatus(true);
    },

    stop(onStatus) {
      if (timer) { clearInterval(timer); timer = null; }
      if (onStatus) onStatus(false);
    },
  };
})(window.WF);
