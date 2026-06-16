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
let scanModel;

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

function getScanModel() {
  if (scanModel) return scanModel;

  const app = getApps().some((item) => item.name === AI_APP_NAME)
    ? getApp(AI_APP_NAME)
    : initializeApp(firebaseConfig, AI_APP_NAME);
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  scanModel = getGenerativeModel(ai, {
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  });

  return scanModel;
}

async function generateStudyReply(message, context) {
  const prompt = createStudyPrompt(message, context);
  const result = await getModel().generateContent(prompt);
  return getResponseText(result);
}

async function scanAssignmentsFromImage(file) {
  const inlineData = await fileToInlineData(file);
  const prompt = createAssignmentScanPrompt();

  const result = await getScanModel().generateContent([
    prompt,
    { inlineData }
  ]);

  const firstPass = normalizeAssignments(await parseAssignmentsJSON(getResponseText(result)));

  if (!shouldRetryAssignmentScan(firstPass)) {
    return firstPass;
  }

  try {
    console.warn("課題読み取りの件数が少ないため、表専用プロンプトで再読み取りします。");
    const retryResult = await getScanModel().generateContent([
      createAssignmentScanRetryPrompt(firstPass),
      { inlineData }
    ]);
    const retryPass = normalizeAssignments(await parseAssignmentsJSON(getResponseText(retryResult)));
    return retryPass.length >= firstPass.length ? mergeAssignments(retryPass, firstPass) : firstPass;
  } catch (error) {
    console.warn("課題読み取りの再試行に失敗しました。初回結果を使います。", error);
    return firstPass;
  }
}

function createAssignmentScanPrompt() {
  return [
    "あなたは日本の中学校・高校のテスト範囲表を読むOCR補助です。",
    "画像は表形式で、左端の細い列に教科名、中央の列に「考査範囲」、右の列に「ポイント」があります。",
    "課題候補は中央の「考査範囲」列から抽出してください。右の「ポイント」列は原則として範囲に混ぜないでください。",
    "",
    "最重要ルール:",
    "1. 左端の教科名を必ず読む。教科名は 国語, 社会, 数学, 理科, 音楽, 美術, 保健体育, 家庭, 英語 のような学校教科名に正規化する。",
    "2. 同じ教科の中に複数の教材・ページ・問題番号がある場合は、1件にまとめず、教材や範囲ごとに複数件へ分けてよい。",
    "3. 教科名が縦書き・結合セル・行またぎでも、直前または同じ枠の左端教科名を引き継ぐ。",
    "4. ページ範囲は p48-p125, P72〜P111, pp.117-156 などをそのまま range に残す。",
    "5. 問題番号は 174番〜256番 のようにそのまま range に残す。",
    "6. 画像に存在しない教科や教材を作らない。読めない文字は推測しすぎない。",
    "",
    "amount と unit の決め方:",
    "- ページ範囲が主なら unit は ページ。amount は両端を含めて数える。例: P10〜P45 は 36ページ。",
    "- 複数ページ範囲があるなら足し合わせる。例: P10〜16・P66〜83・P86〜91 は 31ページ。",
    "- 問題番号範囲が主なら unit は 問。amount は両端を含めて数える。例: 174番〜256番 は 83問。",
    "- 章だけが読める場合は unit は 章。",
    "- ページ・問題数が読めない作品名や単元名だけの場合は unit は 個、amount は主要項目数にする。",
    "",
    "出力はJSON配列だけ。Markdownや説明文は禁止。",
    "各要素のキーは subjectName, range, amount, unit, weakness。",
    "weakness は必ず 普通。",
    "JSON文字列の中に改行を入れない。range は1行の短い文字列にする。",
    "最大25件まで。細かすぎる範囲は教材ごとにまとめる。",
    "",
    "出力例:",
    "[",
    "  {\"subjectName\":\"社会\",\"range\":\"地理: 教科書p48-p125\",\"amount\":78,\"unit\":\"ページ\",\"weakness\":\"普通\"},",
    "  {\"subjectName\":\"数学\",\"range\":\"体系問題集 幾何編 174番〜256番\",\"amount\":83,\"unit\":\"問\",\"weakness\":\"普通\"}",
    "]"
  ].join("\n");
}

function createAssignmentScanRetryPrompt(previousItems) {
  return [
    "前回の読み取りでは教科やページ数が抜けた可能性があります。",
    "同じ画像を、学校のテスト範囲表としてもう一度読み取ってください。",
    "",
    "必ず確認する教科ラベル:",
    "国語, 社会, 数学, 理科, 音楽, 美術, 保健体育, 家庭, 英語",
    "",
    "表の読み方:",
    "- 左端の細い列が教科名です。縦書きや結合セルでも必ず拾う。",
    "- 中央の「考査範囲」だけを課題候補にする。",
    "- 右側の「ポイント」は学習アドバイスなので、課題量の計算には使わない。",
    "- 1教科に複数教材がある場合は、教材ごとに分けてよい。",
    "- p48-p125, P72〜P111, pp.117-156 のようなページ範囲を見つけたら、range にそのまま残す。",
    "- 174番〜256番 のような問題番号範囲を見つけたら、range にそのまま残す。",
    "- ページ数や問題数は両端を含めて数える。",
    "- 読めない部分は推測で作らない。ただし、教科名は左端の表記から補う。",
    "",
    "前回候補:",
    JSON.stringify(previousItems),
    "",
    "出力はJSON配列のみ。各要素のキーは subjectName, range, amount, unit, weakness。",
    "unit は ページ, 個, 問, 章 のどれか。weakness は 普通。",
    "JSON文字列の中に改行を入れない。最大25件。"
  ].join("\n");
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

async function parseAssignmentsJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const candidate = arrayMatch ? arrayMatch[0] : cleaned;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.warn("GeminiのJSONが壊れていたため、修復を試します。", error);
    return repairAssignmentsJSON(candidate);
  }
}

