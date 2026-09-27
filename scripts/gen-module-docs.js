/* 生成模块清单 markdown(供 docs/APPENDIX-FEATURES.md 引用)
 * 用法: node scripts/gen-module-docs.js > /tmp/modules.md
 * 原理: 用 window/localStorage 垫片加载 schema.js + variants*.js,然后读取 WF.Blocks/WF.Variants。
 */
const fs = require("fs");
const path = require("path");

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { addEventListener: () => {}, createElement: () => ({ style: {}, dataset: {} }), head: { appendChild: () => {} } };

const root = path.join(__dirname, "..");
const files = ["js/schema.js", "js/variants.js", "js/variants-batch-1.js", "js/variants-batch-2.js", "js/variants-batch-3.js", "js/variants-batch-4.js", "js/variants-batch-5.js"];
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), "utf8");
  eval(code);
}

const WF = global.WF;
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const modeNames = { site: "官网", h5: "H5", ppt: "PPT", story: "故事" };
const typeNames = {
  text: "文本", textarea: "多行文本", select: "选项", toggle: "开关", number: "数字",
  color: "颜色", image: "图片", url: "链接", datetime: "时间", list: "列表", tel: "电话", email: "邮箱",
};

const cats = {};
for (const [type, b] of Object.entries(WF.Blocks)) {
  (cats[b.category] = cats[b.category] || []).push([type, b]);
}

const lines = [];
for (const [cat, list] of Object.entries(cats)) {
  lines.push(`\n### ${cat}\n`);
  for (const [type, b] of list) {
    const modes = (b.modes || []).map((m) => modeNames[m] || m).join(" / ");
    const variants = WF.Variants && WF.Variants[type] ? Object.keys(WF.Variants[type]).length : 0;
    lines.push(`#### ${b.icon || ""} ${b.name} \`${type}\`\n`);
    lines.push(`![${b.name}](screenshots/block-${type}.png)\n`);
    lines.push(`- **用途**:${esc(b.desc)}`);
    lines.push(`- **适用形态**:${modes}`);
    lines.push(`- **布局变体**:${variants ? variants + " 种" : "1 种(经典)"}`);
    if (b.fields && b.fields.length) {
      const rows = b.fields.map((f) => {
        let detail = typeNames[f.type] || f.type;
        if (f.type === "select" && Array.isArray(f.options)) detail += "(" + f.options.map((o) => o[1]).join("/") + ")";
        if (f.type === "list" && f.itemFields && f.itemFields.length) detail += "(项:" + f.itemFields.map((i) => i.label || i.key).join("、") + ")";
        if (f.hint) detail += ";提示:" + esc(f.hint);
        return `| ${esc(f.label || f.key)} | ${detail} |`;
      });
      lines.push("\n| 可编辑字段 | 说明 |");
      lines.push("| --- | --- |");
      lines.push(...rows);
    }
    lines.push("");
  }
}
console.log(lines.join("\n"));
