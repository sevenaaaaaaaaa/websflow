/* ============================================================
 * WebsFlow · 组件市场 (marketplace.js)
 *
 * 功能:
 *   - 模块导出:将单个模块导出为 JSON 文件
 *   - 模块导入:从 JSON 文件导入模块
 *   - 模块商店:浏览和使用社区贡献的模块
 *   - 收藏功能:收藏常用模块
 *
 * 设计理念:
 *   - 开放共享:任何人都可以贡献模块
 *   - 即用即走:导入即可使用,无需配置
 *   - 质量保证:社区评分和使用统计
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // ============================================================
  //  模块导入导出
  // ============================================================

  // 导出单个模块为 JSON
  WF.exportBlock = function (block) {
    if (!block) return null;
    const def = WF.Blocks[block.type];
    if (!def) return null;

    return {
      _meta: {
        type: "websflow-block",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        source: "WebsFlow 魔块",
      },
      type: block.type,
      name: def.name,
      icon: def.icon,
      category: def.category,
      modes: def.modes,
      props: JSON.parse(JSON.stringify(block.props)),
      style: JSON.parse(JSON.stringify(block.style || {})),
    };
  };

  // 导出模块为可下载文件
  WF.downloadBlock = function (block) {
    const data = WF.exportBlock(block);
    if (!data) return;

    const def = WF.Blocks[block.type];
    const filename = `${def.name}-${Date.now().toString(36)}.websflow-block.json`;
    const json = JSON.stringify(data, null, 2);
    
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);

    return filename;
  };

  // 从 JSON 导入模块
  WF.importBlock = function (data) {
    if (!data || data._meta?.type !== "websflow-block") {
      throw new Error("不是有效的 WebsFlow 模块文件");
    }

    const def = WF.Blocks[data.type];
    if (!def) {
      throw new Error(`未知的模块类型: ${data.type}`);
    }

    // 创建新模块,合并导入的数据和默认值
    return {
      id: "b" + Math.random().toString(36).slice(2, 9),
      type: data.type,
      props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), data.props || {}),
      hidden: false,
      style: Object.assign({ bg: "", padding: "normal", anim: "up" }, data.style || {}),
    };
  };

  // 从文件读取并导入模块
  WF.readBlockFile = function (file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          const block = WF.importBlock(data);
          resolve(block);
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(new Error("读取文件失败"));
      r.readAsText(file);
    });
  };

  // ============================================================
  //  模块收藏
  // ============================================================

  const FAVORITES_KEY = "websflow.favorites";

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(favs) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    } catch (e) {
      console.warn("保存收藏失败", e);
    }
  }

  // 获取收藏列表
  WF.getFavorites = function () {
    return loadFavorites();
  };

  // 添加收藏
  WF.addFavorite = function (blockType) {
    const favs = loadFavorites();
    if (!favs.includes(blockType)) {
      favs.push(blockType);
      saveFavorites(favs);
    }
    return favs;
  };

  // 移除收藏
  WF.removeFavorite = function (blockType) {
    let favs = loadFavorites();
    favs = favs.filter(t => t !== blockType);
    saveFavorites(favs);
    return favs;
  };

  // 检查是否已收藏
  WF.isFavorite = function (blockType) {
    return loadFavorites().includes(blockType);
  };

  // ============================================================
  //  社区模块库
  // ============================================================

  // 预置社区模块(示例)
  const communityBlocks = [
    {
      id: "community-hero-gradient",
      name: "渐变主视觉",
      type: "hero",
      description: "带渐变背景的主视觉模块,适合产品官网",
      author: "WebsFlow 官方",
      downloads: 1234,
      rating: 4.8,
      tags: ["官网", "渐变", "产品"],
      preview: "hero",
      props: {
        badge: "🎉 全新上线",
        title: "让产品更出色",
        subtitle: "简单、高效、专业,一切尽在掌握。",
        btnText: "立即体验",
        btn2Text: "了解更多",
        bgType: "gradient",
        gradient: "indigo",
        align: "center",
      },
    },
    {
      id: "community-features-icons",
      name: "图标特性网格",
      type: "features",
      description: "带 Emoji 图标的特性展示,清晰直观",
      author: "社区贡献者",
      downloads: 856,
      rating: 4.6,
      tags: ["特性", "图标", "网格"],
      preview: "features",
      props: {
        title: "核心优势",
        subtitle: "每一个功能都为效率而生",
        cols: "3",
        items: [
          { icon: "⚡", title: "极速响应", desc: "毫秒级加载,体验流畅" },
          { icon: "🔒", title: "安全可靠", desc: "数据加密,多重备份" },
          { icon: "🎯", title: "精准高效", desc: "智能算法,精准匹配" },
        ],
      },
    },
    {
      id: "community-pricing-simple",
      name: "简洁价格表",
      type: "pricing",
      description: "三档价格方案,清晰对比",
      author: "社区贡献者",
      downloads: 678,
      rating: 4.5,
      tags: ["价格", "方案", "对比"],
      preview: "pricing",
      props: {
        title: "选择你的方案",
        subtitle: "随时升级或降级",
        cols: "3",
        items: [
          { name: "基础版", price: "¥0", unit: "/月", desc: "个人使用", feats: "基础功能\n社区支持", badge: "", featured: "", btnText: "免费开始" },
          { name: "专业版", price: "¥99", unit: "/月", desc: "首选方案", feats: "全部功能\n优先支持\n自定义域名", badge: "最受欢迎", featured: "featured", btnText: "立即订阅" },
          { name: "企业版", price: "¥299", unit: "/月", desc: "团队协作", feats: "含专业版全部\n多人协作\n专属顾问", badge: "", featured: "", btnText: "联系我们" },
        ],
      },
    },
    {
      id: "community-testimonial-cards",
      name: "用户评价卡片",
      type: "testimonials",
      description: "带头像的用户评价展示",
      author: "社区贡献者",
      downloads: 543,
      rating: 4.7,
      tags: ["评价", "口碑", "信任"],
      preview: "testimonials",
      props: {
        title: "用户好评",
        cols: "3",
        items: [
          { quote: "非常棒的工具,效率提升了很多！", name: "张三", role: "产品经理" },
          { quote: "界面简洁,功能强大,强烈推荐。", name: "李四", role: "设计师" },
          { quote: "客服响应很快,问题都能及时解决。", name: "王五", role: "创业者" },
        ],
      },
    },
    {
      id: "community-cta-gradient",
      name: "渐变行动号召",
      type: "cta",
      description: "带渐变背景的行动号召模块",
      author: "WebsFlow 官方",
      downloads: 921,
      rating: 4.9,
      tags: ["CTA", "转化", "行动"],
      preview: "cta",
      props: {
        title: "准备好开始了吗?",
        subtitle: "立即注册,免费体验 14 天",
        btnText: "免费开始",
        btnLink: "#",
        style: "gradient",
      },
    },
    {
      id: "community-team-grid",
      name: "团队网格",
      type: "team",
      description: "四人团队展示,简洁大方",
      author: "社区贡献者",
      downloads: 432,
      rating: 4.4,
      tags: ["团队", "介绍", "人物"],
      preview: "team",
      props: {
        title: "核心团队",
        subtitle: "一群有梦想的人",
        cols: "4",
        items: [
          { name: "张三", role: "CEO", avatar: "", bio: "连续创业者" },
          { name: "李四", role: "CTO", avatar: "", bio: "技术专家" },
          { name: "王五", role: "设计总监", avatar: "", bio: "设计达人" },
          { name: "赵六", role: "市场总监", avatar: "", bio: "增长黑客" },
        ],
      },
    },
  ];

  // 获取社区模块列表
  WF.getCommunityBlocks = function (filters) {
    let blocks = [...communityBlocks];

    if (filters) {
      if (filters.type) {
        blocks = blocks.filter(b => b.type === filters.type);
      }
      if (filters.tag) {
        blocks = blocks.filter(b => b.tags.some(t => t.includes(filters.tag)));
      }
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        blocks = blocks.filter(b =>
          b.name.toLowerCase().includes(keyword) ||
          b.description.toLowerCase().includes(keyword) ||
          b.tags.some(t => t.includes(keyword))
        );
      }
    }

    return blocks;
  };

  // 使用社区模块
  WF.useCommunityBlock = function (communityBlock) {
    if (!communityBlock || !communityBlock.type) return null;

    const def = WF.Blocks[communityBlock.type];
    if (!def) return null;

    return {
      id: "b" + Math.random().toString(36).slice(2, 9),
      type: communityBlock.type,
      props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), communityBlock.props || {}),
      hidden: false,
      style: { bg: "", padding: "normal", anim: "up" },
    };
  };

  // ============================================================
  //  组件市场界面
  // ============================================================

  // 生成组件市场 HTML
  WF.marketplaceHTML = function (context) {
    const currentMode = context?.mode || "site";
    const categories = ["全部", "官网", "H5", "PPT", "特性", "评价", "价格", "转化"];
    const tags = ["热门", "最新", "官方", "社区"];

    return `
      <div class="marketplace">
        <div class="marketplace__header">
          <div class="marketplace__search">
            <input type="text" class="ed-input" placeholder="搜索模块..." data-marketplace="search">
          </div>
          <div class="marketplace__tags">
            ${tags.map(tag => `<button class="marketplace__tag" data-marketplace="tag" data-tag="${tag}">${tag}</button>`).join('')}
          </div>
        </div>
        <div class="marketplace__body">
          <div class="marketplace__sidebar">
            <div class="marketplace__categories">
              <div class="marketplace__cat-title">分类</div>
              ${categories.map((cat, i) => `<button class="marketplace__cat${i === 0 ? ' is-active' : ''}" data-marketplace="cat" data-cat="${cat}">${cat}</button>`).join('')}
            </div>
          </div>
          <div class="marketplace__content">
            <div class="marketplace__grid" data-marketplace="grid">
              ${communityBlocks.map(block => `
                <div class="marketplace__card" data-marketplace="use" data-id="${block.id}">
                  <div class="marketplace__card-preview">
                    <div class="marketplace__card-icon">${WF.Blocks[block.type]?.icon || '📦'}</div>
                  </div>
                  <div class="marketplace__card-info">
                    <div class="marketplace__card-name">${block.name}</div>
                    <div class="marketplace__card-desc">${block.description}</div>
                    <div class="marketplace__card-meta">
                      <span class="marketplace__card-author">${block.author}</span>
                      <span class="marketplace__card-stats">
                        <span title="下载">⬇ ${block.downloads}</span>
                        <span title="评分">⭐ ${block.rating}</span>
                      </span>
                    </div>
                    <div class="marketplace__card-tags">
                      ${block.tags.map(tag => `<span class="marketplace__card-tag">${tag}</span>`).join('')}
                    </div>
                  </div>
                  <button class="ed-btn is-primary marketplace__card-btn" data-marketplace="use" data-id="${block.id}">使用</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // 生成模块导入导出面板 HTML
  WF.blockIOPanelHTML = function (block) {
    const hasBlock = !!block;
    const blockDef = hasBlock ? WF.Blocks[block.type] : null;
    const isFav = hasBlock ? WF.isFavorite(block.type) : false;

    return `
      <div class="block-io-panel">
        <div class="block-io-panel__section">
          <div class="block-io-panel__title">导入模块</div>
          <p class="block-io-panel__desc">从 .websflow-block.json 文件导入模块</p>
          <button class="ed-btn" data-io="import-block">
            📂 导入模块文件
          </button>
          <input type="file" accept=".json,.websflow-block.json" style="display:none" data-io="import-file">
        </div>
        ${hasBlock ? `
          <div class="block-io-panel__section">
            <div class="block-io-panel__title">导出当前模块</div>
            <p class="block-io-panel__desc">将「${blockDef.name}」导出为可分享的文件</p>
            <button class="ed-btn" data-io="export-block">
              💾 导出模块
            </button>
          </div>
          <div class="block-io-panel__section">
            <div class="block-io-panel__title">收藏</div>
            <button class="ed-btn ${isFav ? 'is-fav' : ''}" data-io="toggle-fav" data-type="${block.type}">
              ${isFav ? '❤️ 已收藏' : '🤍 添加收藏'}
            </button>
          </div>
        ` : ''}
        <div class="block-io-panel__section">
          <div class="block-io-panel__title">我的收藏</div>
          <div class="block-io-panel__favorites">
            ${WF.getFavorites().map(type => {
              const def = WF.Blocks[type];
              return def ? `<button class="block-io-panel__fav-item" data-io="add-fav" data-type="${type}">
                <span class="block-io-panel__fav-icon">${def.icon}</span>
                <span class="block-io-panel__fav-name">${def.name}</span>
              </button>` : '';
            }).join('')}
            ${WF.getFavorites().length === 0 ? '<div class="block-io-panel__empty">暂无收藏</div>' : ''}
          </div>
        </div>
      </div>
    `;
  };

})(window.WF);
