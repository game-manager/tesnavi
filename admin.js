const APP_STORAGE_ROOT = "tesnavi";
const RECAPTCHA_SITE_KEY = "6LdB3CEtAAAAACpt-mWbKil76U66ok5MhI_M23LJ";

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

// 管理者メールアドレスはコードに直書きしない。管理者判定は users/{uid}/role を参照する。
// 本番運用では Firebase Security Rules または Custom Claims で管理者権限を必ず保護する。
// 初回管理者の設定方法:
// 1. Firebase Console を開く。
// 2. Realtime Database の users ノードを開く。
// 3. 管理者にしたいユーザーの uid を確認する。
// 4. users/{uid}/role に "admin" を設定する。
// 5. そのユーザーでログインすると admin.html が見られる。
//
// Realtime Database Rules の例:
// {
//   "rules": {
//     "adminData": {
//       ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
//       ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
//     },
//     "tesnavi": {
//       ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
//     }
//   }
// }

const elements = {
  status: document.getElementById("adminStatus"),
  loginPanel: document.getElementById("adminLoginPanel"),
  deniedPanel: document.getElementById("adminDeniedPanel"),
  dashboard: document.getElementById("adminDashboard"),
  loginForm: document.getElementById("adminLoginForm"),
  email: document.getElementById("adminEmail"),
  password: document.getElementById("adminPassword"),
  googleButton: document.getElementById("adminGoogleButton"),
  logoutButton: document.getElementById("adminLogoutButton"),
  loginMessage: document.getElementById("adminLoginMessage"),
  metricUsers: document.getElementById("metricUsers"),
  metricRankings: document.getElementById("metricRankings"),
  metricTodayDone: document.getElementById("metricTodayDone"),
  metricEvents: document.getElementById("metricEvents"),
  metricUpdatedAt: document.getElementById("metricUpdatedAt"),
  rankingRows: document.getElementById("adminRankingRows"),
  inquiryList: document.getElementById("adminInquiryList"),
  errorList: document.getElementById("adminErrorList")
};

let auth = null;
let database = null;
let dashboardLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
  initAdminFirebase();
  elements.loginForm.addEventListener("submit", loginWithEmail);
  elements.googleButton.addEventListener("click", loginWithGoogle);
  elements.logoutButton.addEventListener("click", logout);
});

function initAdminFirebase() {
  try {
    if (!window.firebase || !window.firebase.apps) {
      throw new Error("ログイン機能の準備ができていません。");
    }

    const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
    initAppCheck();
    auth = window.firebase.auth(app);
    database = window.firebase.database(app);
    auth.onAuthStateChanged(handleAuthState);
  } catch (error) {
    console.warn("管理画面の初期化に失敗しました。", error);
    setStatus("管理画面の準備ができませんでした。時間をおいてもう一度開いてください。", "error");
  }
}

function initAppCheck() {
  if (!window.firebase.appCheck) return;
  try {
    window.firebase.appCheck().activate(RECAPTCHA_SITE_KEY, true);
  } catch (error) {
    console.warn("安全確認の初期化に失敗しました。", error);
  }
}

async function handleAuthState(user) {
  dashboardLoaded = false;
  elements.dashboard.hidden = true;
  elements.deniedPanel.hidden = true;
  elements.logoutButton.hidden = !user;

  if (!user) {
    setStatus("管理者アカウントでログインしてください。", "");
    elements.loginPanel.hidden = false;
    return;
  }

  elements.loginPanel.hidden = true;
  setStatus("管理者権限を確認しています。", "");

  try {
    const role = await readAdminRole(user.uid);
    if (role !== "admin") {
      setStatus("管理者権限がありません。", "error");
      elements.deniedPanel.hidden = false;
      return;
    }

    setStatus("管理者としてログイン中です。", "success");
    elements.dashboard.hidden = false;
    await loadAdminDashboard();
  } catch (error) {
    console.warn("管理者権限の確認に失敗しました。", error);
    setStatus("管理者権限を確認できませんでした。設定を確認してください。", "error");
    elements.deniedPanel.hidden = false;
  }
}

function readAdminRole(uid) {
  return database.ref(`users/${uid}/role`).once("value").then((snapshot) => {
    return String(snapshot.val() || "");
  });
}

async function loadAdminDashboard() {
  if (dashboardLoaded) return;
  dashboardLoaded = true;

  try {
    const [accountsSnapshot, rankingsSnapshot, inquiriesSnapshot, errorsSnapshot] = await Promise.all([
      database.ref(`${APP_STORAGE_ROOT}/accounts`).once("value"),
      database.ref(`${APP_STORAGE_ROOT}/rankings`).once("value"),
      database.ref(`${APP_STORAGE_ROOT}/inquiries`).once("value"),
      database.ref(`${APP_STORAGE_ROOT}/adminData/errors`).once("value")
    ]);

    const accounts = snapshotObject(accountsSnapshot);
    const rankings = snapshotObject(rankingsSnapshot);
    const inquiries = snapshotObject(inquiriesSnapshot);
    const errors = snapshotObject(errorsSnapshot);

    renderMetrics(accounts, rankings);
    renderRankingTable(rankings);
    renderInquiries(inquiries);
    renderErrors(errors);
  } catch (error) {
    console.warn("管理データの読み込みに失敗しました。", error);
    setStatus("管理データを読み込めませんでした。権限設定を確認してください。", "error");
  }
}

