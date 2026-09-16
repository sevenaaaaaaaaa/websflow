/* ============================================================
 * WebsFlow · 场景模板库 (templates.js)
 * Base44 的"说清场景就得到产品"理念:每个模板都是一份
 * 完整可用的示例项目 —— 换掉文字就是自己的页面。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // 以 schema 默认值为底版,模板只覆写差异字段
  function blk(type, props, style) {
    const def = WF.Blocks[type];
    return {
      id: "b" + Math.random().toString(36).slice(2, 9),
      type,
      props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), props || {}),
      hidden: false,
      style: Object.assign({ bg: "", padding: "normal", anim: type === "nav" ? "none" : "up" }, style || {}),
    };
  }

  const T = {};

  /* ---------- 官网:产品落地页 ---------- */
  T["site-product"] = {
    name: "产品官网", mode: "site", theme: "indigo",
    desc: "SaaS / App 通用落地页:特性 · 数据 · 评价 · 价格",
    build() {
      return {
        global: {
          title: "青屿笔记 — 团队的第二大脑", description: "把散落的信息变成团队的智慧",
          brand: "青屿笔记",
        },
        blocks: [
          blk("nav", { brand: "青屿笔记", links: [{ label: "特性", href: "#features" }, { label: "评价", href: "#testimonials" }, { label: "价格", href: "#pricing" }, { label: "常见问题", href: "#faq" }], btnText: "免费开始", btnLink: "#cta" }),
          blk("hero", {
            badge: "🎉 2.0 全新发布", title: "把散落的信息,变成团队的智慧",
            subtitle: "青屿笔记把文档、任务与讨论放进同一个工作区,AI 帮你自动整理、检索与总结。",
            btnText: "免费开始", btnLink: "#cta", btn2Text: "观看演示", btn2Link: "#",
            bgType: "gradient", gradient: "indigo", align: "center",
          }, { padding: "loose" }),
          blk("features", {
            title: "为什么团队选择青屿", subtitle: "从第一行笔记到第一千次协作",
            cols: "3",
            items: [
              { icon: "🧠", title: "AI 知识助手", desc: "自动总结长文档,提问即得答案,新人三天上手。" },
              { icon: "🔗", title: "双链知识图谱", desc: "笔记互相关联,灵感不再孤立,越用越聪明。" },
              { icon: "🛡️", title: "企业级安全", desc: "端到端加密与细粒度权限,审计日志完备。" },
            ],
          }),
          blk("split", {
            title: "一个工作区,装下整条工作流",
            body: "会议纪要自动关联任务,任务进展同步到周报;\n跨项目的搜索,0.3 秒返回结果。",
            btnText: "查看使用场景", btnLink: "#", flip: "",
          }),
          blk("stats", { cols: "4", items: [
            { value: "12", suffix: "万+", label: "团队在选择青屿" },
            { value: "1.2", suffix: "亿", label: "累计创建文档" },
            { value: "0.3", suffix: "秒", label: "全局搜索响应" },
            { value: "99.99", suffix: "%", label: "服务可用性" },
          ] }),
          blk("testimonials", { title: "他们的评价", cols: "3", items: [
            { quote: "接了一个大项目,资料全部进青屿,被 AI 助手救了无数次。", name: "沈之南", role: "知行咨询 · 项目总监" },
            { quote: "从 Notion 迁移只花了一下午,双链体验比原来更顺手。", name: "Miko", role: "独立产品设计师" },
            { quote: "权限体系过硬,法务审了三天,最后全员搬了进来。", name: "老周", role: "峰远科技 · CTO" },
          ] }),
          blk("pricing", { title: "简单透明的价格", subtitle: "按团队规模选择,随时升级或降级", cols: "3", items: [
            { name: "体验版", price: "¥0", unit: "/人/月", desc: "小团队起步", feats: "最多 5 人\n10GB 空间\n基础模板\n社区支持", featured: "", badge: "", btnText: "免费开始" },
            { name: "专业版", price: "¥29", unit: "/人/月", desc: "成长型团队之选", feats: "不限人数\n1TB 空间\nAI 助手不限量\n版本历史一年\n优先客服", badge: "最受欢迎", featured: "featured", btnText: "试用 14 天" },
            { name: "专属版", price: "定制", unit: "", desc: "大型组织", feats: "私有化部署\nSSO / 审计\n专属客户成功\nSLA 保障", featured: "", badge: "", btnText: "联系销售" },
          ] }),
          blk("faq", { title: "你可能想问", items: [
            { q: "可以从 Notion / 语雀导入吗?", a: "可以。支持一键导入 Notion、语雀、飞书文档,保留层级与双链结构。" },
            { q: "AI 助手会用我们的数据训练吗?", a: "不会。你的数据仅用于即时推理,绝不参与模型训练,企业版可完全私有化。" },
            { q: "免费版有限制吗?", a: "免费版功能完整,仅限制 5 人与 10GB 空间,不限使用时长。" },
          ] }),
          blk("cta", { title: "今天就把团队的知识管起来", subtitle: "注册即送 14 天专业版,无需信用卡", btnText: "免费创建工作区", btnLink: "#", style: "gradient" }),
          blk("footer", { brand: "青屿笔记", desc: "把散落的信息,变成团队的智慧。", links: [{ label: "产品文档" }, { label: "更新日志" }, { label: "加入我们" }, { label: "联系我们" }], copyright: "© 2026 青屿笔记" }),
        ],
      };
    },
  };

  /* ---------- H5:活动邀请函 ---------- */
  T["h5-event"] = {
    name: "活动邀请函", mode: "h5", theme: "rose",
    desc: "音乐节 / 发布会 / 婚礼通用:倒计时 · 日程 · 报名",
    build() {
      return {
        global: {
          title: "山海音乐节 · 邀请函", description: "9 月 28 日,海边见",
          brand: "山海音乐节",
          h5: { ctaText: "🎫 立即抢票", ctaLink: "#buy" },
        },
        blocks: [
          blk("hero", {
            badge: "9.28 - 9.29 · 环海草坪", title: "山海音乐节",
            subtitle: "海风、晚霞与十二组音乐人,两天两夜的盛夏尾声。",
            btnText: "查看全阵容", btnLink: "#lineup", btn2Text: "", btn2Link: "",
            bgType: "gradient", gradient: "sunset", align: "center",
          }, { padding: "loose" }),
          blk("countdown", { title: "距离开唱还有", target: "", note: "早鸟票限量 800 张,售完即止" }),
          blk("timeline", { title: "两日日程", items: [
            { time: "DAY 1 · 9.28", title: "落日场", desc: "14:00 开唱 · 民谣与独立乐队 · 19:30 海边落日合唱" },
            { time: "DAY 1 · 9.28", title: "星夜场", desc: "20:00 电子与后摇 · 露天露营区开放" },
            { time: "DAY 2 · 9.29", title: "全日场", desc: "13:00 开唱 · 压轴嘉宾 20:00 登台 · 烟火收尾" },
          ] }),
          blk("gallery", { title: "往届现场", subtitle: "每一帧都值得纪念", cols: "2", items: [
            { image: "", caption: "2025 · 落日合唱" }, { image: "", caption: "2025 · 星夜电音" },
          ] }),
          blk("quiz", {
            question: "TEST · 你是哪种乐迷?",
            options: [
              { text: "提前三小时占前排,全程跟唱", correct: "" },
              { text: "铺个野餐垫,躺听整场", correct: "" },
              { text: "都是我,我是山海人", correct: "correct" },
            ],
            explanation: "答对了!山海人三通票已开启,凭截图到售票处领限定手环。",
          }),
          blk("cta", { title: "早鸟票 ¥199 起", subtitle: "含双日入场 · 露营区 · 限定周边", btnText: "立即抢票", btnLink: "#", style: "gradient" }),
          blk("footer", { brand: "山海音乐节", desc: "一年一度,海边见。", links: [{ label: "购票须知" }, { label: "交通指南" }, { label: "志愿者报名" }], copyright: "© 2026 山海音乐节组委会" }),
        ],
      };
    },
  };

  /* ---------- PPT:商业计划路演 ---------- */
  T["ppt-pitch"] = {
    name: "商业计划路演", mode: "ppt", theme: "aqua",
    desc: "融资 / 汇报通用:痛点 · 数据 · 模型 · 展望",
    build() {
      return {
        global: { title: "小满咖啡 · 商业计划", description: "社区咖啡的单店模型与三年计划", brand: "小满咖啡" },
        blocks: [
          blk("slide-title", { badge: "BUSINESS PLAN 2026", title: "小满咖啡", subtitle: "让好咖啡,成为社区的日常", speaker: "创始人 · 阿满", date: "2026 年 9 月" }),
          blk("slide-bullets", { kicker: "PROBLEM", title: "连锁太贵,速溶太糙", items: [
            { title: "30 元的连锁咖啡", desc: "白领每天一杯,一个月吞掉半天工资" },
            { title: "3 元的速溶", desc: "将就的口感,撑不起“品质生活”" },
            { title: "社区场景空白", desc: "家门口 500 米内,没有一杯“刚刚好”的咖啡" },
          ] }),
          blk("stats", { cols: "3", items: [
            { value: "3197", suffix: "亿", label: "中国咖啡市场规模(元)" },
            { value: "26", suffix: "%", label: "现磨咖啡年增速" },
            { value: "68", suffix: "%", label: "订单来自 1 公里内社区" },
          ] }, { padding: "normal" }),
          blk("slide-quote", { quote: "我们不卖咖啡,\n我们卖的是楼下的第三空间。", author: "—— 小满咖啡 品牌手册" }),
          blk("features", { title: "单店模型已验证", subtitle: "首店 8 个月回本,日销 320 杯", cols: "3", items: [
            { icon: "💰", title: "月营收 21 万", desc: "45㎡ 小店,坪效远超同行" },
            { icon: "🧾", title: "毛利 62%", desc: "云南庄园直采,成本降 30%" },
            { icon: "🔁", title: "月复购 71%", desc: "会员储值 + 社群运营" },
          ] }),
          blk("pricing", { title: "三年 30 家店", subtitle: "直营打样,合伙扩张", cols: "3", items: [
            { name: "第一年", price: "6", unit: "家直营", desc: "打磨供应链与 SOP", feats: "核心商圈旗舰店\n中央厨房落地\n数字化系统上线", btnText: "" },
            { name: "第二年", price: "12", unit: "家", desc: "社区店模型跑通", feats: "10 家社区合伙店\n会员突破 10 万\n自有烘焙工厂", badge: "本轮资金", featured: "featured", btnText: "" },
            { name: "第三年", price: "30", unit: "家", desc: "区域品牌确立", feats: "覆盖 3 座城市\n启动 A 轮\n年营收破亿", btnText: "" },
          ] }),
          blk("slide-end", { title: "与我们一起,把咖啡开进每个社区", subtitle: "本轮开放 15% 股权,欢迎约谈", contact: "微信:xiaoman-cafe\n邮箱:hi@xiaoman.coffee" }),
        ],
      };
    },
  };

  /* ---------- 互动故事:品牌叙事 ---------- */
  T["story-brand"] = {
    name: "品牌故事", mode: "story", theme: "night",
    desc: "滚动叙事:大事记 · 热点细节 · 互动问答",
    build() {
      return {
        global: {
          title: "拾光相册 — 把时间装订成书", description: "一个关于记忆的十年故事",
          brand: "拾光相册",
          story: { snap: true },
        },
        blocks: [
          blk("hero", {
            badge: "品牌十周年", title: "把时间,装订成书",
            subtitle: "十年来,我们把 2,400,000 张照片做成了书。\n往下滚动,听听时间的故事。",
            btnText: "", btnLink: "", btn2Text: "", btn2Link: "",
            bgType: "gradient", gradient: "night", align: "center",
          }, { padding: "loose", anim: "zoom" }),
          blk("text", { title: "序章 · 2016", body: "创始人阿拾在旧货市场淘到一本 1978 年的家庭相册。\n泛黄的照片里,一个家庭四十年的人生被认真装订着。\n那一刻她想:数字时代的记忆,也应该有这样隆重的归宿。", align: "center" }),
          blk("timeline", { title: "十年,六个坐标", items: [
            { time: "2016", title: "工作间里的第一台压痕机", desc: "第一本样书,送给了阿拾的父母" },
            { time: "2018", title: "上线「一键成书」", desc: "AI 排版让做一本书只要 5 分钟" },
            { time: "2021", title: "第 100 万本书下线", desc: "定制礼盒成为企业年会的爆款" },
            { time: "2026", title: "纸质书 + 云相册", desc: "每一本纸质书,都配一座永久的云端纪念馆" },
          ] }),
          blk("hotspot", {
            image: "",
            items: [
              { x: 28, y: 38, label: "锁线装订", desc: "180° 平摊不掉页,翻开就是完整的记忆。" },
              { x: 66, y: 60, label: "艺术微喷", desc: "百年不褪色,博物馆级收藏标准。" },
              { x: 46, y: 78, label: "布面烫金", desc: "封面文字可定制,烫金是标配不是选配。" },
            ],
          }),
          blk("quiz", {
            question: "小测试:一本拾光相册平均收录多少张照片?",
            options: [
              { text: "37 张", correct: "" },
              { text: "112 张", correct: "correct" },
              { text: "365 张", correct: "" },
            ],
            explanation: "答案是 112 张 —— 大约是一个家庭一年的全部高清照片。",
          }),
          blk("stats", { cols: "3", items: [
            { value: "240", suffix: "万", label: "装订成册的照片" },
            { value: "19", suffix: "万", label: "个家庭选择拾光" },
            { value: "4.9", suffix: "分", label: "全平台口碑评分" },
          ] }),
          blk("cta", { title: "把你手机里的十年,做成一本书", subtitle: "新用户首本 8 折,赠送云相册一年", btnText: "开始制作", btnLink: "#", style: "gradient" }),
        ],
      };
    },
  };

  /* ---------- 空白模板 ---------- */
  T.blank = {
    name: "空白开始", mode: "site", theme: "indigo",
    desc: "一张白纸,自由搭建",
    build(mode) {
      mode = mode || "site";
      const blocks = mode === "ppt"
        ? [blk("slide-title", { title: "演示标题", subtitle: "一句话概述", speaker: "演讲人", date: "2026 年" }), blk("slide-end", { title: "谢谢观看" })]
        : mode === "story"
          ? [blk("hero", { title: "开始你的故事", subtitle: "为每一屏写下一句话。" }), blk("text", { title: "", body: "在这里展开第一章。" })]
          : [blk("hero", { title: "开始搭建你的页面", subtitle: "从左侧「模块」面板拖入内容,右侧编辑详情。" })];
      return {
        global: { title: "未命名项目", description: "", brand: "我的品牌", h5: mode === "h5" ? { ctaText: "", ctaLink: "" } : undefined },
        blocks,
      };
    },
  };

  // 按形态列出可用模板(含空白)
  WF.templatesFor = function (mode) {
    const list = [];
    Object.keys(T).forEach((key) => {
      const t = T[key];
      if (key === "blank") return;
      if (t.mode === mode) list.push({ key, name: t.name, desc: t.desc, theme: t.theme });
    });
    list.push({ key: "blank", name: "空白开始", desc: "一张白纸,自由搭建", theme: "indigo" });
    return list;
  };

  WF.buildTemplate = function (key, mode) {
    const t = T[key] || T.blank;
    const content = t.build(mode || t.mode);
    return {
      global: content.global,
      theme: WF.defaultTheme(),
      blocks: content.blocks,
    };
    // theme.preset 由调用方设置
  };
})(window.WF);
