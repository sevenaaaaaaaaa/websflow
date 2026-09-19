/* ============================================================
 * WebsFlow · API 客户端 (api.js)
 * 前端与后端通信的封装
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // API 基础地址(生产环境走 /webflow/api,由 Apache 反代到 Node :3001)
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : '/webflow/api';

  // Token 存储键
  const TOKEN_KEY = 'websflow.token';
  const USER_KEY = 'websflow.user';

  // ============================================================
  //  工具函数
  // ============================================================

  // 获取存储的 Token
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // 保存 Token
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  // 清除 Token
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // 获取存储的用户信息
  function getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // 保存用户信息
  function setStoredUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // 通用请求函数
  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  }

  // 通用请求(供后台/扩展调用)
  WF.apiRequest = request;

  // ============================================================
  //  用户 API
  // ============================================================

  // 注册
  WF.apiRegister = async function (username, email, password) {
    let ref = null;
    try { ref = localStorage.getItem("websflow.ref"); } catch (e) {}
    const data = await request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, ref }),
    });
    
    setToken(data.token);
    setStoredUser(data.user);
    
    return data.user;
  };

  // 登录
  WF.apiLogin = async function (email, password) {
    const data = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    setToken(data.token);
    setStoredUser(data.user);
    
    return data.user;
  };

  // 登出
  WF.apiLogout = function () {
    clearToken();
  };

  // 获取当前用户
  WF.apiGetCurrentUser = async function () {
    const token = getToken();
    if (!token) return null;
    
    try {
      const data = await request('/users/me');
      setStoredUser(data.user);
      return data.user;
    } catch (e) {
      clearToken();
      return null;
    }
  };

  // 获取本地存储的用户
  WF.apiGetStoredUser = getStoredUser;

  // 检查是否已登录
  WF.apiIsLoggedIn = function () {
    return !!getToken();
  };

  // 更新用户信息
  WF.apiUpdateUser = async function (userData) {
    const data = await request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    
    setStoredUser(data.user);
    return data.user;
  };

  // ============================================================
  //  项目 API
  // ============================================================

  // 获取项目列表
  WF.apiGetProjects = async function () {
    const data = await request('/projects');
    return data.projects;
  };

  // 创建项目
  WF.apiCreateProject = async function (name, mode, projectData, description) {
    const data = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, mode, data: projectData, description }),
    });
    
    return data.project;
  };

  // 获取项目详情
  WF.apiGetProject = async function (projectId) {
    const data = await request(`/projects/${projectId}`);
    return data.project;
  };

  // 更新项目
  WF.apiUpdateProject = async function (projectId, updates) {
    await request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  };

  // 删除项目
  WF.apiDeleteProject = async function (projectId) {
    await request(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  };

  // 设置项目公开状态
  WF.apiSetProjectPublic = async function (projectId, isPublic) {
    await request(`/projects/${projectId}/public`, {
      method: 'PUT',
      body: JSON.stringify({ is_public: isPublic }),
    });
  };

  // 获取项目版本列表
  WF.apiGetProjectVersions = async function (projectId) {
    const data = await request(`/projects/${projectId}/versions`);
    return data.versions;
  };

  // 保存项目版本
  WF.apiSaveProjectVersion = async function (projectId, name, versionData) {
    const data = await request(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ name, data: versionData }),
    });
    
    return data.version;
  };

  // 云端模板
  WF.apiGetTemplates = async function () {
    return (await request('/templates')).templates;
  };
  WF.apiGetTemplate = async function (id) {
    return (await request('/templates/' + id)).template;
  };
  WF.apiPublishTemplate = async function (name, mode, description, data, price) {
    return (await request('/templates', { method: 'POST', body: JSON.stringify({ name, mode, description, data, price: price || 0 }) })).template;
  };
  WF.apiDeleteTemplate = async function (id) {
    await request('/templates/' + id, { method: 'DELETE' });
  };

  // 计费
  WF.apiBillingMe = async function () { return await request('/billing/me'); };
  WF.apiRedeem = async function (code) { return await request('/billing/redeem', { method: 'POST', body: JSON.stringify({ code }) }); };
  WF.apiGetOrders = async function () { return (await request('/billing/orders')).orders; };
  WF.apiGetEarnings = async function () { return (await request('/billing/earnings')).earnings; };

  // 插件
  WF.apiGetPlugins = async function () { return (await request('/plugins')).plugins; };
  WF.apiCreatePlugin = async function (payload) { return (await request('/plugins', { method: 'POST', body: JSON.stringify(payload) })).plugin; };
  WF.apiDeletePlugin = async function (id) { await request('/plugins/' + id, { method: 'DELETE' }); };

  // 模板购买 / 审核
  WF.apiBuyTemplate = async function (id) { return await request('/templates/' + id + '/buy', { method: 'POST' }); };
  WF.apiReviewTemplate = async function (id, status, featured, note) {
    return await request('/templates/' + id + '/review', { method: 'POST', body: JSON.stringify({ status, featured, note }) });
  };

  // 云端 Copilot 任务
  WF.apiGetTasks = async function () { return (await request('/tasks')).tasks; };
  WF.apiPublishTask = async function (name, prompt, params) {
    return (await request('/tasks', { method: 'POST', body: JSON.stringify({ name, prompt, params }) })).task;
  };
  WF.apiReviewTask = async function (id, status, featured, note) {
    return await request('/tasks/' + id + '/review', { method: 'POST', body: JSON.stringify({ status, featured, note }) });
  };
  WF.apiUseTask = async function (id) { return await request('/tasks/' + id + '/use', { method: 'POST' }); };
  WF.apiDeleteTask = async function (id) { await request('/tasks/' + id, { method: 'DELETE' }); };

  // 邀请返佣
  WF.apiReferralMe = async function () { return await request('/referral/me'); };
  WF.apiReferralClaim = async function (code) { return await request('/referral/claim', { method: 'POST', body: JSON.stringify({ code }) }); };

  // 在线支付(PayFlow)
  WF.apiBillingCatalog = async function () { return await request('/billing/catalog'); };
  WF.apiBillingCheckout = async function (productId, kind) {
    return await request('/billing/checkout', { method: 'POST', body: JSON.stringify({ product_id: productId, kind }) });
  };
  WF.apiBillingOrderStatus = async function (orderNo) { return await request('/billing/checkout/' + orderNo); };
  WF.apiPayflowOrders = async function () { return (await request('/billing/payflow-orders')).orders; };

  // 定时巡检
  WF.apiGetScheduled = async function () { return (await request('/scheduled')).tasks; };
  WF.apiCreateScheduled = async function (name, projectId, prompt) {
    return (await request('/scheduled', { method: 'POST', body: JSON.stringify({ name, project_id: projectId, prompt }) })).task;
  };
  WF.apiRunScheduled = async function (id) { return await request('/scheduled/' + id + '/run', { method: 'POST' }); };
  WF.apiToggleScheduled = async function (id, enabled) {
    return await request('/scheduled/' + id + '/toggle', { method: 'POST', body: JSON.stringify({ enabled }) });
  };
  WF.apiDeleteScheduled = async function (id) { await request('/scheduled/' + id, { method: 'DELETE' }); };

  // 巡检最新结果
  WF.apiScheduledLatest = async function (projectId) {
    const qs = projectId ? ("?project_id=" + encodeURIComponent(projectId)) : "";
    return (await request('/scheduled/latest' + qs)).latest;
  };

  // 通知中心
  WF.apiGetNotifications = async function () { return await request('/notifications'); };
  WF.apiReadNotifications = async function () { return await request('/notifications/read', { method: 'POST' }); };

  // 插件市场
  WF.apiBuyPlugin = async function (id) { return await request('/plugins/' + id + '/buy', { method: 'POST' }); };
  WF.apiReviewPlugin = async function (id, status, note) {
    return await request('/plugins/' + id + '/review', { method: 'POST', body: JSON.stringify({ status, note }) });
  };
  WF.apiReviewQueue = async function () { return await request('/review/queue'); };

  // Agent Copilot
  WF.apiCopilot = async function (message, mode, blocks, selectedId) {
    return await request('/ai/copilot', { method: 'POST', body: JSON.stringify({ message, mode, blocks, selectedId }) });
  };

  // AI 生成落地页
  WF.apiAiGenerate = async function (prompt, mode) {
    return await request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, mode }),
    });
  };

  // 转化看板聚合统计
  WF.apiGetEventStats = async function (projectId) {
    const qs = projectId ? ("?project_id=" + encodeURIComponent(projectId)) : "";
    const data = await request(`/events/stats${qs}`);
    return data.stats;
  };

  // 通过分享链接获取项目
  WF.apiGetSharedProject = async function (shareToken) {
    const data = await request(`/projects/share/${shareToken}`);
    return data.project;
  };

  // ============================================================
  //  同步功能
  // ============================================================

  // 同步本地项目到云端(按名称去重:已存在则更新,否则新建)
  WF.apiSyncToCloud = async function () {
    const user = getStoredUser();
    if (!user) throw new Error('请先登录');

    const localProjects = WF.listProjects();
    let cloudProjects = [];
    try { cloudProjects = await WF.apiGetProjects(); } catch (e) { cloudProjects = []; }

    const syncedProjects = [];
    for (const project of localProjects) {
      const payload = {
        theme: project.theme,
        global: project.global,
        blocks: project.blocks,
      };
      try {
        const existing = cloudProjects.find((c) => c.name === project.name);
        if (existing) {
          await WF.apiUpdateProject(existing.id, {
            name: project.name,
            mode: project.mode,
            description: (project.global && project.global.description) || '',
            data: payload,
          });
          syncedProjects.push(project.id);
        } else {
          await WF.apiCreateProject(project.name, project.mode, payload, (project.global && project.global.description) || '');
          syncedProjects.push(project.id);
        }
      } catch (e) {
        console.warn(`同步项目 ${project.name} 失败:`, e);
      }
    }

    return syncedProjects;
  };

  // 从云端下载项目到本地
  WF.apiSyncFromCloud = async function () {
    const user = getStoredUser();
    if (!user) throw new Error('请先登录');
    
    const cloudProjects = await WF.apiGetProjects();
    const importedProjects = [];
    
    for (const cloudProject of cloudProjects) {
      try {
        const fullProject = await WF.apiGetProject(cloudProject.id);
        
        // 检查本地是否已存在
        const localProjects = WF.listProjects();
        const exists = localProjects.some(p => p.name === fullProject.name);
        
        if (!exists) {
          WF.importProject({
            name: fullProject.name,
            mode: fullProject.mode,
            theme: fullProject.data.theme,
            global: fullProject.data.global,
            blocks: fullProject.data.blocks,
          });
          importedProjects.push(fullProject.name);
        }
      } catch (e) {
        console.warn(`下载项目 ${cloudProject.name} 失败:`, e);
      }
    }
    
    return importedProjects;
  };

})(window.WF);
