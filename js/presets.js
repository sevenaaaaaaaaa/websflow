/* ============================================================
 * WebsFlow · 片段库 (presets.js)
 * 可复用的模块组合(区块片段):内置 + 自定义(本地)
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  function mk(type, props, style) {
    const b = WF.newBlock(type);
    b.props = Object.assign(b.props, props || {});
    if (style) b.style = Object.assign(b.style, style);
    return b;
  }

  WF.SectionPresets = [
    {
      key: "trust-trio", name: "信任三件套", desc: "数字信任条 + 评价 + 品牌墙",
      build: () => [mk("proof"), mk("testimonials"), mk("logo-wall")],
    },
    {
      key: "pain-solution", name: "痛点 → 方法", desc: "痛点小卡 + 步骤旅程",
      build: () => [mk("cluster"), mk("journey")],
    },
    {
      key: "price-social", name: "价格 + 口碑", desc: "价格表 + 用户评价 + FAQ",
      build: () => [mk("pricing"), mk("testimonials"), mk("faq")],
    },
    {
      key: "closing", name: "收尾转化", desc: "FAQ + 行动号召 + 联系表单 + 页脚",
      build: () => [mk("faq"), mk("cta"), mk("form"), mk("footer")],
    },
    {
      key: "lead-form", name: "留资组合", desc: "信任条 + 表单 + 社交链接",
      build: () => [mk("proof", { cols: "3" }), mk("form"), mk("social")],
    },
    {
      key: "two-col-hero", name: "双栏主视觉+特性", desc: "左文右图主视觉 + 三列特性",
      build: () => {
        const hero = mk("hero", { bgType: "gradient", gradient: "indigo", align: "left" });
        hero.variant = "split";
        return [hero, mk("features")];
      },
    },
    {
      key: "section-2col", name: "两栏容器(示例)", desc: "两栏并排:左特性行 + 右评价",
      build: () => {
        const sec = mk("section", { cols: "2" });
        const left = mk("features", { cols: "1" });
        left.variant = "list"; left.col = 0;
        const right = mk("testimonials", { cols: "1" });
        right.variant = "bigquote"; right.col = 1;
        sec.children = [left, right];
        return [sec];
      },
    },
  ];

  // ---------- 旅程模板(触发 → 多步动作) ----------
  WF.JourneyTemplates = [
    {
      key: "first-visit-guide", name: "首访引导", desc: "停留 20s 未点击 → 优惠条 → 再过 15s 弹窗(带券)",
      build: () => ({
        name: "首访引导", enabled: true,
        when: { type: "time_on_page", value: 20, requireNoClick: true, visitor: "new" },
        then: [
          { type: "bar", text: "新朋友你好:首单立减 20 元", coupon: "WELCOME10", linkText: "去使用", link: "#cta" },
          { type: "popup", delay: 15, title: "需要帮你看一眼落地页吗?", body: "留下联系方式,我们 30 分钟内给你一份诊断建议。", linkText: "预约诊断", link: "#form", if: { requireNoClick: true } },
        ],
      }),
    },
    {
      key: "exit-rescue", name: "离站挽留", desc: "退出意图 → 弹窗挽留 → 15s 后补发优惠条",
      build: () => ({
        name: "离站挽留", enabled: true,
        when: { type: "exit_intent" },
        then: [
          { type: "popup", title: "先别走,送你一份诊断清单", body: "把邮箱留给我们,清单和首单优惠一起发你。", linkText: "领取清单", link: "#form" },
          { type: "bar", delay: 15, text: "限时:首单立减 20 元", coupon: "WELCOME10" },
        ],
      }),
    },
    {
      key: "deep-read-nudge", name: "深读催单", desc: "滚动到 70% 且未点击 → 优惠条;再过 20s 弹窗",
      build: () => ({
        name: "深读催单", enabled: true,
        when: { type: "scroll_depth", value: 70, requireNoClick: true },
        then: [
          { type: "bar", text: "看到这里,说明有兴趣 —— 首单立减 20", coupon: "WELCOME10", linkText: "立即购买", link: "#cta" },
          { type: "popup", delay: 20, title: "要现在锁定优惠吗?", body: "优惠券 24 小时内有效,随时可以用。", linkText: "去结算", link: "#cta", if: { requireNoClick: true } },
        ],
      }),
    },
    {
      key: "ad-src-welcome", name: "广告来源定制", desc: "UTM 命中 ads → 立刻显示广告专属优惠条",
      build: () => ({
        name: "广告专属欢迎", enabled: true,
        when: { type: "utm", value: "ads" },
        then: [{ type: "bar", text: "来自广告的你,专享首单 8 折", coupon: "ADS20", linkText: "去使用", link: "#cta" }],
      }),
    },
  ];

  const KEY = "websflow.presets";

  WF.getCustomPresets = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
  };

  WF.saveCustomPreset = function (name, blocks) {
    const list = WF.getCustomPresets();
    list.unshift({ key: "c" + Date.now().toString(36), name: name, desc: (blocks.length + " 个模块"), custom: true, blocks: JSON.parse(JSON.stringify(blocks)) });
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
    return list;
  };

  WF.removeCustomPreset = function (key) {
    const list = WF.getCustomPresets().filter((x) => x.key !== key);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  };

  // 取片段的可插入块(自定义片段已存快照,内置片段现场构建并重置 id)
  WF.presetBlocks = function (preset) {
    const raw = preset.custom ? JSON.parse(JSON.stringify(preset.blocks || [])) : (preset.build ? preset.build() : []);
    const reid = (b) => {
      b.id = "b" + Math.random().toString(36).slice(2, 9);
      if (b.children) b.children.forEach(reid);
      return b;
    };
    return raw.map((b) => WF.normalizeBlock(reid(b))).filter(Boolean);
  };
})(window.WF);
