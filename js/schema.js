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
      variants: [["center", "居中大标题"], ["split", "左文右图"], ["fullscreen", "全屏主图"]], defaultVariant: "center",
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
      variants: [["cards", "卡片网格"], ["list", "列表行"], ["numbered", "编号步骤"]], defaultVariant: "cards",
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
      variants: [["cards", "卡片"], ["bigquote", "大字引言"], ["avatars", "头像墙"]], defaultVariant: "cards",
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
      variants: [["panel", "卡片面板"], ["banner", "通栏横幅"], ["split", "左文右按钮"]], defaultVariant: "panel",
      defaults: { title: "现在开始,五分钟上线", subtitle: "无需信用卡,免费模板随取随用", btnText: "免费创建", btnLink: "#", style: "gradient" },
      fields: [F.title, F.subtitle, F.btn, F.btnLink, { key: "style", label: "样式", type: "select", options: [["primary", "主题色"], ["gradient", "渐变"], ["surface", "浅色卡片"]] },
        { key: "goalId", label: "转化目标 ID", type: "text", placeholder: "如 cta-signup", hint: "点击按钮时向统计端点上报,用于转化数据统计" }],
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

    /* ============ 表单与交互 ============ */
    form: {
      name: "联系表单", icon: "📋", category: "表单", modes: ["site", "h5", "story"],
      desc: "收集用户信息的表单:姓名、邮箱、留言等。",
      defaults: {
        title: "联系我们", subtitle: "有任何问题,欢迎随时联系", align: "center",
        fields: [
          { label: "姓名", type: "text", required: true, placeholder: "请输入您的姓名" },
          { label: "邮箱", type: "email", required: true, placeholder: "请输入您的邮箱" },
          { label: "电话", type: "tel", required: false, placeholder: "请输入您的电话" },
          { label: "留言", type: "textarea", required: false, placeholder: "请输入您的留言内容" },
        ],
        submitText: "提交",
        successMessage: "感谢您的留言,我们会尽快回复！",
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "fields", label: "表单字段", type: "list", itemFields: [
          { key: "label", label: "字段标签", type: "text" },
          { key: "type", label: "字段类型", type: "select", options: [["text", "文本"], ["email", "邮箱"], ["tel", "电话"], ["textarea", "多行文本"], ["select", "下拉选择"]] },
          { key: "required", label: "是否必填", type: "select", options: [["", "否"], ["true", "是"]] },
          { key: "placeholder", label: "占位提示", type: "text" },
        ] },
        { key: "submitText", label: "提交按钮文字", type: "text" },
        { key: "successMessage", label: "成功提示", type: "text" },
      ],
      summary: (p) => p.title || "联系表单",
    },

    map: {
      name: "地图", icon: "🗺️", category: "展示", modes: ["site", "h5", "story"],
      desc: "显示位置的地图,支持标记点和信息窗口。",
      defaults: {
        title: "我们的位置", subtitle: "", align: "center",
        address: "北京市朝阳区建国门外大街1号",
        lat: 39.908823, lng: 116.397470,
        zoom: 15, mapStyle: "light",
        markers: [
          { name: "总部", address: "北京市朝阳区建国门外大街1号", lat: 39.908823, lng: 116.397470 },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "address", label: "地址", type: "text" },
        { key: "lat", label: "纬度", type: "number", hint: "如:39.908823" },
        { key: "lng", label: "经度", type: "number", hint: "如:116.397470" },
        { key: "zoom", label: "缩放级别", type: "number", hint: "1-20,默认15" },
        { key: "mapStyle", label: "地图样式", type: "select", options: [["light", "简约浅灰(推荐)"], ["satellite", "卫星影像"], ["street", "街道"], ["topo", "地形"], ["osm", "OpenStreetMap"]], hint: "中国区街道/地形在高缩放级别可能无数据,建议用浅灰或卫星" },
        { key: "tileUrl", label: "自定义瓦片地址(高级)", type: "text", hint: "留空使用内置样式;支持 {z}/{x}/{y} 占位,如自建/代理瓦片服务" },
        { key: "markers", label: "标记点", type: "list", itemFields: [
          { key: "name", label: "名称", type: "text" },
          { key: "address", label: "地址", type: "text" },
          { key: "lat", label: "纬度", type: "number" },
          { key: "lng", label: "经度", type: "number" },
        ] },
      ],
      summary: (p) => p.title || "地图",
    },

    social: {
      name: "社交链接", icon: "🔗", category: "展示", modes: ["site", "h5", "story", "ppt"],
      desc: "社交媒体图标链接:微信、微博、抖音、GitHub 等。",
      defaults: {
        title: "关注我们", subtitle: "获取最新动态与优惠信息", align: "center",
        items: [
          { platform: "wechat", label: "微信公众号", url: "", qr: "" },
          { platform: "weibo", label: "微博", url: "https://weibo.com" },
          { platform: "douyin", label: "抖音", url: "" },
          { platform: "github", label: "GitHub", url: "https://github.com" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "items", label: "社交链接", type: "list", itemFields: [
          { key: "platform", label: "平台", type: "select", options: [["wechat", "微信"], ["weibo", "微博"], ["douyin", "抖音"], ["xiaohongshu", "小红书"], ["github", "GitHub"], ["twitter", "Twitter/X"], ["linkedin", "LinkedIn"], ["email", "邮箱"], ["phone", "电话"]] },
          { key: "label", label: "显示名称", type: "text" },
          { key: "url", label: "链接地址", type: "url" },
          { key: "qr", label: "二维码图片", type: "image", hint: "微信可放二维码图片" },
        ] },
      ],
      summary: () => "社交链接",
    },

    blog: {
      name: "博客文章", icon: "📰", category: "展示", modes: ["site", "story"],
      desc: "文章列表:标题、摘要、日期与封面图。",
      defaults: {
        title: "最新文章", subtitle: "分享产品思考与行业洞察", align: "center", cols: "3",
        items: [
          { title: "如何用 WebsFlow 10 分钟搭建官网", excerpt: "本文介绍从零开始搭建一个完整官网的全流程...", date: "2026-09-15", image: "", category: "教程" },
          { title: "2026 年网页设计趋势", excerpt: "从极简主义到沉浸式体验,今年的设计趋势有哪些变化...", date: "2026-09-10", image: "", category: "设计" },
          { title: "为什么零代码工具正在改变市场", excerpt: "越来越多的企业和个人选择零代码工具来构建数字产品...", date: "2026-09-05", image: "", category: "观点" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"]] },
        { key: "items", label: "文章", type: "list", itemFields: [
          { key: "title", label: "标题", type: "text" },
          { key: "excerpt", label: "摘要", type: "textarea", rows: 2 },
          { key: "date", label: "日期", type: "text", placeholder: "2026-09-15" },
          { key: "image", label: "封面图", type: "image" },
          { key: "category", label: "分类", type: "text" },
        ] },
      ],
      summary: (p) => p.title || "博客文章",
    },

    "product-showcase": {
      name: "产品展示", icon: "🛍️", category: "展示", modes: ["site", "h5", "story", "ppt"],
      desc: "产品卡片:图片、名称、价格与购买按钮。",
      defaults: {
        title: "精选产品", subtitle: "为你推荐优质好物", align: "center", cols: "3",
        items: [
          { name: "经典款T恤", price: "¥199", originalPrice: "¥299", image: "", badge: "热销", desc: "100%纯棉,舒适透气" },
          { name: "休闲卫衣", price: "¥399", originalPrice: "", image: "", badge: "新品", desc: "加绒保暖,秋冬必备" },
          { name: "牛仔裤", price: "¥499", originalPrice: "¥699", image: "", badge: "限时折扣", desc: "修身版型,显瘦百搭" },
        ],
        btnText: "立即购买",
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "产品", type: "list", itemFields: [
          { key: "name", label: "产品名称", type: "text" },
          { key: "price", label: "价格", type: "text" },
          { key: "originalPrice", label: "原价", type: "text", placeholder: "留空不显示" },
          { key: "image", label: "产品图片", type: "image" },
          { key: "badge", label: "角标", type: "text", placeholder: "如:新品、热销" },
          { key: "desc", label: "简短描述", type: "text" },
        ] },
        { key: "btnText", label: "按钮文字", type: "text" },
      ],
      summary: (p) => p.title || "产品展示",
    },

    team: {
      name: "团队成员", icon: "👥", category: "展示", modes: ["site", "story", "ppt"],
      desc: "团队介绍:头像、姓名、职位与简介。",
      defaults: {
        title: "我们的团队", subtitle: "一群有激情的人,在做有意义的事", align: "center", cols: "4",
        items: [
          { name: "张三", role: "创始人 & CEO", avatar: "", bio: "连续创业者,10年产品经验" },
          { name: "李四", role: "技术负责人", avatar: "", bio: "全栈工程师,开源贡献者" },
          { name: "王五", role: "设计总监", avatar: "", bio: "前大厂设计主管,红点奖获得者" },
          { name: "赵六", role: "市场总监", avatar: "", bio: "增长黑客,操盘多个百万级项目" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "成员", type: "list", itemFields: [
          { key: "name", label: "姓名", type: "text" },
          { key: "role", label: "职位", type: "text" },
          { key: "avatar", label: "头像", type: "image" },
          { key: "bio", label: "简介", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "团队成员",
    },

    section: {
      name: "分栏容器", icon: "▦", category: "结构", modes: ["site", "h5", "story"],
      desc: "把模块放进 1-3 栏容器里并排布局(拖入/移出在「大纲」面板操作)。",
      container: true,
      defaults: { cols: "2", gap: "normal", bg: "" },
      fields: [
        { key: "cols", label: "列数", type: "select", options: [["1", "1 栏"], ["2", "2 栏"], ["3", "3 栏"]] },
        { key: "gap", label: "栏间距", type: "select", options: [["tight", "紧凑"], ["normal", "标准"], ["loose", "宽松"]] },
      ],
      summary: (p) => `${p.cols || 2} 栏容器`,
    },

    /* ============ 转化与社交证明(借鉴 OpenFlow 转化底座) ============ */
    proof: {
      name: "信任数字条", icon: "🛡️", category: "社交证明", modes: ["site", "h5", "story"],
      desc: "数字 + 说明的信任条,放 hero 下方建立第一屏信任。",
      defaults: {
        align: "center", cols: "3",
        items: [
          { value: "1000+", label: "服务网站与品牌" },
          { value: "3.5×", label: "AI 搜索推荐流量增长" },
          { value: "30 分钟", label: "免费增长诊断" },
        ],
        note: "数据来自近一年客户复盘与行业调研",
      },
      fields: [
        F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "信任数据", type: "list", itemFields: [
          { key: "value", label: "数值", type: "text", placeholder: "如 1000+ / 3.5×" },
          { key: "label", label: "标签", type: "text" },
        ] },
        { key: "note", label: "备注", type: "text", placeholder: "数据来源说明,可留空" },
      ],
      summary: () => "信任数字条",
    },

    "logo-wall": {
      name: "品牌背书墙", icon: "🏷️", category: "社交证明", modes: ["site", "h5", "story"],
      desc: "客户/合作品牌的文字 Logo 墙,零图片依赖。",
      defaults: {
        title: "他们正在使用", subtitle: "", align: "center", cols: "6",
        items: [
          { name: "芒果传媒" }, { name: "拾光工作室" }, { name: "山海文化" },
          { name: "北极星科技" }, { name: "青屿笔记" }, { name: "小满咖啡" },
        ],
      },
      fields: [
        F.title, F.align,
        { key: "cols", label: "列数", type: "select", options: [["4", "4 列"], ["5", "5 列"], ["6", "6 列"]] },
        { key: "items", label: "品牌", type: "list", itemFields: [
          { key: "name", label: "名称", type: "text" },
        ] },
      ],
      summary: (p) => p.title || "品牌背书墙",
    },

    journey: {
      name: "步骤旅程", icon: "🧭", category: "结构", modes: ["site", "h5", "story"],
      desc: "自动编号的步骤条,讲清「先做什么再做什么」。",
      defaults: {
        title: "从诊断到增长,只需要四步", subtitle: "", align: "center",
        items: [
          { title: "诊断", desc: "30 分钟访谈,讲清内容、获客与转化三个环节的短板" },
          { title: "开方", desc: "输出一份可落地的起步方案,按优先级排好顺序" },
          { title: "落地", desc: "我们动手改,你看数据,每周同步进展" },
          { title: "放大", desc: "把跑通的路子加预算复制,形成增长闭环" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "items", label: "步骤", type: "list", itemFields: [
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "步骤旅程",
    },

    cluster: {
      name: "痛点小卡", icon: "🎯", category: "展示", modes: ["site", "h5", "story"],
      desc: "密集的小卡片阵,每条都是「标题 + 归因描述」的痛点表达。",
      defaults: {
        title: "网站还在,增长却先「失灵」了", subtitle: "三个最常见的信号", align: "center", cols: "3",
        items: [
          { icon: "📉", title: "有流量,没线索", desc: "61% 的企业网站获得了流量,却没把访客变成线索——问题不在内容,在链路。" },
          { icon: "🤖", title: "AI 搜索在改写规则", desc: "GEO 带来的推荐流量增长是传统 SEO 的 3.5 倍,而多数官网还没被 AI 推荐过。" },
          { icon: "🔗", title: "触点散落各处", desc: "官网、广告、社群、公众号各说各话,用户每换一个触点就要重新建立信任。" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "痛点卡片", type: "list", itemFields: [
          { key: "icon", label: "图标(emoji)", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "痛点小卡",
    },

    marquee: {
      name: "滚动横幅", icon: "🎞️", category: "展示", modes: ["site", "h5", "story"],
      desc: "无缝滚动的词条横幅,悬停暂停,适合能力/关键词列表。",
      defaults: {
        items: ["SEO / GEO", "内容引擎", "AI Agent", "营销自动化", "线索闭环", "数据看板"],
      },
      fields: [
        { key: "items", label: "词条", type: "list", itemFields: [
          { key: "text", label: "文字", type: "text" },
        ] },
      ],
      summary: () => "滚动横幅",
    },

    banner: {
      name: "公告横条", icon: "📢", category: "转化", modes: ["site", "h5", "story"],
      desc: "置顶公告条:新品、活动、限时信息,可带跳转链接。",
      defaults: {
        text: "🎉 全新 1.1 上线:AI 助手与组件市场来了",
        linkText: "查看详情", link: "#",
      },
      fields: [
        { key: "text", label: "公告文字", type: "text" },
        { key: "linkText", label: "按钮文字", type: "text", placeholder: "留空不显示链接" },
        { key: "link", label: "按钮链接", type: "url" },
      ],
      summary: (p) => p.text,
    },

    bento: {
      name: "Bento 网格", icon: "🍱", category: "展示", modes: ["site", "h5", "story"],
      desc: "不等宽的拼贴网格:大卡讲主线,小卡讲细节。",
      defaults: {
        title: "一条工作流,连起整条链路", subtitle: "", align: "center", cols: "3",
        items: [
          { icon: "🧲", title: "触达", desc: "落地页、广告素材、社媒图,一处生成处处一致。", span: "2", image: "" },
          { icon: "🔭", title: "洞察", desc: "行为数据自动回流成人群画像。", span: "1", image: "" },
          { icon: "🎛️", title: "个性化", desc: "按人群切换内容与话术。", span: "1", image: "" },
          { icon: "🔁", title: "复购", desc: "自动化触达把新客变成常客。", span: "1", image: "" },
          { icon: "📊", title: "看板", desc: "漏斗一眼看清,短板早发现。", span: "1", image: "" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "卡片", type: "list", itemFields: [
          { key: "icon", label: "图标(emoji)", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
          { key: "span", label: "跨度", type: "select", options: [["1", "占 1 格"], ["2", "占 2 格"]] },
          F.image,
        ] },
      ],
      summary: (p) => p.title || "Bento 网格",
    },

    comparison: {
      name: "对比表", icon: "⚖️", category: "转化", modes: ["site", "h5", "story"],
      desc: "左右两列对比:我们 vs 传统方式,帮访客快速决策。",
      defaults: {
        title: "为什么选 WebsFlow", subtitle: "", align: "center",
        planA: "WebsFlow", planB: "传统建站",
        items: [
          { feature: "上手成本", a: "零代码,双击即用", b: "开发排期,按周计价" },
          { feature: "加载速度", a: "单文件零依赖", b: "插件拖慢首屏" },
          { feature: "SEO 能力", a: "OG 与结构化数据自带", b: "逐项配置插件" },
          { feature: "数据归属", a: "本机 + 自选云端", b: "锁定在平台" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "planA", label: "左列表头", type: "text" },
        { key: "planB", label: "右列表头", type: "text" },
        { key: "items", label: "对比行", type: "list", itemFields: [
          { key: "feature", label: "对比项", type: "text" },
          { key: "a", label: "左列内容", type: "text" },
          { key: "b", label: "右列内容", type: "text" },
        ] },
      ],
      summary: (p) => p.title || "对比表",
    },

    "before-after": {
      name: "前后对比", icon: "🪄", category: "展示", modes: ["site", "h5", "story"],
      desc: "改造前 / 改造后两张图并排,直观呈现效果。",
      defaults: {
        title: "改造前后", subtitle: "", align: "center",
        beforeImage: "", beforeLabel: "改造前",
        afterImage: "", afterLabel: "改造后",
        note: "",
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "beforeImage", label: "前图", type: "image" },
        { key: "beforeLabel", label: "前图标签", type: "text" },
        { key: "afterImage", label: "后图", type: "image" },
        { key: "afterLabel", label: "后图标签", type: "text" },
        { key: "note", label: "说明", type: "text", placeholder: "可留空" },
      ],
      summary: (p) => p.title || "前后对比",
    },

    prompt: {
      name: "提示词启动器", icon: "✍️", category: "转化", modes: ["site", "h5", "story"],
      desc: "深色卡片展示一条示例提示词 + 场景标签,适合 AI 产品演示。",
      defaults: {
        subtitle: "从一句话开始",
        title: "为我的独立咖啡品牌生成一套产品页:主视觉、菜单卡片、会员方案与线下活动报名页,风格温暖、字体亲和。",
        items: [
          { text: "落地页" }, { text: "活动页" }, { text: "会员方案" }, { text: "数据看板" },
        ],
        btnText: "生成页面", btnLink: "#",
      },
      fields: [
        { key: "subtitle", label: "眉题", type: "text" },
        { key: "title", label: "提示词正文", type: "textarea", rows: 4 },
        { key: "items", label: "场景标签", type: "list", itemFields: [
          { key: "text", label: "文字", type: "text" },
        ] },
        F.btn, F.btnLink,
      ],
      summary: (p) => (p.title || "").slice(0, 18),
    },

    "tool-grid": {
      name: "工具网格", icon: "🧰", category: "展示", modes: ["site", "h5", "story"],
      desc: "工具卡阵:图标 + 标签 + ★ 评分,适合产品矩阵/功能总览。",
      defaults: {
        title: "工具箱", subtitle: "每个工具都可直接替换成你的", align: "center", cols: "3",
        items: [
          { icon: "🛠️", title: "落地页生成器", desc: "选场景即得成品,替换文字即可发布", tag: "推荐", rating: "4.9" },
          { icon: "📬", title: "邮件头图工场", desc: "品牌素材自动套版,批量出图", tag: "", rating: "4.7" },
          { icon: "📊", title: "数据看板", desc: "漏斗一眼看清,短板早发现", tag: "新", rating: "4.8" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["2", "2 列"], ["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "工具卡片", type: "list", itemFields: [
          { key: "icon", label: "图标(emoji)", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
          { key: "tag", label: "角标", type: "text", placeholder: "如 推荐 / 新" },
          { key: "rating", label: "评分", type: "text", placeholder: "如 4.9" },
        ] },
      ],
      summary: (p) => p.title || "工具网格",
    },

    accordion: {
      name: "折叠面板", icon: "📂", category: "结构", modes: ["site", "h5", "story"],
      desc: "原生 details 折叠面板,零 JS,适合路线图/阶段说明。",
      defaults: {
        title: "实施路线", subtitle: "", align: "center",
        items: [
          { title: "第一阶段 · 打地基", desc: "内容与 SEO 基线,先把现有资产理顺。" },
          { title: "第二阶段 · 被 AI 推荐", desc: "GEO 结构化数据上线,争取搜索与 AI 双入口。" },
          { title: "第三阶段 · 跑通闭环", desc: "人群定向与转化目标联动,数据回流指导下一轮。" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "items", label: "折叠项", type: "list", itemFields: [
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "内容", type: "textarea", rows: 3 },
        ] },
      ],
      summary: (p) => p.title || "折叠面板",
    },

    portrait: {
      name: "竖版卡片", icon: "🃏", category: "展示", modes: ["site", "h5", "story"],
      desc: "竖版 3:4 图卡的网格,适合人群/场景/案例。",
      defaults: {
        title: "适合谁", subtitle: "", align: "center", cols: "4",
        items: [
          { image: "", title: "独立开发者", desc: "官网与活动页一手全包" },
          { image: "", title: "增长团队", desc: "快速起量验证素材" },
          { image: "", title: "咨询顾问", desc: "给客户交付诊断落地页" },
          { image: "", title: "电商卖家", desc: "活动页与会员页随时上新" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "cols", label: "列数", type: "select", options: [["3", "3 列"], ["4", "4 列"]] },
        { key: "items", label: "卡片", type: "list", itemFields: [
          { key: "image", label: "图片", type: "image" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "竖版卡片",
    },

    showcase: {
      name: "编号展示", icon: "🔢", category: "展示", modes: ["site", "h5", "story"],
      desc: "图文交错的自动编号展示,讲「三步看懂」最合适。",
      defaults: {
        title: "三步看懂", subtitle: "", align: "center",
        items: [
          { title: "建页面", desc: "选场景模板,替换文字,5 分钟得到成品。", image: "" },
          { title: "发出去", desc: "导出单文件 HTML,挂到任意静态空间。", image: "" },
          { title: "看转化", desc: "CTA 绑定转化目标,点击数据自动回流。", image: "" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "items", label: "图文项", type: "list", itemFields: [
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
          F.image,
        ] },
      ],
      summary: (p) => p.title || "编号展示",
    },

    changelog: {
      name: "更新日志", icon: "📜", category: "展示", modes: ["site", "h5", "story"],
      desc: "版本历史卡列表,让用户看到产品在持续进化。",
      defaults: {
        title: "更新日志", subtitle: "", align: "center",
        items: [
          { tag: "v1.4", date: "2026-09-16", title: "模块体系补全", desc: "工具网格、折叠面板、竖版卡片等 5 个新模块。" },
          { tag: "v1.3", date: "2026-09-16", title: "转化闭环", desc: "人群定向与 CTA 转化目标统计上线。" },
          { tag: "v1.0", date: "2026-09-16", title: "正式发布", desc: "国际化、组件市场与云同步。" },
        ],
      },
      fields: [
        F.title, F.subtitle, F.align,
        { key: "items", label: "日志条目", type: "list", itemFields: [
          { key: "tag", label: "版本号", type: "text" },
          { key: "date", label: "日期", type: "text" },
          { key: "title", label: "标题", type: "text" },
          { key: "desc", label: "描述", type: "textarea", rows: 2 },
        ] },
      ],
      summary: (p) => p.title || "更新日志",
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

  // ---------- 插件区块(动态注册) ----------
  WF.Plugins = {};
  // 插件模板渲染:{{字段}} 与 {{#items}}...{{/items}}
  WF.sanitizeHtml = function (html) {
    let s = String(html == null ? "" : html);
    ["script", "style", "iframe", "object", "embed", "form"].forEach(function (tag) {
      s = s.replace(new RegExp("<" + tag + "\\b[^>]*>[\\s\\S]*?<\\/" + tag + ">", "gi"), "");
      s = s.replace(new RegExp("<" + tag + "\\b[^>]*\\/?>", "gi"), "");
    });
    s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    s = s.replace(/(href|src)\s*=\s*("|')?\s*(javascript|vbscript|data:text\/html)[^"'>\s]*("|')?/gi, "$1=\"#\"");
    return s;
  };
  WF.renderPlugin = function (plugin, props) {
    const val = (k) => {
      const v = props[k];
      return v == null ? "" : WF.esc(String(v));
    };
    let tpl = String(plugin.template || "");
    tpl = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, key, inner) => {
      const arr = Array.isArray(props[key]) ? props[key] : [];
      return arr.map((it) => inner.replace(/\{\{(\w+)\}\}/g, (mm, k) => {
        const v = it && it[k];
        return v == null ? "" : WF.esc(String(v));
      })).join("");
    });
    tpl = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => val(k));
    return WF.sanitizeHtml(tpl);
  };
  WF.registerPluginBlocks = function (list) {
    (list || []).forEach((pl) => {
      const type = pl.block_type;
      if (!type || WF.Blocks[type] || !pl.template) return; // 锁定/无模板的插件不注册
      const defaults = {};
      (pl.fields || []).forEach((f) => {
        defaults[f.key] = f.type === "list" ? [] : "";
      });
      WF.Plugins[type] = pl;
      WF.Blocks[type] = {
        name: pl.name, icon: "🧩", category: "插件", plugin: true,
        modes: pl.modes || ["site", "h5", "story", "ppt"],
        desc: pl.description || ("插件区块:" + pl.name),
        defaults,
        fields: (pl.fields || []).map((f) => ({
          key: f.key, label: f.label || f.key,
          type: f.type === "textarea" ? "textarea" : f.type === "list" ? "list" : f.type === "image" ? "image" : "text",
          rows: 3,
          itemFields: f.itemFields || [],
        })),
        summary: (p) => (pl.fields && pl.fields[0] && p[pl.fields[0].key]) || pl.name,
      };
      if (WF.Categories.indexOf("插件") < 0) WF.Categories.push("插件");
    });
  };

  // ---------- 分类 ----------
  WF.Categories = ["结构", "转化", "社交证明", "表单", "展示", "互动", "幻灯"];

  // ---------- 工具 ----------
  WF.getBlock = function (type) { return WF.Blocks[type] || null; };
  WF.blocksForMode = function (mode) {
    return Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].modes.includes(mode));
  };
  // ---------- 人群判定(共享逻辑,SSR 与浏览器一致) ----------
  // rules: {visitor:'any|new|return', login:'any|in|out', utm:'', device:'any|mobile|desktop', country:'', hours:'9-18'}
  WF.matchAudience = function (rules, env) {
    if (!rules) return true;
    env = env || {};
    if (rules.visitor === "new" && env.visitor === "return") return false;
    if (rules.visitor === "return" && env.visitor !== "return") return false;
    if (rules.login === "in" && env.login !== "in") return false;
    if (rules.login === "out" && env.login === "in") return false;
    if (rules.device && rules.device !== "any" && env.device && rules.device !== env.device) return false;
    if (rules.country && env.country && String(env.country).toUpperCase() !== String(rules.country).toUpperCase()) return false;
    if (rules.utm && String(env.utm || "").indexOf(rules.utm) === -1) return false;
    if (rules.hours) {
      const m = String(rules.hours).match(/^(\d{1,2})-(\d{1,2})$/);
      if (m) {
        const h = typeof env.hour === "number" ? env.hour : new Date().getHours();
        const from = +m[1], to = +m[2];
        const inRange = from <= to ? (h >= from && h < to) : (h >= from || h < to);
        if (!inRange) return false;
      }
    }
    return true;
  };

  // 命中的分群 id 列表(用于埋点分群归因)
  WF.matchSegments = function (segments, env) {
    return (segments || []).filter((sg) => WF.matchAudience(sg.rules, env)).map((sg) => sg.id);
  };

  // 取块在给定环境下应有的 props(应用个性化替换)
  WF.effectiveProps = function (block, env, segments) {
    let props = block.props || {};
    const aud = block.audience || {};
    const seg = (aud && aud.segmentId) ? (segments || []).find((x) => x.id === aud.segmentId) : null;
    const rules = seg ? seg.rules : aud;
    const visible = WF.matchAudience(rules, env);
    if (!visible) return { visible: false, props };
    const list = block.personalize || [];
    for (const p of list) {
      const sg = (segments || []).find((x) => x.id === p.segmentId);
      if (sg && WF.matchAudience(sg.rules, env)) {
        const patch = {};
        Object.keys(p.patch || {}).forEach((k) => { if (p.patch[k] !== "" && p.patch[k] != null) patch[k] = p.patch[k]; });
        props = Object.assign({}, props, patch);
        break;   // 命中第一个个性化规则即生效
      }
    }
    return { visible: true, props };
  };

  // 变体:取该块的可用变体与当前变体
  // 递归查找块(含容器子块):返回 { block, list, index, parent }
  WF.findBlockNode = function (blocks, id, parent) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.id === id) return { block: b, list: blocks, index: i, parent: parent || null };
      if (b.children && b.children.length) {
        const hit = WF.findBlockNode(b.children, id, b);
        if (hit) return hit;
      }
    }
    return null;
  };
  // 容器块列表(用于"移入")
  WF.containersOf = function (blocks) {
    return blocks.filter((b) => (WF.Blocks[b.type] || {}).container);
  };

  WF.blockVariants = function (type) {
    const def = WF.Blocks[type];
    return (def && def.variants) || null;
  };
  WF.blockVariant = function (b) {
    const def = WF.Blocks[b && b.type];
    if (!def || !def.variants) return null;
    const keys = def.variants.map(([k]) => k);
    return keys.includes(b.variant) ? b.variant : (def.defaultVariant || keys[0]);
  };

  // 生成默认模块对象
  WF.newBlock = function (type) {
    const def = WF.Blocks[type];
    const b = {
      id: "b" + Math.random().toString(36).slice(2, 9),
      type,
      props: JSON.parse(JSON.stringify(def.defaults)),
      hidden: false,
      style: { bg: "", padding: "normal", anim: "up" },
    };
    if (def.variants) b.variant = def.defaultVariant || def.variants[0][0];
    if (def.container) b.children = [];
    return b;
  };
})(window.WF);