async function repairAssignmentsJSON(brokenText) {
  const prompt = [
    "次のテキストは、学校のテスト範囲を抽出しようとして壊れたJSONです。",
    "内容を保ちながら、妥当なJSON配列だけに修復してください。",
    "説明文、Markdown、コードブロックは禁止。",
    "各要素のキーは subjectName, range, amount, unit, weakness。",
    "unit は ページ, 個, 問, 章 のどれか。",
    "weakness は 普通。",
    "range の文字列に改行を入れない。",
    "",
    brokenText
  ].join("\n");

  const result = await getScanModel().generateContent(prompt);
  const repaired = getResponseText(result)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const arrayMatch = repaired.match(/\[[\s\S]*\]/);
  return JSON.parse(arrayMatch ? arrayMatch[0] : repaired);
}

function normalizeAssignments(value) {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value && value.assignments)
      ? value.assignments
      : [];
  const allowedUnits = ["ページ", "個", "問", "章"];
  const allowedWeakness = ["得意", "普通", "苦手"];

  return list.map((item) => {
    const range = String(item.range || item.sourceText || "画像から読み取った課題")
      .replace(/\s*\n+\s*/g, " / ")
      .trim();
    const sourceText = String(item.sourceText || "").trim();
    const inferred = inferAmountAndUnit(`${range} ${sourceText}`);
    const unit = inferred.unit || (allowedUnits.includes(item.unit) ? item.unit : "ページ");
    const amount = inferred.amount || Number(item.amount);
    const weakness = allowedWeakness.includes(item.weakness) ? item.weakness : "普通";

    return {
      subjectName: normalizeSubjectName(item.subjectName),
      range,
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 1,
      unit,
      weakness
    };
  }).filter((item) => item.subjectName && item.range);
}

function shouldRetryAssignmentScan(assignments) {
  if (!Array.isArray(assignments) || assignments.length < 4) return true;

  const subjects = new Set(assignments.map((item) => item.subjectName));
  const coreSubjects = ["国語", "社会", "数学", "理科", "英語"];
  const foundCoreCount = coreSubjects.filter((subject) => subjects.has(subject)).length;
  return foundCoreCount < 3;
}

function mergeAssignments(primary, secondary) {
  const merged = [];
  const seen = new Set();

  [...primary, ...secondary].forEach((item) => {
    const key = `${item.subjectName}|${normalizeRangeText(item.range).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function normalizeSubjectName(value) {
  const text = String(value || "").replace(/\s+/g, "").replace(/[＊*]/g, "").trim();
  const subjectMap = [
    [/国語/, "国語"],
    [/社会|地理|歴史|公民/, "社会"],
    [/数学|算数/, "数学"],
    [/理科|化学|物理|生物|地学/, "理科"],
    [/音楽/, "音楽"],
    [/美術/, "美術"],
    [/保健体育|保体|体育|保健/, "保健体育"],
    [/家庭|技術家庭|技家/, "家庭"],
    [/英語|English/i, "英語"]
  ];
  const matched = subjectMap.find(([pattern]) => pattern.test(text));
  return matched ? matched[1] : text || "課題";
}

function inferAmountAndUnit(text) {
  const normalized = normalizeRangeText(text);
  const pageTotal = sumRanges(normalized, /(?:p|pp|page|ページ)\.?\s*(\d+)\s*(?:-|~|〜|ー|－|～)\s*(?:p|pp|page|ページ)?\.?\s*(\d+)/gi);
  if (pageTotal > 0) {
    return { amount: pageTotal, unit: "ページ" };
  }

  const problemTotal = sumRanges(normalized, /(\d+)\s*(?:番|問)\s*(?:-|~|〜|ー|－|～)\s*(\d+)\s*(?:番|問)?/g);
  if (problemTotal > 0) {
    return { amount: problemTotal, unit: "問" };
  }

  const chapterTotal = countChapterMentions(normalized);
  if (chapterTotal > 0) {
    return { amount: chapterTotal, unit: "章" };
  }

  return { amount: 0, unit: "" };
}

function normalizeRangeText(text) {
  return String(text || "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[Ｐｐ]/g, "p")
    .replace(/[　\s]+/g, " ")
    .replace(/(\d)\s+(?=\d)/g, "$1");
}

function sumRanges(text, pattern) {
  let total = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      total += end - start + 1;
    }
  }
  return total;
}

function countChapterMentions(text) {
  const matches = text.match(/\d+\s*(?:章|編)/g);
  return matches ? matches.length : 0;
}

window.tesnaviGemini = {
  modelName: MODEL_NAME,
  generateStudyReply,
  scanAssignmentsFromImage
};
