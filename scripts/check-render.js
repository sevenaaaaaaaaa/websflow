/* 渲染冒烟测试:全模块 × 全变体 双上下文(live/edit)+ 本轮新特性断言
 * 用法: node scripts/check-render.js
 * 原理: window/localStorage 垫片加载渲染链,断言渲染输出;失败非零退出。
 * 用途: preview-all.html 的 CLI 版,可进 CI。
 */
const fs = require("fs");
const path = require("path");

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = {
  addEventListener: () => {},
  createElement: () => ({ style: {}, dataset: {}, setAttribute: () => {}, appendChild: () => {}, remove: () => {} }),
  documentElement: { classList: { add: () => {} } },
  head: { appendChild: () => {} },
  body: { appendChild: () => {} },
};
global.navigator = { sendBeacon: () => true };

const root = path.join(__dirname, "..");
const files = [
  "js/schema.js", "js/themes.js", "js/runtime-css.js", "js/render.js", "js/variants.js",
  "js/variants-batch-1.js", "js/variants-batch-2.js", "js/variants-batch-3.js", "js/variants-batch-4.js", "js/variants-batch-5.js",
];
for (const f of files) {
  eval(fs.readFileSync(path.join(root, f), "utf8"));
}
const WFR = global.WF;   // 不叫 WF:顶层声明会遮蔽 eval 内的裸 WF 标识符(TDZ)

let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ " + name); }
};

// ---------- 1) 全模块 × 全变体双上下文渲染 ----------
let variantsTotal = 0;
const renderErrors = [];
for (const [type, def] of Object.entries(WF.Blocks)) {
  const vkeys = (def.variants && def.variants.length) ? def.variants.map(([k]) => k) : [null];
  for (const vk of vkeys) {
    variantsTotal++;
    const b = WF.newBlock(type);
    if (vk) b.variant = vk;
    for (const ctx of ["live", "edit"]) {
      try {
        const html = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [b] }, { context: ctx });
        if (!html || html.indexOf("wf-root") < 0) throw new Error("empty output");
        if (html.indexOf("渲染器缺失") >= 0) throw new Error("renderer missing");
      } catch (e) {
        renderErrors.push(`${type}${vk ? "/" + vk : ""} [${ctx}]: ${e.message}`);
      }
    }
  }
}
console.log(`\n[1] 全模块渲染: ${Object.keys(WF.Blocks).length} 型 × ${variantsTotal} 变体 × 2 上下文`);
ok(renderErrors.length === 0, `全部渲染通过${renderErrors.length ? " —— " + renderErrors.slice(0, 5).join(" | ") : ""}`);

// ---------- 2) 未知类型:live 渲染为空,edit 有占位 ----------
const unknownBlock = { id: "u1", type: "totally-unknown-x", props: {}, style: {} };
const liveOut = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [unknownBlock] }, { context: "live" });
const editOut = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [unknownBlock] }, { context: "edit" });
console.log("\n[2] 未知模块容错");
ok(liveOut.indexOf("totally-unknown-x") < 0, "live 上下文渲染为空(不白屏)");
ok(editOut.indexOf("未知模块类型") >= 0, "edit 上下文显示占位提示");

// ---------- 3) 媒体视频同构 ----------
const splitVid = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("split"), { props: { title: "T", body: "B", image: "https://cdn.example.com/demo.mp4", poster: "https://cdn.example.com/p.jpg", imageAlt: "演示视频" } })] }, { context: "live" });
console.log("\n[3] 媒体视频同构");
ok(splitVid.indexOf("<video") >= 0 && splitVid.indexOf("demo.mp4") >= 0, "mp4 直链输出原生 <video>");
ok(splitVid.indexOf("autoplay muted loop playsinline") >= 0, "video 默认静音自动循环");
ok(splitVid.indexOf('poster="https://cdn.example.com/p.jpg"') >= 0, "poster 输出");
const splitImg = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("split"), { props: { title: "T", body: "B", image: "https://cdn.example.com/a.png", imageAlt: "替代文本" } })] }, { context: "live" });
ok(splitImg.indexOf('alt="替代文本"') >= 0, "图片 alt 透传");
ok(splitImg.indexOf("<video") < 0, "普通图片不受影响");

// ---------- 4) 链接卡(tool-grid / blog) ----------
const grid = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("tool-grid"), { props: { title: "工具", items: [{ icon: "🛠", title: "A", href: "https://x.com/a" }, { icon: "🛠", title: "B" }] } })] }, { context: "live" });
const blog = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("blog"), { props: { title: "文章", items: [{ title: "P1", href: "page:about" }, { title: "P2" }] } })] }, { context: "live" });
console.log("\n[4] 链接卡");
ok((grid.match(/<a class="b-tool__entry"/g) || []).length === 1, "tool-grid 有 href 的卡输出 <a>");
ok(blog.indexOf('href="#about"') >= 0, "blog page:slug 在单文件态退化为锚点");

// ---------- 5) tabs 自动轮播 / prompt 真实输入 / 滑块 ----------
const tabsAuto = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("tabs"), { props: { items: [{ tab: "A" }, { tab: "B" }], autoplayMs: 5000 } })] }, { context: "live" });
const tabsEdit = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("tabs"), { props: { items: [{ tab: "A" }, { tab: "B" }], autoplayMs: 5000 } })] }, { context: "edit" });
const prompt = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [WF.newBlock("prompt")] }, { context: "live" });
const ba = WF.renderProject({ mode: "site", theme: WF.defaultTheme(), global: {}, blocks: [Object.assign(WF.newBlock("before-after"), { variant: "slider" })] }, { context: "live" });
console.log("\n[5] tabs 轮播 / prompt 输入 / 滑块");
ok(tabsAuto.indexOf('data-autoplay="5000"') >= 0, "live 输出 data-autoplay");
ok(tabsEdit.indexOf("data-autoplay") < 0, "edit 画布不轮播");
ok(prompt.indexOf("<textarea") >= 0 && prompt.indexOf("b-prompt__chip") >= 0, "prompt 为真实输入框 + 示例词按钮");
ok(ba.indexOf('type="range"') >= 0 && ba.indexOf("b-ba__before") >= 0, "前后对比滑块变体输出 range + 裁切层");

// ---------- 6) 发布前质检(preflight) ----------
console.log("\n[6] 发布前质检 preflight");
try {
  const { preflight } = require(path.join(root, "api/lib/preflight.js"));
  const bad = preflight({ global: {}, blocks: [{ id: "h", type: "hero", props: { title: "" } }, { id: "x", type: "ghost-type", props: {} }] });
  ok(bad.ok === false && bad.errors.length >= 2, `异常项目被拦截(${bad.errors.length} BLOCK)`);
  const good = preflight({ global: { title: "T", description: "D" }, blocks: [{ id: "h", type: "hero", props: { title: "hello" } }] });
  ok(good.ok === true, `正常项目通过(${good.warns.length} warn)`);
} catch (e) {
  ok(false, "preflight 加载失败: " + e.message);
}

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
