import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-ai.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtT0cbLVsQ_89SxhkBMRZYdDmyyBLQo7U",
  authDomain: "tesnavi-c348f.firebaseapp.com",
  databaseURL: "https://tesnavi-c348f-default-rtdb.firebaseio.com",
  projectId: "tesnavi-c348f",
  storageBucket: "tesnavi-c348f.firebasestorage.app",
  messagingSenderId: "371388646714",
  appId: "1:371388646714:web:e066cca1fc80de9f13bc03",
  measurementId: "G-M8MZR29ZRE"
};

const MODEL_NAME = "gemini-3.5-flash";
const AI_APP_NAME = "tesnavi-ai";

let model;

function getModel() {
  if (model) return model;

  const app = getApps().some((item) => item.name === AI_APP_NAME)
    ? getApp(AI_APP_NAME)
    : initializeApp(firebaseConfig, AI_APP_NAME);
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  model = getGenerativeModel(ai, {
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 900
    }
  });

  return model;
}

async function generateStudyReply(message, context) {
  const prompt = createStudyPrompt(message, context);
  const result = await getModel().generateContent(prompt);
  return getResponseText(result);
}

async function scanAssignmentsFromImage(file) {
  const inlineData = await fileToInlineData(file);
  const prompt = [
    "この画像は中学生〜高校生向けのテスト課題表や提出物メモです。",
    "読み取れる範囲で、教科ごとの課題候補をJSON配列だけで返してください。",
    "説明文やMarkdownは不要です。",
    "各要素は subjectName, range, amount, unit, weakness を必ず含めてください。",
    "unit は ページ, 個, 問, 章 のどれかにしてください。",
    "weakness は 普通 にしてください。",
    "amount が読めない場合は、無理に大きくせず 1〜10 程度の実用的な数にしてください。",
    "例: [{\"subjectName\":\"数学\",\"range\":\"ワークP10〜P45\",\"amount\":36,\"unit\":\"ページ\",\"weakness\":\"普通\"}]"
  ].join("\n");

  const result = await getModel().generateContent([
    prompt,
    { inlineData }
  ]);

  return normalizeAssignments(parseJSONList(getResponseText(result)));
}

function createStudyPrompt(message, context) {
  return [
    "あなたは中学生〜高校生のテスト勉強を支える、やさしく実用的な学習サポートAIです。",
    "日本語で、短めに、次にやる行動がわかるように答えてください。",
    "説教っぽくせず、利用者に寄り添ってください。",
    "個人情報、学校名、住所などを聞き出さないでください。",
    "",
    "現在のテスナビ情報:",
    JSON.stringify(context, null, 2),
    "",
    "利用者のメッセージ:",
    message
  ].join("\n");
}

function getResponseText(result) {
  const response = result && result.response;
  if (response && typeof response.text === "function") return response.text();
  if (response && typeof response.text === "string") return response.text;
  if (typeof result.text === "string") return result.text;
  return "";
}

function fileToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const [, base64 = ""] = dataUrl.split(",");
      resolve({
        data: base64,
        mimeType: file.type || "image/png"
      });
    };
    reader.onerror = () => reject(reader.error || new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function parseJSONList(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  return JSON.parse(arrayMatch ? arrayMatch[0] : cleaned);
}

function normalizeAssignments(value) {
  const list = Array.isArray(value) ? value : [];
  const allowedUnits = ["ページ", "個", "問", "章"];
  const allowedWeakness = ["得意", "普通", "苦手"];

  return list.map((item) => {
    const amount = Number(item.amount);
    const unit = allowedUnits.includes(item.unit) ? item.unit : "ページ";
    const weakness = allowedWeakness.includes(item.weakness) ? item.weakness : "普通";

    return {
      subjectName: String(item.subjectName || "課題").trim(),
      range: String(item.range || "画像から読み取った課題").trim(),
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 1,
      unit,
      weakness
    };
  }).filter((item) => item.subjectName && item.range);
}

window.tesnaviGemini = {
  modelName: MODEL_NAME,
  generateStudyReply,
  scanAssignmentsFromImage
};
