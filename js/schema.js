/* ============================================================
 * WebsFlow · 内容模型注册表 (schema.js)
 *
 * 理念来源 — Sanity / Contentful:
 *   "内容与呈现分离"。每个模块 = 一份带 schema 的结构化文档,
 *   字段定义驱动右侧检查器自动生成表单,同一份内容可被
 *   四种形态适配器(site/h5/ppt/story)渲染成完全不同的页面。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // ---------- 形态(输出端适配器) ----------
  WF.Modes = {
    site: {
      key: "site", name: "官网", icon: "🌐",
      desc: "桌面优先的品牌官网 / 产品落地页,模块纵向堆叠,支持导航锚点。",
      canvasWidth: "desktop", defaultDevice: "desktop",
      color: "#4f46e5", soft: "#eef2ff",
    },
    h5: {
      key: "h5", name: "H5 页面", icon: "📱",
      desc: "手机竖版传播页:活动邀请、产品介绍、报名表单,支持底部悬浮按钮。",
      canvasWidth: "phone", defaultDevice: "phone",
      color: "#db2777", soft: "#fdf2f8",
    },
    ppt: {
      key: "ppt", name: "线上 PPT", icon: "🖥️",
      desc: "16:9 幻灯片,键盘翻页、全屏放映,导出即是一场可分享的在线演示。",
      canvasWidth: "deck", defaultDevice: "deck",
      color: "#0891b2", soft: "#ecfeff",
    },
    story: {
      key: "story", name: "互动故事", icon: "✨",
      desc: "滚动叙事页:入场动画、阅读进度条、热点标注与互动问答。",
      canvasWidth: "desktop", defaultDevice: "desktop",
      color: "#d97706", soft: "#fffbeb",
    },
  };

  // ---------- 字段类型说明 ----------
  // text / textarea / select(options) / toggle / number / color / image / url / datetime / list(item)

  const F = {
    title: { key: "title", label: "标题", type: "text", placeholder: "输入标题" },
    subtitle: { key: "subtitle", label: "副标题", type: "textarea", rows: 2, placeholder: "一句话补充说明" },
    eyebrow: { key: "eyebrow", label: "眉题(小标签)", type: "text", placeholder: "如:PRODUCT" },
    align: { key: "align", label: "对齐", type: "select", options: [["left", "居左"], ["center", "居中"]] },
    bg: { key: "bg", label: "背景色", type: "color", hint: "留空使用主题默认" },
    btn: { key: "btnText", label: "按钮文字", type: "text", placeholder: "如:立即体验" },
    btnLink: { key: "btnLink", label: "按钮链接", type: "url", placeholder: "https:// 或 #锚点" },
    image: { key: "image", label: "图片", type: "image", placeholder: "粘贴图片链接或上传" },
    padding: { key: "padding", label: "上下留白", type: "select", options: [["tight", "紧凑"], ["normal", "标准"], ["loose", "宽松"]] },
    anim: { key: "anim", label: "入场动画", type: "select", options: [["up", "上浮"], ["left", "左入"], ["right", "右入"], ["zoom", "缩放"], ["none", "无"]], hint: "在官网/互动故事形态的导出页生效" },
  };

  // ---------- 模块注册表 ----------
  WF.Blocks = {

    /* ============ 结构 ============ */
    nav: {
      name: "导航栏", icon: "🧭", category: "结构", modes: ["site"],
      desc: "品牌名 + 锚点菜单 + 行动按钮,吸顶显示。",
      defaults: { brand: "你的品牌", links: [{ label: "特性" }, { label: "评价" }, { label: "价格" }, { label: "常见问题" }], btnText: "免费开始", btnLink: "#" },
      fields: [
        { key: "brand", label: "品牌名", type: "text" },
        { key: "links", label: "菜单项(点击文字跳转对应模块)", type: "list", itemFields: [{ key: "label", label: "菜单文字", type: "text" }] },
        F.btn, F.btnLink,
      ],
      summary: (p) => p.brand,
    },

    hero: {
      name: "主视觉", icon: "🌟", category: "结构", modes: ["site", "h5", "story"],
      desc: "大标题 + 副标题 + 按钮组合,支持渐变或图片背景。",
      defaults: {
        eyebrow: "", badge: "", title: "把想法,变成页面",
        subtitle: "无需代码,拖拽模块即可搭建官网、H5、PPT 与互动故事。",
        btnText: "立即开始", btnLink: "#",
        btn2Text: "了解更多", btn2Link: "#",
        bgType: "gradient", gradient: "indigo", image: "", align: "center",
      },
      fields: [
        { key: "badge", label: "顶部胶囊标签", type: "text", placeholder: "如:全新 2.0 上线" },
        F.title, F.subtitle, F.btn, F.btnLink,
        { key: "btn2Text", label: "副按钮文字", type: "text" },
        { key: "btn2Link", label: "副按钮链接", type: "url" },
        { key: "bgType", label: "背景类型", type: "select", options: [["gradient", "渐变色"], ["image", "图片"], ["plain", "纯色"]] },
        { key: "gradient", label: "渐变方案", type: "select", options: [["indigo", "靛蓝"], ["sunset", "日落橙"], ["forest", "森林绿"], ["rose", "浪漫粉"], ["night", "深空夜"], ["aqua", "水岸青"]] },
        { ...F.image, hint: "背景图片地址,选用后自动加深色遮罩保证文字可读" },
        F.align,
      ],
      summary: (p) => p.title,
    },

    text: {
      name: "文字段落", icon: "📝", category: "结构", modes: ["site", "h5", "story", "ppt"],
      desc: "标题 + 多行正文,适合声明、介绍与过渡。",
      defaults: { title: "关于我们", body: "在这里写下你的故事。\n支持多行文字,会保留换行。", align: "center" },
      fields: [F.title, { key: "body", label: "正文", type: "textarea", rows: 6 }, F.align],
      summary: (p) => p.title,
    },

    split: {
      name: "图文分栏", icon: "📐", category: "结构", modes: ["site", "h5", "story", "ppt"],
      desc: "左图右文 / 右图左文,介绍功能与场景。",
      defaults: { title: "一个标题讲清价值", body: "描述这个功能的细节,为什么用户需要它,它能带来什么改变。", image: "", flip: false, btnText: "", btnLink: "" },
      fields: [
        F.title,
        { key: "body", label: "正文", type: "textarea", rows: 5 },
        F.image, { key: "flip", label: "图文位置", type: "select", options: [["", "图左文右"], ["flip", "图右文左"]] },
        F.btn, F.btnLink,
      ],
      summary: (p) => p.title,
    },

    footer: {
      name: "页脚", icon: "🦶", category: "结构", modes: ["site", "h5"],
      desc: "品牌信息、链接与版权声明。",
      defaults: { brand: "你的品牌", desc: "用更好的方式,把想法带给世界。", links: [{ label: "关于我们" }, { label: "联系方式" }, { label: "服务条款" }], copyright: "© 2026 你的品牌" },
      fields: [
        { key: "brand", label: "品牌名", type: "text" },
        { key: "desc", label: "品牌简介", type: "textarea", rows: 2 },
        { key: "links", label: "链接", type: "list", itemFields: [{ key: "label", label: "文字", type: "text" }, { key: "href", label: "链接", type: "url" }] },
        { key: "copyright", label: "版权行", type: "text" },
      ],
      summary: (p) => p.brand,
    },

    /* ============ 展示 ============ */
    features: {
      name: "特性网格", icon: "🧩", category: "展示", modes: ["site", "h5", "story", "ppt"],
      desc: "图标 + 标题 + 描述的卡片网格,展示核心能力。",
      defaults: {
        title: "核心特性", subtitle: "每一个细节,都为效率而生", align: "center", cols: "3",
        items: [
          { icon: "⚡", title: "极速搭建", desc: "拖拽即所得,五分钟上线一个页面。" },
          { icon: "🎨", title: "主题定制", desc: "一键换主题,全局配色字体统一更新。" },
          { icon: "📦", title: "一键导出", desc: "导出单个 HTML 文件,随处部署分享。" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "特性项", type: "list", itemFields: [
          { key: "icon", label: "图标(emoji)", type: "text", placeholder: "如 🚀" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "特性网格",
    },

    gallery: {
      name: "图片墙", icon: "🖼️", category: "展示", modes: ["site", "h5", "story"],
      desc: "图片网格 + 可选说明文字。",
      defaults: { title: "精彩瞬间", subtitle: "", align: "center", cols: "3", items: [{ image: "", caption: "" }, { image: "", caption: "" }, { image: "", caption: "" }] },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "图片", type: "list", itemFields: [F.image, { key: "caption", label: "说明文字", type: "text" }] },
      ],
      summary: (p) => p.title || "图片墙",
    },

    stats: {
      name: "数据统计", icon: "📊", category: "展示", modes: ["site", "h5", "story", "ppt"],
      desc: "大数字 + 标签,用数据建立信任。",
      defaults: { align: "center", cols: "4", items: [{ value: "10", suffix: "万+", label: "累计用户" }, { value: "99.9", suffix: "%", label: "服务可用性" }, { value: "50", suffix: "+", label: "行业案例" }, { value: "24", suffix: "h", label: "支持响应" }] },
      fields: [
        F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "数据项", type: "list", itemFields: [
          { key: "value", label: "数值", type: "text" },
          { key: "suffix", label: "后缀", type: "text", placeholder: "如 + 或 %" },
          { key: "label", label: "标签", type: "text" },
        ] },
      ],
      summary: () => "数据统计",
    },

    timeline: {
      name: "时间线 / 流程", icon: "🕒", category: "展示", modes: ["site", "h5", "story", "ppt"],
      desc: "纵向节点列表,讲历程、流程或议程。",
      defaults: { title: "活动流程", items: [
        { time: "14:00", title: "签到入场", desc: "领取伴手礼与胸牌" },
        { time: "14:30", title: "主题演讲", desc: "创始团队分享产品故事" },
        { time: "15:30", title: "自由交流", desc: "茶歇与嘉宾圆桌" },
      ] },
      fields: [
        F.title,
        { key: "items", label: "节点", type: "list", itemFields: [
          { key: "time", label: "时间 / 小标", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "时间线",
    },

    pricing: {
      name: "价格表", icon: "💳", category: "展示", modes: ["site", "h5", "ppt"],
      desc: "多档价格卡片,支持推荐标记。",
      defaults: {
        title: "选择适合你的方案", subtitle: "随时升级或降级,不设隐形费用", align: "center", cols: "3",
        items: [
          { name: "入门版", price: "¥0", unit: "/月", desc: "个人尝鲜", feats: "3 个页面\n基础模块\n社区支持", badge: "", featured: "", btnText: "免费开始" },
          { name: "专业版", price: "¥39", unit: "/月", desc: "自由职业者首选", feats: "无限页面\n全部模块\n自定义域名\n优先支持", badge: "最受欢迎", featured: "featured", btnText: "立即订阅" },
          { name: "团队版", price: "¥99", unit: "/月", desc: "多人协作", feats: "含专业版全部\n10 个成员席位\n品牌资产库\n专属顾问", badge: "", featured: "", btnText: "联系我们" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"]] },
        { key: "items", label: "价格档位", type: "list", itemFields: [
          { key: "name", label: "方案名", type: "text" },
          { key: "price", label: "价格", type: "text" },
          { key: "unit", label: "单位", type: "text" },
          { key: "desc", label: "一句话说明", type: "text" },
          { key: "feats", label: "包含内容(每行一条)", type: "textarea", rows: 4 },
          { key: "badge", label: "角标", type: "text", placeholder: "如:最受欢迎" },
          { key: "featured", label: "高亮推荐", type: "select", options: [["", "否"], ["featured", "是"]] },
          { key: "btnText", label: "按钮文字", type: "text" },
        ] },
      ],
      summary: (p) => p.title || "价格表",
    },

    testimonials: {
      name: "用户评价", icon: "💬", category: "展示", modes: ["site", "h5", "ppt"],
      desc: "引用式评价卡片,附头像与身份。",
      defaults: {
        title: "他们都在用", align: "center", cols: "3",
        items: [
          { quote: "五分钟就把活动页做好了,同事还以为我外包给设计公司。", name: "林小满", role: "市场经理" },
          { quote: "内容一次编辑,官网和 H5 都能出,双倍效率。", name: "Kevin 王", role: "独立开发者" },
          { quote: "导出一个 HTML 发给客户就能演示,太省心了。", name: "阿茅", role: "设计工作室主理人" },
        ],
      },
      fields: [
        F.title, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"]] },
        { key: "items", label: "评价", type: "list", itemFields: [
          { key: "quote", label: "评价内容", type: "textarea", rows: 3 },
          { key: "name", label: "姓名", type: "text" },
          { key: "role", label: "身份 / 公司", type: "text" },
          { key: "avatar", label: "头像图片", type: "image" },
        ] },
      ],
      summary: (p) => p.title || "用户评价",
    },

    faq: {
      name: "常见问题", icon: "❓", category: "展示", modes: ["site", "h5", "story"],
      desc: "可展开的手风琴问答。",
      defaults: {
        title: "常见问题", align: "center",
        items: [
          { q: "需要会写代码吗?", a: "完全不需要。所有内容通过可视化表单编辑,像填问卷一样简单。" },
          { q: "做好的页面放在哪里?", a: "可导出为单个 HTML 文件,上传任意静态空间即可,也可导出 JSON 随时再编辑。" },
          { q: "支持手机端吗?", a: "支持。官网导出自带响应式布局,H5 形态更是专为手机而生。" },
        ],
      },
      fields: [
        F.title, F.align,
        { key: "items", label: "问答", type: "list", itemFields: [
          { key: "q", label: "问题", type: "text" },
          { key: "a", label: "答案", type: "textarea", rows: 3 },
        ] },
      ],
      summary: (p) => p.title || "常见问题",
    },

    cta: {
      name: "行动号召", icon: "📣", category: "展示", modes: ["site", "h5", "story"],
      desc: "高亮横幅,引导用户注册、购买或报名。",
      defaults: { title: "现在开始,五分钟上线", subtitle: "无需信用卡,免费模板随取随用", btnText: "免费创建", btnLink: "#", style: "gradient" },
      fields: [F.title, F.subtitle, F.btn, F.btnLink, { key: "style", label: "样式", type: "select", options: [["primary", "主题色"], ["gradient", "渐变"], ["surface", "浅色卡片"]] }],
      summary: (p) => p.title,
    },

    video: {
      name: "视频", icon: "🎬", category: "展示", modes: ["site", "h5", "story"],
      desc: "嵌入 B 站 / 抖音 / YouTube 等平台视频。",
      defaults: { title: "", url: "" },
      fields: [
        F.title,
        { key: "url", label: "视频页链接", type: "url", placeholder: "https://www.bilibili.com/video/BV…", hint: "支持 B 站、YouTube、Vimeo 或任意 iframe 嵌入地址,粘贴视频观看页链接即可自动转换" },
      ],
      summary: () => "视频",
    },

    tabs: {
      name: "选项卡", icon: "🗂️", category: "展示", modes: ["site", "story"],
      desc: "多页签切换展示不同内容。",
      defaults: {
        items: [
          { tab: "产品设计", title: "为美而生", body: "从字体到间距,每个像素都经过打磨。", image: "" },
          { tab: "工程实现", title: "为快而生", body: "首屏加载小于一秒,动效流畅不卡顿。", image: "" },
        ],
      },
      fields: [
        { key: "items", label: "页签", type: "list", itemFields: [
          { key: "tab", label: "页签名", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "body", label: "内容", type: "textarea", rows: 3 },
          F.image,
        ] },
      ],
      summary: () => "选项卡",
    },

    /* ============ 互动 ============ */
    countdown: {
      name: "倒计时", icon: "⏳", category: "互动", modes: ["site", "h5", "story"],
      desc: "活动截止倒计时,自动走秒。",
      defaults: { title: "距离开幕还有", target: "", note: "早鸟票限时发售中" },
      fields: [
        F.title,
        { key: "target", label: "截止时间", type: "datetime" },
        { key: "note", label: "备注", type: "text" },
      ],
      summary: () => "倒计时",
    },

    quiz: {
      name: "互动问答", icon: "🎯", category: "互动", modes: ["site", "h5", "story"],
      desc: "单选题:点击作答,即时判定对错并显示解析。",
      defaults: {
        question: "以下哪项不属于本产品的能力?",
        options: [
          { text: "拖拽搭建页面", correct: "" },
          { text: "一键导出 HTML", correct: "" },
          { text: "帮你写检讨书", correct: "correct" },
        ],
        explanation: "开个玩笑 —— 页面搭建、导出、主题都是基础操作,但写检讨这件事还是自己来吧。",
      },
      fields: [
        { key: "question", label: "问题", type: "textarea", rows: 2 },
        { key: "options", label: "选项(勾选正确项)", type: "list", itemFields: [
          { key: "text", label: "选项文字", type: "text" },
          { key: "correct", label: "正确答案", type: "select", options: [["", "否"], ["correct", "✓ 正确"]] },
        ] },
        { key: "explanation", label: "答案解析", type: "textarea", rows: 3 },
      ],
      summary: (p) => p.question,
    },

    hotspot: {
      name: "图片热点", icon: "📍", category: "互动", modes: ["site", "story", "h5"],
      desc: "在图片上放置可点击的标注点,讲产品细节。",
      defaults: {
        image: "",
        items: [
          { x: 30, y: 40, label: "新工艺", desc: "采用航空级铝合金一体成型。" },
          { x: 68, y: 62, label: "长续航", desc: "30 天超长待机,告别电量焦虑。" },
        ],
      },
      fields: [
        F.image,
        { key: "items", label: "热点(坐标为图片百分比)", type: "list", itemFields: [
          { key: "x", label: "横向位置 %", type: "number" },
          { key: "y", label: "纵向位置 %", type: "number" },
          { key: "label", label: "标题", type: "text" },
          { key: "desc", label: "说明", type: "textarea", rows: 2 },
        ] },
      ],
      summary: () => "图片热点",
    },

    /* ============ 幻灯(PPT 专属) ============ */
    "slide-title": {
      name: "封面页", icon: "🎬", category: "幻灯", modes: ["ppt"],
      desc: "演示封面:主标题 + 演讲人与日期。",
      defaults: { badge: "BUSINESS PLAN", title: "小满咖啡 商业计划", subtitle: "让好咖啡走进日常", speaker: "演讲人:阿满", date: "2026 年 9 月" },
      fields: [
        { key: "badge", label: "顶部徽标文字", type: "text" },
        F.title, F.subtitle,
        { key: "speaker", label: "演讲人", type: "text" },
        { key: "date", label: "日期", type: "text" },
      ],
      summary: (p) => p.title,
    },
    "slide-bullets": {
      name: "要点页", icon: "📋", category: "幻灯", modes: ["ppt"],
      desc: "编号要点列表,陈述论据与计划。",
      defaults: { kicker: "WHY US", title: "为什么是现在?", items: [
        { title: "市场成熟", desc: "精品咖啡消费人群三年翻倍" },
        { title: "供应链就绪", desc: "云南庄园直采,成本下降 30%" },
        { title: "渠道空白", desc: "社区写字楼场景尚无强势品牌" },
      ] },
      fields: [
        { key: "kicker", label: "眉题", type: "text" },
        F.title,
        { key: "items", label: "要点", type: "list", itemFields: [
          { key: "title", label: "小标题", type: "text" },
          { key: "desc", label: "说明", type: "text" },
        ] },
      ],
      summary: (p) => p.title,
    },
    "slide-quote": {
      name: "金句页", icon: "❝", category: "幻灯", modes: ["ppt"],
      desc: "大字金句,用于转场与情绪渲染。",
      defaults: { quote: "我们不卖咖啡,我们卖的是上班路上的五分钟自由。", author: "—— 品牌手册第一页" },
      fields: [
        { key: "quote", label: "金句", type: "textarea", rows: 3 },
        { key: "author", label: "署名 / 出处", type: "text" },
      ],
      summary: (p) => (p.quote || "").slice(0, 20),
    },
    "slide-end": {
      name: "结尾页", icon: "🙏", category: "幻灯", modes: ["ppt"],
      desc: "致谢 + 联系方式,可放二维码。",
      defaults: { title: "谢谢观看", subtitle: "期待与你把咖啡做成事业", contact: "微信:xiaoman-cafe\n邮箱:hi@example.com", qr: "" },
      fields: [F.title, F.subtitle, { key: "contact", label: "联系方式", type: "textarea", rows: 3 }, { key: "qr", label: "二维码图片", type: "image" }],
      summary: (p) => p.title,
    },
  };

  // ---------- 分类 ----------
  WF.Categories = ["结构", "展示", "互动", "幻灯"];

  // ---------- 工具 ----------
  WF.getBlock = function (type) { return WF.Blocks[type] || null; };
  WF.blocksForMode = function (mode) {
    return Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].modes.includes(mode));
  };
  // 生成默认模块对象
  WF.newBlock = function (type) {
    const def = WF.Blocks[type];
    return {
      id: "b" + Math.random().toString(36).slice(2, 9),
      type,
      props: JSON.parse(JSON.stringify(def.defaults)),
      hidden: false,
      style: { bg: "", padding: "normal", anim: "up" },
    };
  };
})(window.WF);
