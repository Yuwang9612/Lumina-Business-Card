const { generateBeautifulReport } = require('./reportGenerator');

// ==================== 你的真实数据（已按你上传的两个PDF整理） ====================
const reportData = {
  recurring_net: "-$400",
  optimized_net: "$100",
  unlock: "+$500",
  
  actions: [
    {
      name: "Capital One Spark Cash Plus",
      level: "HIGH",
      desc: "This card is losing money",
      todo: "Cancel or replace before the annual fee posts.",
      loss: "-$400"
    },
    {
      name: "Amex Business Platinum",
      level: "LOW",
      desc: "Review needed",
      todo: "Review this item and take the best next step.",
      loss: ""
    },
    {
      name: "Capital One Venture X Business",
      level: "LOW",
      desc: "Review needed",
      todo: "Review this item and take the best next step.",
      loss: ""
    },
    {
      name: "Chase Ink Business Preferred",
      level: "LOW",
      desc: "Review needed",
      todo: "Review this item and take the best next step.",
      loss: ""
    },
    {
      name: "Chase Ink Business Unlimited",
      level: "LOW",
      desc: "Review needed",
      todo: "Review this item and take the best next step.",
      loss: ""
    }
  ]
};

// ==================== 生成报告 ====================
async function run() {
  console.log("🚀 开始生成漂亮报告...");
  
  await generateBeautifulReport(reportData, "Lumina_WakeUp_Beautiful_2026-02-26.pdf");
  
  // 如果你想同时生成 Monthly 版，可以再加一个数据对象
  console.log("✅ 全部完成！请打开生成的 PDF 查看效果");
}

run();
