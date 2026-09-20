/* ============================================================
 * WebsFlow · 行业成品模板(开箱即投)
 * 增长漏斗 / 音乐节 H5 之外补齐到 10 套行业页,图用自托管素材库。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  function img(ind, n) {
    return "https://nownexts.com/webflow/assets/media/ind/" + ind + "/" + n + ".jpg?v=1";
  }
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

  WF.defineTemplate("site-local", {
    name: "到店服务", mode: "site", theme: "amber",
    desc: "本地生活 / 到店预约:信任条 · 套餐 · 地图 · 留资",
    build() {
      return {
        global: { title: "青石理发 · 预约到店", description: "30 分钟剪发,不用排队。", brand: "青石理发" },
        blocks: [
          blk("nav", { brand: "青石理发", links: [{ label: "套餐", href: "#pricing" }, { label: "评价", href: "#testimonials" }, { label: "位置", href: "#map" }], btnText: "预约", btnLink: "#form" }),
          blk("hero", { badge: "当天可约", title: "剪完就走,不等号。", subtitle: "三里屯店 · 洗剪吹 30 分钟。微信预约,到店即剪。", btnText: "马上预约", btnLink: "#form", btn2Text: "看套餐", btn2Link: "#pricing", bgType: "image", image: img("beauty", 1), align: "left" }, { padding: "loose" }),
          blk("proof", { cols: "3", items: [{ value: "4.9", label: "到店评分" }, { value: "12 分", label: "平均等候" }, { value: "8 年", label: "同一条街" }], note: "数据来自近 90 天到店评价" }),
          blk("pricing", { title: "今天能做的三件事", cols: "3", items: [
            { name: "速剪", price: "¥68", unit: "", desc: "洗剪吹 30 分钟", feats: "当天可约\n不含染烫", btnText: "预约速剪" },
            { name: "造型", price: "¥168", unit: "", desc: "剪 + 造型", feats: "含护发\n出片建议", badge: "最受欢迎", featured: "featured", btnText: "预约造型" },
            { name: "护理", price: "¥268", unit: "", desc: "染 / 烫择一", feats: "需提前 2 小时\n含护理", btnText: "咨询档期" },
          ] }),
          blk("testimonials", { title: "街坊怎么说", cols: "3", items: [
            { quote: "中午过去真的不用等,剪完赶回公司开会。", name: "阿凯", role: "三里屯上班" },
            { quote: "老师会先问场合,不会一上来就推销护理。", name: "林夏", role: "常客" },
            { quote: "预约码到店扫一下就排上,比美团电话靠谱。", name: "老周", role: "住附近" },
          ] }),
          blk("map", { title: "来店怎么走", address: "北京市朝阳区三里屯路 11 号", lat: 39.937, lng: 116.455 }),
          blk("form", { title: "留个时间,我们回你", subtitle: "工作日 10 分钟内确认档期", fields: [
            { label: "称呼", type: "text", required: true }, { label: "手机", type: "tel", required: true },
            { label: "想做的项目", type: "select", required: true, placeholder: "速剪 / 造型 / 护理" },
          ], submitText: "提交预约", successMessage: "已收到,我们会短信确认档期。" }),
          blk("footer", { brand: "青石理发", desc: "剪完就走,不等号。", copyright: "© 2026 青石理发" }),
        ],
      };
    },
  });

  WF.defineTemplate("site-health", {
    name: "健康预约", mode: "site", theme: "teal",
    desc: "门诊 / 体检 / 咨询预约:资质 · 流程 · 表单",
    build() {
      return {
        global: { title: "衡石体检 · 半天出报告", description: "上班族半天体检,次日解读。", brand: "衡石体检" },
        blocks: [
          blk("nav", { brand: "衡石体检", links: [{ label: "套餐", href: "#pricing" }, { label: "流程", href: "#journey" }, { label: "疑问", href: "#faq" }], btnText: "预约体检", btnLink: "#form" }),
          blk("hero", { badge: "三甲合作", title: "半天体检,次日解读。", subtitle: "上班请半天假就够。报告次日由医生电话讲清,不丢一堆指标名词。", btnText: "预约档期", btnLink: "#form", image: img("healthcare", 1), bgType: "image", align: "left" }, { padding: "loose" }),
          blk("proof", { cols: "3", items: [{ value: "三甲", label: "合作医院" }, { value: "次日", label: "医生解读" }, { value: "0 推销", label: "加项需你点头" }] }),
          blk("journey", { title: "到店只需四步", items: [
            { title: "线上选套餐", desc: "基础 / 进阶 / 专项,价格页写清包含项" },
            { title: "约早上档", desc: "空腹项目集中在 8:00–10:30" },
            { title: "半天采完", desc: "平均 2.5 小时,可回公司" },
            { title: "次日电话", desc: "医生按异常项讲解,不念报告全文" },
          ] }),
          blk("pricing", { title: "三档都写清包含什么", cols: "3", items: [
            { name: "基础", price: "¥399", unit: "", desc: "血常规 + 影像", feats: "约 40 项\n次日解读", btnText: "约基础档" },
            { name: "进阶", price: "¥899", unit: "", desc: "含肿瘤标志物", feats: "约 70 项\n优先早档", badge: "职场常选", featured: "featured", btnText: "约进阶档" },
            { name: "专项", price: "面议", unit: "", desc: "按病史加项", feats: "医生预问诊\n不加推销项", btnText: "先咨询" },
          ] }),
          blk("faq", { title: "来之前想清楚", items: [
            { q: "一定要空腹吗?", a: "基础和进阶含抽血,请空腹 8 小时,可喝清水。" },
            { q: "报告会不会只丢 PDF?", a: "PDF 会发,但次日必有医生电话,按异常项讲。" },
            { q: "会现场推销加项吗?", a: "加项必须你在表单里勾选,前台不收现场加价。" },
          ] }),
          blk("form", { title: "预约体检档期", fields: [
            { label: "姓名", type: "text", required: true }, { label: "手机", type: "tel", required: true },
            { label: "套餐", type: "select", required: true, placeholder: "基础 / 进阶 / 专项" },
          ], submitText: "提交预约", successMessage: "已收到,顾问会在工作时间确认档期。" }),
          blk("footer", { brand: "衡石体检", desc: "半天体检,次日解读。", copyright: "© 2026 衡石体检" }),
        ],
      };
    },
  });

  WF.defineTemplate("site-estate", {
    name: "空间看房", mode: "site", theme: "slate",
    desc: "房产 / 联合办公 / 空间租赁:户型 · 价格 · 预约看房",
    build() {
      return {
        global: { title: "南岸里 · 预约看房", description: "临河办公,一层一户。", brand: "南岸里" },
        blocks: [
          blk("nav", { brand: "南岸里", links: [{ label: "户型", href: "#features" }, { label: "价格", href: "#pricing" }, { label: "看房", href: "#form" }], btnText: "预约看房", btnLink: "#form" }),
          blk("hero", { badge: "本周可看", title: "临河一层一户,把公司安在岸上。", subtitle: "从 86 到 240 平。看房不用绕销售话术,价格页就是成交价。", btnText: "预约本周看房", btnLink: "#form", image: img("realestate", 1), bgType: "image", align: "left" }, { padding: "loose" }),
          blk("gallery", { title: "现场", cols: "3", items: [
            { image: img("realestate", 1), caption: "临河一层" }, { image: img("realestate", 2), caption: "通透办公" }, { image: img("realestate", 3), caption: "公共客厅" },
          ] }),
          blk("features", { title: "住进来才重要的三件事", cols: "3", items: [
            { icon: "🛤", title: "一层一户", desc: "不做隔间出租,进门就是整层。" },
            { icon: "🕒", title: "24 小时可进", desc: "门禁独立,周末不用求物业。" },
            { icon: "📄", title: "价就是价", desc: "页面标价含物业,不另加茶水费。" },
          ] }),
          blk("pricing", { title: "本周可看的户型", cols: "3", items: [
            { name: "86 平", price: "¥1.6 万", unit: "/月", desc: "4–8 人", feats: "1 会议\n独立卫", btnText: "约看 86" },
            { name: "140 平", price: "¥2.6 万", unit: "/月", desc: "10–16 人", feats: "2 会议\n茶水间", badge: "去化最快", featured: "featured", btnText: "约看 140" },
            { name: "240 平", price: "¥4.2 万", unit: "/月", desc: "整层", feats: "可注册\n车位 2", btnText: "约看整层" },
          ] }),
          blk("form", { title: "约一个白天看房", fields: [
            { label: "公司 / 团队", type: "text", required: true }, { label: "手机", type: "tel", required: true },
            { label: "想看户型", type: "select", required: false, placeholder: "86 / 140 / 240" },
          ], submitText: "预约看房", successMessage: "已记下,顾问会用短信给两个可选时段。" }),
          blk("footer", { brand: "南岸里", desc: "临河一层一户。", copyright: "© 2026 南岸里" }),
        ],
      };
    },
  });

  WF.defineTemplate("h5-course", {
    name: "课程招生 H5", mode: "h5", theme: "violet",
    desc: "训练营 / 直播课招生:倒计时 · 大纲 · 报名",
    build() {
      return {
        global: {
          title: "投放操盘 7 日训", description: "7 天把一条广告从投放到复盘跑通。",
          brand: "操盘训",
          h5: { ctaText: "报名本期", ctaLink: "#form" },
        },
        blocks: [
          blk("hero", { badge: "第 12 期 · 剩余 18 席", title: "7 天,把投放跑通一轮。", subtitle: "不是听课。每天一条作业,教练按账户点评。", btnText: "报名本期", btnLink: "#form", bgType: "image", image: img("education", 1), align: "center" }, { padding: "loose" }),
          blk("countdown", { title: "开营倒计时", note: "满 40 人截团,不再加座" }),
          blk("journey", { title: "七天只做一件事", items: [
            { title: "D1 账户体检", desc: "把现在的花费和转化摊开" },
            { title: "D2–D4 出页+素材", desc: "一条落地页,三组素材" },
            { title: "D5–D6 真实消耗", desc: "小预算验证,不当场加码" },
            { title: "D7 复盘模板", desc: "带走下周还能用的表" },
          ] }),
          blk("pricing", { title: "一价含辅导", cols: "1", items: [
            { name: "本期席位", price: "¥1,280", unit: "", desc: "含 7 日直播 + 作业批改", feats: "回放 30 天\n不满 3 天可退差价", featured: "featured", btnText: "报名并留微信" },
          ] }),
          blk("form", { title: "报名留位", fields: [
            { label: "称呼", type: "text", required: true }, { label: "微信 / 手机", type: "text", required: true },
            { label: "现在在投什么", type: "textarea", required: false },
          ], submitText: "提交报名", successMessage: "已留位,助教会加你并发开营须知。" }),
          blk("footer", { brand: "操盘训", desc: "7 天把投放跑通一轮。", copyright: "© 2026 操盘训" }),
        ],
      };
    },
  });
})(window.WF);
