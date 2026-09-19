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

  /* ---------- 官网:电商店铺 ---------- */
  T["site-ecommerce"] = {
    name: "电商店铺", mode: "site", theme: "sunset",
    desc: "服装 / 配饰 / 生活好物:产品展示 · 价格 · 评价",
    build() {
      return {
        global: {
          title: "拾光优选 — 为你挑选生活好物", description: "精选好物,品质生活",
          brand: "拾光优选",
        },
        blocks: [
          blk("nav", { brand: "拾光优选", links: [{ label: "新品" }, { label: "热销" }, { label: "评价" }, { label: "关于我们" }], btnText: "🛒 购物车", btnLink: "#" }),
          blk("hero", {
            badge: "🎉 秋季新品上线", title: "精选好物,品质生活",
            subtitle: "每一件商品都经过严格筛选,只为给你最好的体验。",
            btnText: "立即选购", btnLink: "#products", btn2Text: "查看全部", btn2Link: "#",
            bgType: "gradient", gradient: "sunset", align: "center",
          }, { padding: "loose" }),
          blk("product-showcase", {
            title: "热销商品", subtitle: "最受欢迎的精选好物", align: "center", cols: "3",
            items: [
              { name: "经典款T恤", price: "¥199", originalPrice: "¥299", image: "", badge: "热销", desc: "100%纯棉,舒适透气" },
              { name: "休闲卫衣", price: "¥399", originalPrice: "", image: "", badge: "新品", desc: "加绒保暖,秋冬必备" },
              { name: "牛仔裤", price: "¥499", originalPrice: "¥699", image: "", badge: "限时折扣", desc: "修身版型,显瘦百搭" },
            ],
            btnText: "立即购买",
          }),
          blk("features", {
            title: "为什么选择我们", subtitle: "品质保证,放心选购",
            cols: "3",
            items: [
              { icon: "✅", title: "正品保障", desc: "所有商品均为正品行货,假一赔十。" },
              { icon: "🚚", title: "闪电发货", desc: "下单后24小时内发货,全国包邮。" },
              { icon: "🔄", title: "无忧退换", desc: "7天无理由退换,售后无忧。" },
            ],
          }),
          blk("testimonials", { title: "用户评价", cols: "3", items: [
            { quote: "质量非常好,穿起来很舒服,已经回购第三次了！", name: "小美", role: "忠实顾客" },
            { quote: "发货速度很快,包装也很精美,送人很有面子。", name: "张先生", role: "VIP会员" },
            { quote: "客服态度很好,尺码推荐很准确,非常满意。", name: "李女士", role: "新顾客" },
          ] }),
          blk("stats", { cols: "4", items: [
            { value: "10", suffix: "万+", label: "累计顾客" },
            { value: "99", suffix: "%", label: "好评率" },
            { value: "24", suffix: "h", label: "发货时效" },
            { value: "7", suffix: "天", label: "无理由退换" },
          ] }),
          blk("form", {
            title: "联系我们", subtitle: "有任何问题,欢迎随时咨询", align: "center",
            fields: [
              { label: "姓名", type: "text", required: true, placeholder: "请输入您的姓名" },
              { label: "邮箱", type: "email", required: true, placeholder: "请输入您的邮箱" },
              { label: "问题类型", type: "select", required: false, placeholder: "请选择" },
              { label: "留言", type: "textarea", required: false, placeholder: "请输入您的问题" },
            ],
            submitText: "提交咨询",
            successMessage: "感谢您的咨询,我们会尽快回复！",
          }),
          blk("footer", { brand: "拾光优选", desc: "精选好物,品质生活。", links: [{ label: "关于我们" }, { label: "配送说明" }, { label: "退换政策" }, { label: "联系客服" }], copyright: "© 2026 拾光优选" }),
        ],
      };
    },
  };

  /* ---------- 官网:教育机构 ---------- */
  T["site-education"] = {
    name: "教育机构", mode: "site", theme: "aqua",
    desc: "在线课程 / 培训机构:课程展示 · 师资 · 报名",
    build() {
      return {
        global: {
          title: "星辰学堂 — 让学习更高效", description: "专业在线教育平台,名师带你成长",
          brand: "星辰学堂",
        },
        blocks: [
          blk("nav", { brand: "星辰学堂", links: [{ label: "课程" }, { label: "师资" }, { label: "学员评价" }, { label: "联系我们" }], btnText: "免费试听", btnLink: "#cta" }),
          blk("hero", {
            badge: "🎓 2026秋季班热招中", title: "名师指导,高效学习",
            subtitle: "汇聚顶尖师资,打造沉浸式学习体验,让你的每一分努力都有回报。",
            btnText: "免费试听", btnLink: "#cta", btn2Text: "查看课程", btn2Link: "#courses",
            bgType: "gradient", gradient: "aqua", align: "center",
          }, { padding: "loose" }),
          blk("features", {
            title: "我们的优势", subtitle: "为什么10万+学员选择星辰学堂",
            cols: "3",
            items: [
              { icon: "👨‍🏫", title: "名师团队", desc: "985/211高校毕业,平均教龄8年以上。" },
              { icon: "📚", title: "系统课程", desc: "从入门到精通,体系化学习路径。" },
              { icon: "🤖", title: "AI辅导", desc: "智能错题分析,个性化学习建议。" },
            ],
          }),
          blk("product-showcase", {
            title: "热门课程", subtitle: "精选优质课程,助力你的成长", align: "center", cols: "3",
            items: [
              { name: "Python编程入门", price: "¥299", originalPrice: "¥599", image: "", badge: "爆款", desc: "零基础入门,实战项目驱动" },
              { name: "数据分析实战", price: "¥499", originalPrice: "¥899", image: "", badge: "名师", desc: "Excel+Python+SQL全覆盖" },
              { name: "AI人工智能", price: "¥699", originalPrice: "¥1299", image: "", badge: "新课", desc: "前沿技术,就业前景广阔" },
            ],
            btnText: "立即报名",
          }),
          blk("team", {
            title: "名师团队", subtitle: "他们曾就职于一线互联网公司,拥有丰富的教学经验", align: "center", cols: "4",
            items: [
              { name: "王教授", role: "Python讲师", avatar: "", bio: "前腾讯高级工程师,10年开发经验" },
              { name: "李老师", role: "数据分析师", avatar: "", bio: "前阿里巴巴数据专家,精通数据分析" },
              { name: "张博士", role: "AI研究员", avatar: "", bio: "清华大学博士,专注人工智能领域" },
              { name: "陈老师", role: "产品经理", avatar: "", bio: "前字节跳动产品总监,8年产品经验" },
            ],
          }),
          blk("testimonials", { title: "学员评价", cols: "3", items: [
            { quote: "课程内容非常实用,老师讲解清晰易懂,学完就能用到工作中。", name: "小王", role: "Python学员" },
            { quote: "AI辅导功能太棒了,错题自动分析,学习效率提高了很多。", name: "小李", role: "数据分析学员" },
            { quote: "从零基础到找到工作,只用了3个月,感谢星辰学堂！", name: "小张", role: "就业学员" },
          ] }),
          blk("stats", { cols: "4", items: [
            { value: "10", suffix: "万+", label: "累计学员" },
            { value: "95", suffix: "%", label: "好评率" },
            { value: "500", suffix: "+", label: "精品课程" },
            { value: "98", suffix: "%", label: "就业率" },
          ] }),
          blk("cta", { title: "现在报名,享受早鸟优惠", subtitle: "前100名报名学员,立减200元", btnText: "立即报名", btnLink: "#", style: "gradient" }),
          blk("footer", { brand: "星辰学堂", desc: "让学习更高效,让成长更简单。", links: [{ label: "关于我们" }, { label: "课程体系" }, { label: "师资团队" }, { label: "联系我们" }], copyright: "© 2026 星辰学堂" }),
        ],
      };
    },
  };

  /* ---------- 官网:餐饮品牌 ---------- */
  T["site-restaurant"] = {
    name: "餐饮品牌", mode: "site", theme: "rose",
    desc: "餐厅 / 咖啡馆 / 烘焙店:菜单 · 环境 · 预约",
    build() {
      return {
        global: {
          title: "小满咖啡 — 让好咖啡走进日常", description: "精品咖啡,温暖每一刻",
          brand: "小满咖啡",
        },
        blocks: [
          blk("nav", { brand: "小满咖啡", links: [{ label: "菜单" }, { label: "关于我们" }, { label: "环境" }, { label: "预约" }], btnText: "📞 预约座位", btnLink: "#reservation" }),
          blk("hero", {
            badge: "☕ 精品手冲", title: "让好咖啡走进日常",
            subtitle: "从云南庄园到你的杯中,每一滴都带着阳光的味道。",
            btnText: "查看菜单", btnLink: "#menu", btn2Text: "预约座位", btn2Link: "#reservation",
            bgType: "gradient", gradient: "rose", align: "center",
          }, { padding: "loose" }),
          blk("split", {
            title: "我们的故事",
            body: "小满咖啡创立于2020年,我们相信好咖啡不必昂贵。\n从云南普洱到埃塞俄比亚,我们精选全球优质咖啡豆,用匠心烘焙每一颗豆子,只为给你一杯温暖的好咖啡。",
            btnText: "了解更多", btnLink: "#", flip: "",
          }),
          blk("product-showcase", {
            title: "招牌饮品", subtitle: "每一杯都是匠心之作", align: "center", cols: "3",
            items: [
              { name: "云南手冲", price: "¥38", originalPrice: "", image: "", badge: "招牌", desc: "单一产区,花果香气" },
              { name: "燕麦拿铁", price: "¥32", originalPrice: "", image: "", badge: "人气", desc: "醇厚顺滑,回味悠长" },
              { name: "冷萃咖啡", price: "¥28", originalPrice: "", image: "", badge: "夏日限定", desc: "12小时低温萃取" },
            ],
            btnText: "查看全部菜单",
          }),
          blk("gallery", { title: "店内环境", subtitle: "舒适空间,等你来坐", align: "center", cols: "3", items: [
            { image: "", caption: "吧台区域" },
            { image: "", caption: "靠窗座位" },
            { image: "", caption: "户外露台" },
          ] }),
          blk("stats", { cols: "4", items: [
            { value: "5", suffix: "年", label: "品牌历史" },
            { value: "3", suffix: "家", label: "门店数量" },
            { value: "10", suffix: "万+", label: "累计顾客" },
            { value: "4.9", suffix: "分", label: "大众点评评分" },
          ] }),
          blk("form", {
            title: "预约座位", subtitle: "提前预约,享受专属服务", align: "center",
            fields: [
              { label: "姓名", type: "text", required: true, placeholder: "请输入您的姓名" },
              { label: "电话", type: "tel", required: true, placeholder: "请输入您的电话" },
              { label: "日期", type: "text", required: true, placeholder: "如:2026-09-20" },
              { label: "人数", type: "select", required: true, placeholder: "请选择" },
              { label: "备注", type: "textarea", required: false, placeholder: "如有特殊需求请备注" },
            ],
            submitText: "提交预约",
            successMessage: "预约成功！我们会尽快与您确认。",
          }),
          blk("footer", { brand: "小满咖啡", desc: "让好咖啡走进日常。", links: [{ label: "关于我们" }, { label: "菜单" }, { label: "门店地址" }, { label: "联系方式" }], copyright: "© 2026 小满咖啡" }),
        ],
      };
    },
  };

  /* ---------- 官网:个人作品集 ---------- */
  T["site-portfolio"] = {
    name: "个人作品集", mode: "site", theme: "ink",
    desc: "设计师 / 摄影师 / 自由职业者:作品展示 · 技能 · 联系",
    build() {
      return {
        global: {
          title: "Alex Chen — 产品设计师", description: "用设计解决问题,用创意创造价值",
          brand: "Alex Chen",
        },
        blocks: [
          blk("nav", { brand: "Alex Chen", links: [{ label: "作品" }, { label: "关于" }, { label: "技能" }, { label: "联系" }], btnText: "下载简历", btnLink: "#" }),
          blk("hero", {
            badge: "👋 Hello World", title: "用设计解决问题,用创意创造价值",
            subtitle: "我是Alex,一名热爱创新的产品设计师。专注于用户体验设计,致力于打造优雅且实用的数字产品。",
            btnText: "查看作品", btnLink: "#works", btn2Text: "联系我", btn2Link: "#contact",
            bgType: "gradient", gradient: "ink", align: "center",
          }, { padding: "loose" }),
          blk("gallery", { title: "精选作品", subtitle: "每一个项目都是一次创新的旅程", align: "center", cols: "3", items: [
            { image: "", caption: "电商平台重设计" },
            { image: "", caption: "移动App设计" },
            { image: "", caption: "品牌视觉系统" },
            { image: "", caption: "SaaS后台设计" },
            { image: "", caption: "智能硬件UI" },
            { image: "", caption: "营销落地页" },
          ] }),
          blk("split", {
            title: "关于我",
            body: "8年产品设计经验,曾就职于字节跳动、阿里巴巴等一线互联网公司。\n擅长用户研究、交互设计、视觉设计全流程,热衷于用设计思维解决复杂问题。\n\n设计理念:好的设计不是让用户思考,而是让产品自然地融入生活。",
            btnText: "下载简历", btnLink: "#", flip: "",
          }),
          blk("features", {
            title: "专业技能", subtitle: "多年积累,全面覆盖",
            cols: "3",
            items: [
              { icon: "🎨", title: "视觉设计", desc: "精通Figma、Sketch、Adobe全家桶,擅长品牌视觉系统设计。" },
              { icon: "📱", title: "交互设计", desc: "深入理解用户行为,打造流畅自然的交互体验。" },
              { icon: "🧠", title: "用户研究", desc: "通过数据分析与用户访谈,洞察真实需求。" },
            ],
          }),
          blk("timeline", { title: "工作经历", items: [
            { time: "2022 - 至今", title: "高级产品设计师", desc: "字节跳动 · 负责抖音电商核心链路设计" },
            { time: "2020 - 2022", title: "产品设计师", desc: "阿里巴巴 · 参与淘宝首页改版" },
            { time: "2018 - 2020", title: "UI设计师", desc: "创业公司 · 从0到1搭建产品设计体系" },
          ] }),
          blk("stats", { cols: "4", items: [
            { value: "8", suffix: "年", label: "设计经验" },
            { value: "50", suffix: "+", label: "完成项目" },
            { value: "3", suffix: "项", label: "设计奖项" },
            { value: "100", suffix: "%", label: "客户满意度" },
          ] }),
          blk("social", {
            title: "找到我", subtitle: "欢迎在这些平台找到我", align: "center",
            items: [
              { platform: "github", label: "GitHub", url: "https://github.com" },
              { platform: "dribbble", label: "Dribbble", url: "" },
              { platform: "twitter", label: "Twitter", url: "https://twitter.com" },
              { platform: "email", label: "邮箱", url: "mailto:alex@example.com" },
            ],
          }),
          blk("form", {
            title: "联系我", subtitle: "有项目合作或任何问题,欢迎联系", align: "center",
            fields: [
              { label: "姓名", type: "text", required: true, placeholder: "请输入您的姓名" },
              { label: "邮箱", type: "email", required: true, placeholder: "请输入您的邮箱" },
              { label: "项目类型", type: "select", required: false, placeholder: "请选择" },
              { label: "项目描述", type: "textarea", required: false, placeholder: "请描述您的项目需求" },
            ],
            submitText: "发送消息",
            successMessage: "消息已发送,我会尽快回复您！",
          }),
          blk("footer", { brand: "Alex Chen", desc: "用设计解决问题,用创意创造价值。", links: [{ label: "Dribbble" }, { label: "GitHub" }, { label: "Twitter" }, { label: "邮箱" }], copyright: "© 2026 Alex Chen" }),
        ],
      };
    },
  };

  /* ---------- 官网:增长漏斗页(叙事节奏借鉴 OpenFlow:信任→痛点→方法→证明→行动) ---------- */
  T["site-growth"] = {
    name: "增长漏斗页", mode: "site", theme: "indigo",
    desc: "诊断式转化叙事:信任 → 痛点 → 方法 → 证明 → 行动",
    build() {
      return {
        global: {
          title: "让网站,成为自己的增长引擎",
          description: "先信任、再痛点、再方法、最后行动 —— 一条被验证过的转化叙事。",
          brand: "增长工坊",
        },
        blocks: [
          blk("nav", {
            brand: "增长工坊",
            links: [{ label: "怎么做", href: "#journey" }, { label: "评价", href: "#testimonials" }, { label: "常见问题", href: "#faq" }],
            btnText: "预约免费诊断", btnLink: "#cta",
          }),
          blk("hero", {
            badge: "🧭 网站增长诊断", title: "让网站,成为自己的增长引擎",
            subtitle: "AI 重塑了搜索、内容与转化的方式。当「做好一个网站」不再等于「获得增长」,被数据驱动的增长链路,才是穿越周期的唯一变量。",
            btnText: "预约免费诊断", btnLink: "#cta", btn2Text: "看看怎么做", btn2Link: "#journey",
            bgType: "gradient", gradient: "indigo", align: "center",
          }, { padding: "loose" }),
          blk("proof", { cols: "3", items: [
            { value: "1000+", label: "服务网站与品牌" },
            { value: "3.5×", label: "AI 搜索推荐流量增长" },
            { value: "30 分钟", label: "免费增长诊断" },
          ], note: "数据来自近一年客户复盘与行业调研" }),
          blk("cluster", {
            title: "网站还在,增长却先「失灵」了", subtitle: "三个最常见的信号", cols: "3",
            items: [
              { icon: "📉", title: "有流量,没线索", desc: "61% 的企业网站获得了流量,却没把访客变成线索——问题不在内容,在链路。" },
              { icon: "🤖", title: "AI 搜索在改写规则", desc: "GEO 带来的推荐流量增长是传统 SEO 的 3.5 倍,而多数官网还没被 AI 推荐过。" },
              { icon: "🔗", title: "触点散落各处", desc: "官网、广告、社群、公众号各说各话,用户每换一个触点就要重新建立信任。" },
            ],
          }),
          blk("journey", {
            title: "从诊断到增长,只需要四步", align: "center",
            items: [
              { title: "诊断", desc: "30 分钟访谈,讲清内容、获客与转化三个环节的短板" },
              { title: "开方", desc: "输出一份可落地的起步方案,按优先级排好顺序" },
              { title: "落地", desc: "我们动手改,你看数据,每周同步进展" },
              { title: "放大", desc: "把跑通的路子加预算复制,形成增长闭环" },
            ],
          }),
          blk("features", {
            title: "增长链路里的四件武器", subtitle: "每个环节都有对应的抓手", cols: "3",
            items: [
              { icon: "🔍", title: "SEO / GEO 双引擎", desc: "不止搜索排名,还要被 AI 推荐——结构化数据与内容策略同时做。" },
              { icon: "🧩", title: "模块化页面工场", desc: "30+ 成品模块拖拽成页,每个模块的默认文案都可直接上线。" },
              { icon: "📈", title: "数据回流", desc: "表单、CTA 与版本快照联动,改一处,看一处效果。" },
            ],
          }),
          blk("stats", { cols: "4", items: [
            { value: "61", suffix: "%", label: "企业网站有流量无转化" },
            { value: "3.5", suffix: "×", label: "GEO 相对传统 SEO 增长" },
            { value: "30", suffix: " 分钟", label: "免费诊断时长" },
            { value: "5", suffix: " 分钟", label: "搭好一个落地页" },
          ] }),
          blk("testimonials", { title: "用增长链路之后", cols: "3", items: [
            { quote: "第一周就把落地页的表单转化率从 0.8% 提到了 2.4%,链路理顺之后,剩下的都是复制。", name: "Lena", role: "创始人 · Glow Pantry" },
            { quote: "以前改版要排期等开发,现在我们自己每周就能上新活动页。", name: "沈之南", role: "增长负责人 · 消费品牌" },
            { quote: "最意外的是 AI 搜索开始给我们带流量了,这是过去五年没发生过的事。", name: "Kevin 王", role: "SEO 顾问" },
          ] }),
          blk("faq", { title: "你可能想问", items: [
            { q: "这和普通建站工具有什么区别?", a: "建站工具只管「把页面做出来」,WebsFlow 的模板沉淀自一套被验证过的转化叙事:先信任、再痛点、再方法、最后行动。" },
            { q: "需要会写代码吗?", a: "完全不需要。所有内容通过可视化表单编辑,导出的是零依赖的单文件 HTML。" },
            { q: "导出的页面能承接广告投放吗?", a: "可以。单文件加载快、无外部依赖,自带 Open Graph 与结构化数据,挂广告、社媒分享都合适。" },
            { q: "我的数据存在哪里?", a: "项目数据存在你的浏览器里;登录后可同步云端并开启多人协同。" },
          ] }),
          blk("cta", {
            title: "先做一次网站增长诊断",
            subtitle: "留下联系方式,30 分钟讲清你在内容、获客与转化三个环节的短板,以及一套可落地的起步方案。",
            btnText: "预约免费诊断", btnLink: "#", style: "gradient",
          }),
          blk("footer", { brand: "增长工坊", desc: "让网站,成为自己的增长引擎。", links: [{ label: "关于我们" }, { label: "服务内容" }, { label: "联系顾问" }], copyright: "© 2026 增长工坊" }),
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