function renderMetrics(accounts, rankings) {
  const accountList = Object.values(accounts);
  const rankingList = Object.values(rankings);
  const todayKey = toISODate(new Date());

  let todayDone = 0;
  let eventCount = 0;
  let latestUpdatedAt = 0;

  accountList.forEach((account) => {
    const state = account && account.state ? account.state : account;
    const plan = Array.isArray(state.plan) ? state.plan : [];
    const events = Array.isArray(state.events) ? state.events : [];
    todayDone += plan.filter((day) => day.date === todayKey && day.status === "done").length;
    eventCount += events.length;
    latestUpdatedAt = Math.max(latestUpdatedAt, Number(state.updatedAt || 0));
  });

  elements.metricUsers.textContent = String(accountList.length);
  elements.metricRankings.textContent = String(rankingList.length);
  elements.metricTodayDone.textContent = String(todayDone);
  elements.metricEvents.textContent = String(eventCount);
  elements.metricUpdatedAt.textContent = latestUpdatedAt ? formatDateTime(latestUpdatedAt) : "--";
}

function renderRankingTable(rankings) {
  const rows = Object.values(rankings).sort((a, b) => {
    return Number(b.totalCompletedTasks || 0) - Number(a.totalCompletedTasks || 0);
  });

  if (rows.length === 0) {
    elements.rankingRows.innerHTML = '<tr><td colspan="4">まだランキング参加者はいません。</td></tr>';
    return;
  }

  elements.rankingRows.innerHTML = rows.map((entry) => `
    <tr>
      <td>${escapeHTML(entry.username || "未設定")}</td>
      <td>${Number(entry.totalCompletedTasks || 0)}</td>
      <td>${Number(entry.currentTaskStreak || 0)}</td>
      <td>${entry.updatedAt ? formatDateTime(entry.updatedAt) : "--"}</td>
    </tr>
  `).join("");
}

function renderInquiries(inquiries) {
  const items = Object.values(inquiries).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  if (items.length === 0) {
    elements.inquiryList.innerHTML = '<p class="empty-message">まだ問い合わせはありません。</p>';
    return;
  }

  elements.inquiryList.innerHTML = items.slice(0, 20).map((item) => `
    <article class="admin-list-item">
      <strong>${escapeHTML(item.name || "名前なし")} ${item.email ? ` / ${escapeHTML(item.email)}` : ""}</strong>
      <p>${escapeHTML(item.message || "")}</p>
      <p>${item.createdAt ? formatDateTime(item.createdAt) : "--"}</p>
    </article>
  `).join("");
}

function renderErrors(errors) {
  const items = Object.values(errors).sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));
  if (items.length === 0) {
    elements.errorList.innerHTML = '<p class="empty-message">記録されたエラーはありません。</p>';
    return;
  }

  elements.errorList.innerHTML = items.slice(0, 20).map((item) => `
    <article class="admin-list-item">
      <strong>${escapeHTML(item.title || item.action || "エラー")}</strong>
      <p>${escapeHTML(item.message || item.code || "")}</p>
      <p>${formatDateTime(item.createdAt || item.updatedAt || Date.now())}</p>
    </article>
  `).join("");
}

async function loginWithEmail(event) {
  event.preventDefault();
  const email = elements.email.value.trim();
  const password = elements.password.value;

  if (!email || !password) {
    setLoginMessage("メールアドレスとパスワードを入力してください。", "error");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    elements.loginForm.reset();
    setLoginMessage("", "");
  } catch (error) {
    console.warn("管理者ログインに失敗しました。", error);
    setLoginMessage(getLoginErrorMessage(error), "error");
  }
}

async function loginWithGoogle() {
  try {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await auth.signInWithPopup(provider);
    setLoginMessage("", "");
  } catch (error) {
    console.warn("Googleログインに失敗しました。", error);
    setLoginMessage(getLoginErrorMessage(error), "error");
  }
}

async function logout() {
  try {
    await auth.signOut();
  } catch (error) {
    console.warn("ログアウトに失敗しました。", error);
  }
}

function snapshotObject(snapshot) {
  const value = snapshot.val();
  return value && typeof value === "object" ? value : {};
}

function setStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `admin-status ${type || ""}`.trim();
}

function setLoginMessage(message, type) {
  elements.loginMessage.textContent = message;
  elements.loginMessage.className = `settings-message ${type || ""}`.trim();
}

function getLoginErrorMessage(error) {
  const code = String(error && error.code ? error.code : "");
  if (code.includes("popup-closed-by-user")) return "ログイン画面が閉じられました。もう一度試してください。";
  if (code.includes("unauthorized-domain")) return "このURLでログインできる設定になっていません。ログイン許可ドメインを確認してください。";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "メールアドレスまたはパスワードが違います。";
  return "ログインできませんでした。時間をおいてもう一度試してください。";
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
