import express from "express";
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from "discord.js";
import fetch from "node-fetch";
import sharp from "sharp";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
const PORT = 7777;
const TOKEN = "Token_Bot";
const API_KEY = "API_KEY"; // https://www.remove.bg/api

// ================= DATABASE =================
let db;
(async () => {
  db = await open({
    filename: "./removebg_history.db",
    driver: sqlite3.Database,
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      image_name TEXT,
      width INTEGER,
      height INTEGER,
      size REAL,
      created_at TEXT
    )
  `);
})();

// ================= STATIC FOLDER =================
if (!fs.existsSync("public")) fs.mkdirSync("public");
app.use(express.static("public")); // serve static files

// ================= DISCORD BOT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => console.log(`✅ บอทออนไลน์ในชื่อ ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("w.ลบพื้นหลัง")) return;

  const attachments = message.attachments;
  if (!attachments.size) return message.reply("📷 กรุณาแนบรูปภาพมาด้วยนะ");

  const processing = await message.reply("<a:sunny355:1434983851175837788> กำลังลบพื้นหลัง...");

  for (const [_, attachment] of attachments) {
    try {
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": API_KEY },
        body: new URLSearchParams({ image_url: attachment.url, size: "auto" }),
      });

      if (!response.ok) throw new Error("RemoveBG API Error");

      const resultBuffer = Buffer.from(await response.arrayBuffer());
      const fileName = `public/output-${Date.now()}.png`;
      fs.writeFileSync(fileName, resultBuffer);

      const metadata = await sharp(resultBuffer).metadata();
      const { width, height } = metadata;
      const fileSize = (resultBuffer.length / (1024 * 1024)).toFixed(2);

      await db.run(
        "INSERT INTO history (username, image_name, width, height, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [message.author.tag, fileName, width, height, fileSize, new Date().toISOString()]
      );

      const file = new AttachmentBuilder(fileName);
      const embed = new EmbedBuilder()
        .setColor("#aeefff")
        .setTitle("<a:Verify:1434983031160176783> ลบพื้นหลังสำเร็จ!")
        .addFields(
          { name: "<a:2_basket:1434985714231283715> ขนาดภาพ", value: `${width} × ${height} px`, inline: true },
          { name: "<a:sunny26:1434985951570034769> ขนาดไฟล์", value: `${fileSize} MB`, inline: true },
          { name: "<a:jungwad_crown:1434984585216786534> ผู้ใช้", value: `${message.author.tag}`, inline: false }
        )
        .setImage(`attachment://${fileName.split("/").pop()}`) // Embed ใช้เฉพาะชื่อไฟล์
        .setFooter({ text: "RemoveBG | Washix Dev" })
        .setTimestamp();

      await message.reply({ embeds: [embed], files: [file] });
      // fs.unlinkSync(fileName);
    } catch (err) {
      console.error(err);
      await message.reply(`<a:Sunny_gif_17:1434984207394017392> เกิดข้อผิดพลาดกับรูป: ${attachment.name}`);
    }
  }
  await processing.delete();
});

// ================= DYNAMIC WEB =================
app.get("/", async (req, res) => {
  const rows = await db.all("SELECT * FROM history ORDER BY id DESC LIMIT 50");
  const cards = rows
  .map(
    (r) => `
    <div class="card fade-in">
      <img src="/${r.image_name.split("/").pop()}" alt="preview"/>
      <div class="info">
        <h3>${r.username}</h3>
        <p>📏 ${r.width}×${r.height}px</p>
        <p>💾 ${r.size} MB</p>
        <span>🕒 ${new Date(r.created_at).toLocaleString()}</span>
      </div>
    </div>
  `
  )
  .join("");

  res.send(`
  <html>
    <head>
      <title>❄️ RemoveBG Dashboard | Washix Dev</title>
      <meta charset="utf-8" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(180deg, #e0f7fa 0%, #b3e5fc 50%, #e3f2fd 100%);
          overflow-x: hidden;
          color: #01579b;
          margin: 0;
          padding: 0;
        }
        header { text-align: center; padding: 40px 20px 20px; color: #0288d1; }
        header h1 { font-size: 3em; margin-bottom: 5px; text-shadow: 0 0 10px #b3e5fc, 0 0 20px #81d4fa; }
        header p { color: #03a9f4; font-size: 1.2em; margin-bottom: 30px; }
        .snow { position: fixed; top:0; left:0; width:100%; height:100%; background-image:url('https://s12.gifyu.com/images/Dashboard'); animation:snow 30s linear infinite; opacity:0.25; z-index:-1;}
        @keyframes snow { from {background-position:0 0;} to {background-position:0 1000px;} }
        .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:25px; padding:0 30px 80px; }
        .card { background: rgba(255, 255, 255, 0.8); border-radius:20px; box-shadow:0 8px 30px rgba(0, 150, 255, 0.15); overflow:hidden; transition: transform 0.3s, box-shadow 0.3s; backdrop-filter: blur(10px); }
        .card:hover { transform: translateY(-10px); box-shadow:0 12px 40px rgba(0, 150, 255, 0.3); }
        .card img { width:100%; height:auto; }
        .info { padding:15px; text-align:center; }
        .info h3 { margin:0; font-size:1.1em; color:#0277bd; }
        .info p { margin:5px 0; font-size:0.95em; color:#039be5; }
        .info span { display:block; font-size:0.8em; color:#4fc3f7; }
        .fade-in { opacity:0; animation: fadeIn 1s ease-in forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        footer { text-align:center; padding:20px; color:#0288d1; font-size:0.95em; }
      </style>
      <script>setInterval(()=>{location.reload();},10000);</script>
    </head>
    <body>
      <div class="snow"></div>
      <header>
        <h1>❄️ RemoveBG Dashboard</h1>
        <p>ระบบจัดการการลบพื้นหลัง | โดย Washix</p>
      </header>
      <div class="grid">${cards}</div>
      <footer>© 2025 WashiX Dev | Support By RemoveBG</footer>
    </body>
  </html>
  `);
});

app.listen(PORT, () => console.log(`🌐 Dashboard ออนไลน์ที่ http://localhost:${PORT}`));
client.login(TOKEN);
