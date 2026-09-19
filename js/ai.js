/* ============================================================
 * WebsFlow · AI 辅助模块 (ai.js)
 *
 * 功能:
 *   - AI 文案生成:基于模块类型自动生成文案
 *   - AI 配色建议:智能配色方案推荐
 *   - AI 布局优化:自动调整间距、对齐
 *
 * 设计理念:
 *   - 本地优先:所有 AI 功能基于本地规则引擎,无需联网
 *   - 即时反馈:点击即生成,实时预览效果
 *   - 可定制:生成结果可手动微调
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // ============================================================
  //  AI 文案生成器
  // ============================================================

  // 文案模板库
  const copyTemplates = {
    // 通用标题模板
    titles: {
      hero: [
        "让{产品}更{效果}",
        "{动词}你的{场景}",
        "从{起点}到{终点},只需一步",
        "重新定义{领域}",
        "{数字}分钟,{效果}",
        "告别{痛点},拥抱{收益}",
      ],
      features: [
        "为什么选择{品牌}",
        "{品牌}的核心优势",
        "为{目标}而生",
        "每个细节,都为{价值}而生",
      ],
      cta: [
        "现在开始,{效果}",
        "立即体验,{价值}",
        "加入{数字}万+用户",
        "免费开始,{承诺}",
      ],
      pricing: [
        "选择适合你的方案",
        "简单透明的价格",
        "按需选择,随时调整",
      ],
      testimonials: [
        "听听他们怎么说",
        "{数字}万+用户的信任",
        "真实用户,真实评价",
      ],
      faq: [
        "你可能想问",
        "常见问题解答",
        "还有疑问?看看这里",
      ],
    },

    // 通用副标题模板
    subtitles: {
      hero: [
        "无需代码,轻松搭建专业{场景}。",
        "从想法到上线,只需{数字}分钟。",
        "为{目标人群}量身打造的{类型}工具。",
        "简单、高效、专业,一切尽在掌握。",
      ],
      features: [
        "每一个功能,都为你的{场景}而设计。",
        "从{起点}到{终点},我们全程陪伴。",
        "让复杂的事情变简单,让简单的事情更高效。",
      ],
      cta: [
        "无需信用卡,免费试用{数字}天。",
        "立即注册,开启你的{场景}之旅。",
        "加入我们,一起改变{领域}。",
      ],
    },

    // 特性描述模板
    featureDescriptions: [
      "{动词}即所得,所见即所得。",
      "一键{操作},{效果}。",
      "智能{功能},让{场景}更简单。",
      "专业级{能力},人人可用。",
      "{数字}秒完成{任务}。",
      "支持{格式},{场景}无忧。",
    ],

    // 评价模板
    testimonials: [
      "用了{产品}之后,{效果}提升了很多,强烈推荐！",
      "{产品}让我的{场景}效率提高了{数字}倍。",
      "从{起点}到{终点},只用了{时间},太棒了！",
      "客服响应很快,问题都能得到及时解决。",
      "界面简洁,功能强大,是我用过最好的{类型}工具。",
    ],

    // FAQ 模板
    faqs: [
      { q: "需要会写代码吗?", a: "完全不需要。所有内容通过可视化编辑,像搭积木一样简单。" },
      { q: "支持手机端吗?", a: "支持。所有页面自动适配手机、平板和电脑。" },
      { q: "可以绑定自己的域名吗?", a: "可以。专业版支持绑定自定义域名。" },
      { q: "数据安全吗?", a: "非常安全。我们采用企业级加密,数据多重备份。" },
      { q: "可以导出页面吗?", a: "可以。支持导出为单文件 HTML,随处部署。" },
    ],

    // 价格方案模板
    pricingTiers: [
      { name: "入门版", price: "¥0", unit: "/月", desc: "个人尝鲜", feats: "基础功能\n社区支持" },
      { name: "专业版", price: "¥99", unit: "/月", desc: "首选方案", feats: "全部功能\n优先支持\n自定义域名" },
      { name: "企业版", price: "¥299", unit: "/月", desc: "团队协作", feats: "含专业版全部\n多人协作\n专属顾问" },
    ],

    // 团队成员模板
    teamMembers: [
      { name: "张三", role: "创始人 & CEO", bio: "连续创业者,专注产品设计" },
      { name: "李四", role: "技术负责人", bio: "全栈工程师,热爱开源" },
      { name: "王五", role: "设计总监", bio: "前大厂设计师,追求极致体验" },
      { name: "赵六", role: "市场总监", bio: "增长专家,操盘多个项目" },
    ],

    // 博客文章模板
    blogPosts: [
      { title: "如何用{产品}快速搭建{场景}", excerpt: "本文介绍从零开始的全流程...", category: "教程" },
      { title: "2026年{领域}趋势分析", excerpt: "今年有哪些变化值得关注...", category: "观点" },
      { title: "{数字}个技巧提升你的{能力}", excerpt: "实用技巧,立竿见影...", category: "技巧" },
    ],

    // 产品描述模板
    products: [
      { name: "经典款", desc: "品质之选,经久耐用", price: "¥199" },
      { name: "旗舰款", desc: "顶级配置,极致体验", price: "¥499" },
      { name: "限定款", desc: "限量发售,独特设计", price: "¥899" },
    ],
  };

  // 填充模板
  function fillTemplate(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  // 随机选择
  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // AI 文案生成主函数
  WF.aiGenerateCopy = function (blockType, context) {
    context = context || {};
    const brand = context.brand || "你的品牌";
    const product = context.product || "产品";
    const result = {};

    switch (blockType) {
      case "hero":
        result.title = fillTemplate(randomPick(copyTemplates.titles.hero), {
          产品: product,
          效果: "高效",
          动词: "重新定义",
          场景: "工作方式",
          起点: "想法",
          终点: "上线",
          领域: "行业标准",
          数字: "5",
        });
        result.subtitle = fillTemplate(randomPick(copyTemplates.subtitles.hero), {
          场景: "官网",
          数字: "5",
          目标人群: "创业者",
          类型: "建站",
        });
        result.btnText = "立即开始";
        result.btn2Text = "了解更多";
        break;

      case "features":
        result.title = fillTemplate(randomPick(copyTemplates.titles.features), { 品牌: brand });
        result.subtitle = randomPick(copyTemplates.subtitles.features).replace(/\{场景\}/g, "体验");
        result.items = [
          { icon: "⚡", title: "极速搭建", desc: randomPick(copyTemplates.featureDescriptions).replace(/\{动词\}/, "拖拽").replace(/\{效果\}/, "5分钟上线") },
          { icon: "🎨", title: "主题定制", desc: randomPick(copyTemplates.featureDescriptions).replace(/\{操作\}/, "换肤").replace(/\{效果\}/, "全局更新") },
          { icon: "📦", title: "一键导出", desc: randomPick(copyTemplates.featureDescriptions).replace(/\{功能\}/, "导出").replace(/\{场景\}/, "部署") },
        ];
        break;

      case "testimonials":
        result.title = randomPick(copyTemplates.titles.testimonials).replace(/\{数字\}/, "10");
        result.items = copyTemplates.testimonials.slice(0, 3).map((t, i) => ({
          quote: fillTemplate(t, { 产品: product, 效果: "效率", 数字: "3", 起点: "零基础", 终点: "专家", 时间: "一周" }),
          name: ["林小满", "Kevin 王", "阿茅"][i],
          role: ["市场经理", "独立开发者", "设计工作室主理人"][i],
        }));
        break;

      case "pricing":
        result.title = randomPick(copyTemplates.titles.pricing);
        result.subtitle = "按需选择,随时升级或降级";
        result.items = copyTemplates.pricingTiers.map(t => ({
          ...t,
          badge: t.name === "专业版" ? "最受欢迎" : "",
          featured: t.name === "专业版" ? "featured" : "",
          btnText: t.price === "¥0" ? "免费开始" : "立即订阅",
        }));
        break;

      case "faq":
        result.title = randomPick(copyTemplates.titles.faq);
        result.items = copyTemplates.faqs.slice(0, 3);
        break;

      case "team":
        result.title = "我们的团队";
        result.subtitle = "一群有激情的人,在做有意义的事";
        result.items = copyTemplates.teamMembers;
        break;

      case "blog":
        result.title = "最新文章";
        result.subtitle = "分享思考与洞察";
        result.items = copyTemplates.blogPosts.map(p => ({
          ...p,
          title: fillTemplate(p.title, { 产品: product, 领域: "设计", 数字: "5", 能力: "效率" }),
          date: "2026-09-15",
          image: "",
        }));
        break;

      case "product-showcase":
        result.title = "精选产品";
        result.subtitle = "为你推荐优质好物";
        result.items = copyTemplates.products;
        result.btnText = "立即购买";
        break;

      case "cta":
        result.title = fillTemplate(randomPick(copyTemplates.titles.cta), {
          效果: "开启高效之旅",
          价值: "无限可能",
          数字: "10",
          承诺: "无需信用卡",
        });
        result.subtitle = randomPick(copyTemplates.subtitles.cta).replace(/\{数字\}/, "14").replace(/\{场景\}/, product);
        result.btnText = "免费开始";
        break;

      default:
        result.title = "模块标题";
        result.subtitle = "在这里添加描述文字";
        break;
    }

    return result;
  };

  // ============================================================
  //  AI 配色建议
  // ============================================================

  // 配色方案库
  const colorSchemes = {
    // 行业配色方案
    industry: {
      tech: { name: "科技蓝", primary: "#2563eb", primarySoft: "#eff6ff", bg: "#ffffff", surface: "#f8fafc", text: "#0f172a", muted: "#64748b", border: "#e2e8f0" },
      finance: { name: "金融金", primary: "#b45309", primarySoft: "#fef3c7", bg: "#fffdf7", surface: "#faf3e3", text: "#292018", muted: "#857666", border: "#eadfc8" },
      health: { name: "健康绿", primary: "#059669", primarySoft: "#ecfdf5", bg: "#ffffff", surface: "#f0fdf4", text: "#1a2e22", muted: "#6b7f74", border: "#d7e8dd" },
      creative: { name: "创意紫", primary: "#7c3aed", primarySoft: "#f5f3ff", bg: "#ffffff", surface: "#faf5ff", text: "#1e1b4b", muted: "#6b7280", border: "#e5e7eb" },
      food: { name: "美食橙", primary: "#ea580c", primarySoft: "#fff7ed", bg: "#fffdf9", surface: "#fef3e7", text: "#1c1917", muted: "#78716c", border: "#f5e7d8" },
      fashion: { name: "时尚粉", primary: "#db2777", primarySoft: "#fdf2f8", bg: "#fffafa", surface: "#fdf2f8", text: "#3b1f2b", muted: "#97707f", border: "#f6dfe7" },
      education: { name: "教育青", primary: "#0891b2", primarySoft: "#ecfeff", bg: "#ffffff", surface: "#f0f9ff", text: "#0c2430", muted: "#5f7d8c", border: "#d8ecf2" },
      luxury: { name: "奢华黑", primary: "#d4af37", primarySoft: "#fef9c3", bg: "#0f172a", surface: "#1e293b", text: "#f1f5f9", muted: "#94a3b8", border: "#334155" },
    },

    // 情感配色方案
    mood: {
      warm: { name: "温暖", primary: "#ea580c", primarySoft: "#fff7ed", bg: "#fffdf9", surface: "#fef3e7" },
      cool: { name: "冷静", primary: "#2563eb", primarySoft: "#eff6ff", bg: "#ffffff", surface: "#f8fafc" },
      energetic: { name: "活力", primary: "#dc2626", primarySoft: "#fef2f2", bg: "#ffffff", surface: "#fef2f2" },
      calm: { name: "平静", primary: "#059669", primarySoft: "#ecfdf5", bg: "#ffffff", surface: "#f0fdf4" },
      playful: { name: "活泼", primary: "#7c3aed", primarySoft: "#f5f3ff", bg: "#ffffff", surface: "#faf5ff" },
    },
  };

  // AI 配色建议主函数
  WF.aiSuggestColors = function (context) {
    context = context || {};
    const industry = context.industry || "tech";
    const mood = context.mood || "professional";

    // 根据行业选择基础配色
    const baseScheme = colorSchemes.industry[industry] || colorSchemes.industry.tech;

    // 添加圆角和字体建议
    return {
      ...baseScheme,
      radius: industry === "creative" ? 20 : industry === "finance" ? 8 : 16,
      font: industry === "fashion" || industry === "food" ? "round" : industry === "luxury" ? "serif" : "sans",
    };
  };

  // 根据主色生成配色方案
  WF.aiGenerateSchemeFromColor = function (primaryColor) {
    // 简单的配色逻辑:根据主色生成配套颜色
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 生成浅色背景
    const lightR = Math.min(255, r + 230);
    const lightG = Math.min(255, g + 230);
    const lightB = Math.min(255, b + 230);
    const primarySoft = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;

    return {
      primary: primaryColor,
      primarySoft: primarySoft,
      bg: "#ffffff",
      surface: primarySoft + "40",
      text: "#111827",
      muted: "#6b7280",
      border: "#e5e7eb",
    };
  };

  // ============================================================
  //  AI 布局优化
  // ============================================================

  // 布局建议规则
  const layoutRules = {
    // 间距建议
    padding: {
      hero: { top: 108, bottom: 108 },
      features: { top: 72, bottom: 72 },
      cta: { top: 80, bottom: 80 },
      default: { top: 72, bottom: 72 },
    },

    // 对齐建议
    alignment: {
      hero: "center",
      features: "center",
      pricing: "center",
      testimonials: "center",
      split: "left",
      text: "left",
    },

    // 列数建议
    columns: {
      features: { min: 2, max: 4, recommended: 3 },
      pricing: { min: 2, max: 3, recommended: 3 },
      testimonials: { min: 2, max: 3, recommended: 3 },
      gallery: { min: 2, max: 4, recommended: 3 },
    },
  };

  // AI 布局优化主函数
  WF.aiOptimizeLayout = function (blocks) {
    const optimizations = [];

    blocks.forEach((block, index) => {
      const type = block.type;
      const style = block.style || {};
      const props = block.props || {};

      // 检查间距
      const paddingRule = layoutRules.padding[type] || layoutRules.padding.default;
      if (style.padding === "tight" && (type === "hero" || type === "cta")) {
        optimizations.push({
          blockId: block.id,
          type: "padding",
          message: `建议将「${WF.Blocks[type].name}」的间距调整为「标准」或「宽松」,以获得更好的视觉效果。`,
          suggestion: { padding: "normal" },
        });
      }

      // 检查对齐
      const alignmentRule = layoutRules.alignment[type];
      if (alignmentRule && props.align && props.align !== alignmentRule) {
        optimizations.push({
          blockId: block.id,
          type: "alignment",
          message: `「${WF.Blocks[type].name}」通常使用${alignmentRule === "center" ? "居中" : "居左"}对齐效果更好。`,
          suggestion: { align: alignmentRule },
        });
      }

      // 检查列数
      const columnRule = layoutRules.columns[type];
      if (columnRule && props.cols) {
        const cols = parseInt(props.cols);
        if (cols < columnRule.min || cols > columnRule.max) {
          optimizations.push({
            blockId: block.id,
            type: "columns",
            message: `「${WF.Blocks[type].name}」建议使用 ${columnRule.recommended} 列布局。`,
            suggestion: { cols: String(columnRule.recommended) },
          });
        }
      }
    });

    return optimizations;
  };

  // 应用布局优化
  WF.aiApplyOptimization = function (block, optimization) {
    if (!block || !optimization) return false;

    if (optimization.type === "padding" || optimization.type === "alignment") {
      Object.assign(block.style, optimization.suggestion);
    } else {
      Object.assign(block.props, optimization.suggestion);
    }

    return true;
  };

  // ============================================================
  //  AI 助手面板
  // ============================================================

  // 生成 AI 助手面板 HTML
  WF.aiPanelHTML = function (blockType, context) {
    const hasBlock = !!blockType;
    return `
      <div class="ai-panel">
        <div class="ai-panel__header">
          <span class="ai-panel__icon">🤖</span>
          <span class="ai-panel__title">AI 助手</span>
        </div>
        <div class="ai-panel__body">
          ${hasBlock ? `
            <div class="ai-section">
              <div class="ai-section__title">文案生成</div>
              <p class="ai-section__desc">为「${WF.Blocks[blockType].name}」模块生成示例文案</p>
              <button class="ed-btn is-primary ai-btn" data-ai="generate-copy" data-type="${blockType}">
                ✨ 生成文案
              </button>
            </div>
          ` : ''}
          <div class="ai-section">
            <div class="ai-section__title">配色建议</div>
            <p class="ai-section__desc">根据行业推荐配色方案</p>
            <div class="ai-color-options">
              ${Object.entries(colorSchemes.industry).map(([key, scheme]) =>
                `<button class="ai-color-chip" data-ai="suggest-color" data-industry="${key}" title="${scheme.name}">
                  <span style="background:${scheme.primary}"></span>
                </button>`
              ).join('')}
            </div>
          </div>
          <div class="ai-section">
            <div class="ai-section__title">布局优化</div>
            <p class="ai-section__desc">分析当前页面并给出优化建议</p>
            <button class="ed-btn ai-btn" data-ai="optimize-layout">
              🔍 分析布局
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // AI 配色方案名称映射
  WF.aiColorSchemeNames = Object.fromEntries(
    Object.entries(colorSchemes.industry).map(([k, v]) => [k, v.name])
  );

})(window.WF);
