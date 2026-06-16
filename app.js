const STORAGE_KEY = "tesuraku-state-v1";
const DEVICE_ID_KEY = "tesuraku-device-id";
const CONTACT_DRAFTS_KEY = "tesuraku-contact-drafts";
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

const firebaseSync = {
  appCheckReady: false,
  auth: null,
  currentPath: "",
  database: null,
  enabled: false,
  isApplyingRemote: false,
  saveTimer: null,
  stateRef: null,
  valueHandler: null
};

const accountState = {
  user: null
};

const weightMap = {
  "苦手": 1.5,
  "普通": 1.0,
  "得意": 0.7
};

const state = {
  basic: {
    testName: "",
    startDate: "",
    testDate: "",
    weekdayMinutes: "",
    weekendMinutes: ""
  },
  subjects: [],
  events: [],
  plan: [],
  unfinished: [],
  aiMessages: [],
  scannedAssignments: []
};

const elements = {
  testName: document.getElementById("testName"),
  startDate: document.getElementById("startDate"),
  testDate: document.getElementById("testDate"),
  weekdayMinutes: document.getElementById("weekdayMinutes"),
  weekendMinutes: document.getElementById("weekendMinutes"),
  subjectName: document.getElementById("subjectName"),
  subjectRange: document.getElementById("subjectRange"),
  studyAmount: document.getElementById("studyAmount"),
  studyUnit: document.getElementById("studyUnit"),
  weakness: document.getElementById("weakness"),
  eventTitle: document.getElementById("eventTitle"),
  eventDate: document.getElementById("eventDate"),
  eventStart: document.getElementById("eventStart"),
  eventEnd: document.getElementById("eventEnd"),
  eventType: document.getElementById("eventType"),
  eventNote: document.getElementById("eventNote"),
  subjectForm: document.getElementById("subjectForm"),
  eventForm: document.getElementById("eventForm"),
  basicForm: document.getElementById("basicForm"),
  subjectList: document.getElementById("subjectList"),
  eventList: document.getElementById("eventList"),
  todayTodoList: document.getElementById("todayTodoList"),
  calendarList: document.getElementById("calendarList"),
  unfinishedList: document.getElementById("unfinishedList"),
  generateButton: document.getElementById("generateButton"),
  redistributeButton: document.getElementById("redistributeButton"),
  resetButton: document.getElementById("resetButton"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  daysLeft: document.getElementById("daysLeft"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  subjectCount: document.getElementById("subjectCount"),
  unfinishedCount: document.getElementById("unfinishedCount"),
  planName: document.getElementById("planName"),
  calendarTitle: document.getElementById("calendarTitle"),
  dashboardNextTitle: document.getElementById("dashboardNextTitle"),
  dashboardNextMeta: document.getElementById("dashboardNextMeta"),
  dashboardNextItems: document.getElementById("dashboardNextItems"),
  goInputButton: document.getElementById("goInputButton"),
  goScheduleButton: document.getElementById("goScheduleButton"),
  aiForm: document.getElementById("aiForm"),
  aiInput: document.getElementById("aiInput"),
  aiMessages: document.getElementById("aiMessages"),
  aiSuggestions: document.querySelectorAll(".ai-suggestion"),
  assignmentImageInput: document.getElementById("assignmentImageInput"),
  assignmentPreview: document.getElementById("assignmentPreview"),
  assignmentPreviewEmpty: document.getElementById("assignmentPreviewEmpty"),
  scanAssignmentButton: document.getElementById("scanAssignmentButton"),
  scanResultList: document.getElementById("scanResultList"),
  firebaseStatus: document.getElementById("firebaseStatus"),
  registerForm: document.getElementById("registerForm"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  registerPasswordConfirm: document.getElementById("registerPasswordConfirm"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  googleLoginButton: document.getElementById("googleLoginButton"),
  logoutButton: document.getElementById("logoutButton"),
  accountStatusBadge: document.getElementById("accountStatusBadge"),
  accountStatusTitle: document.getElementById("accountStatusTitle"),
  accountStatusDescription: document.getElementById("accountStatusDescription"),
  accountLoginState: document.getElementById("accountLoginState"),
  accountEmailDisplay: document.getElementById("accountEmailDisplay"),
  accountUidDisplay: document.getElementById("accountUidDisplay"),
  authMessage: document.getElementById("authMessage"),
  accountUpdateForm: document.getElementById("accountUpdateForm"),
  accountNewEmail: document.getElementById("accountNewEmail"),
  accountNewPassword: document.getElementById("accountNewPassword"),
  contactForm: document.getElementById("contactForm"),
  contactName: document.getElementById("contactName"),
  contactEmail: document.getElementById("contactEmail"),
  contactMessage: document.getElementById("contactMessage"),
  contactMessageStatus: document.getElementById("contactMessageStatus")
};

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initFirebaseSync();
  bindEvents();
  fillBasicForm();
  renderAll();
});

function bindEvents() {
  ["testName", "startDate", "testDate", "weekdayMinutes", "weekendMinutes"].forEach((id) => {
    elements[id].addEventListener("input", () => {
      state.basic[id] = elements[id].value;
      saveState();
      renderStats();
    });
  });

  elements.subjectForm.addEventListener("submit", addSubject);
  elements.eventForm.addEventListener("submit", addEvent);
  elements.generateButton.addEventListener("click", generatePlan);
  elements.redistributeButton.addEventListener("click", redistributeUnfinished);
  elements.resetButton.addEventListener("click", resetAll);
  elements.goInputButton.addEventListener("click", () => setActiveTab("input"));
  elements.goScheduleButton.addEventListener("click", () => setActiveTab("schedule"));
  elements.aiForm.addEventListener("submit", handleAIMessage);
  elements.assignmentImageInput.addEventListener("change", handleAssignmentImageChange);
  elements.scanAssignmentButton.addEventListener("click", scanAssignmentImageDemo);
  elements.registerForm.addEventListener("submit", registerAccount);
  elements.loginForm.addEventListener("submit", loginAccount);
  elements.googleLoginButton.addEventListener("click", loginWithGoogle);
  elements.logoutButton.addEventListener("click", logoutAccount);
  elements.accountUpdateForm.addEventListener("submit", updateAccountInfo);
  elements.contactForm.addEventListener("submit", submitContact);

  elements.aiSuggestions.forEach((button) => {
    button.addEventListener("click", () => {
      elements.aiInput.value = button.dataset.aiPrompt;
      elements.aiInput.focus();
    });
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
}

function setActiveTab(tabName) {
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.tabPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    applyStateSnapshot(parsed);
  } catch (error) {
    console.warn("保存データを読み込めませんでした。", error);
  }
}

function saveState() {
  const snapshot = createStateSnapshot();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

  if (!firebaseSync.isApplyingRemote) {
    queueFirebaseSave(snapshot);
  }
}

async function initFirebaseSync() {
  if (!window.firebase || !window.firebase.database) {
    updateFirebaseStatus("Firebase SDK未読み込み", "offline");
    return;
  }

  try {
    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);

    const appCheckReady = await initFirebaseAppCheck();
    if (!appCheckReady) {
      console.warn("App Checkに失敗しました。App Check適用中のFirebaseサービスでは接続が拒否される可能性があります。");
      updateFirebaseStatus("App Check未確認", "syncing");
    }

    firebaseSync.database = window.firebase.database(app);
    firebaseSync.enabled = true;
    updateFirebaseStatus("Firebase接続中", "syncing");

    initFirebaseAuth(app);
    connectFirebaseStateRef();
  } catch (error) {
    console.warn("Firebase初期化に失敗しました。", error);
    updateFirebaseStatus(getFirebaseErrorLabel(error, "Firebase接続失敗"), "offline");
  }
}

async function initFirebaseAppCheck() {
  if (firebaseSync.appCheckReady) return true;

  if (!window.firebase.appCheck) {
    console.warn("Firebase App Check SDKが読み込まれていません。");
    return false;
  }

  try {
    // App Checkの適用後もRealtime DatabaseやAI Logicへアクセスできるようにする。
    const appCheck = window.firebase.appCheck();
    appCheck.activate(RECAPTCHA_SITE_KEY, true);
    updateFirebaseStatus("App Check確認中", "syncing");

    if (typeof appCheck.getToken === "function") {
      await appCheck.getToken(false);
    }

    firebaseSync.appCheckReady = true;
    return true;
  } catch (error) {
    console.warn("Firebase App Checkの初期化に失敗しました。", error);
    return false;
  }
}

function initFirebaseAuth(app) {
  if (!window.firebase.auth) {
    setAuthMessage("ログイン機能の読み込みに失敗しました。しばらくしてから再読み込みしてください。", "error");
    renderAccountSettings();
    return;
  }

  firebaseSync.auth = window.firebase.auth(app);
  firebaseSync.auth.onAuthStateChanged((user) => {
    accountState.user = user || null;
    renderAccountSettings();
    connectFirebaseStateRef();
  });
}

function connectFirebaseStateRef() {
  if (!firebaseSync.database) return;

  const nextPath = getFirebaseStatePath();
  if (firebaseSync.currentPath === nextPath && firebaseSync.stateRef) return;

  if (firebaseSync.stateRef && firebaseSync.valueHandler) {
    firebaseSync.stateRef.off("value", firebaseSync.valueHandler);
  }

  firebaseSync.currentPath = nextPath;
  firebaseSync.stateRef = firebaseSync.database.ref(nextPath);
  firebaseSync.valueHandler = handleRemoteStateSnapshot;

  updateFirebaseStatus(accountState.user ? "アカウント同期中" : "端末同期中", "syncing");
  firebaseSync.stateRef.on("value", firebaseSync.valueHandler, (error) => {
    console.warn("Firebaseの読み込みに失敗しました。", error);
    updateFirebaseStatus(getFirebaseErrorLabel(error, "Firebase同期エラー"), "offline");
  });
}

function getFirebaseStatePath() {
  if (accountState.user) {
    return `tesuraku/accounts/${accountState.user.uid}/state`;
  }

  return `tesuraku/users/${getDeviceId()}/state`;
}

function handleRemoteStateSnapshot(snapshot) {
  const remoteState = snapshot.val();

  if (!remoteState) {
    queueFirebaseSave(createStateSnapshot());
    updateFirebaseStatus(accountState.user ? "アカウント同期済み" : "端末保存済み", "online");
    return;
  }

  const localUpdatedAt = getLocalUpdatedAt();
  const remoteUpdatedAt = Number(remoteState.updatedAt || 0);

  if (remoteUpdatedAt > localUpdatedAt) {
    firebaseSync.isApplyingRemote = true;
    applyStateSnapshot(remoteState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
    fillBasicForm();
    renderAll();
    firebaseSync.isApplyingRemote = false;
  } else if (localUpdatedAt > remoteUpdatedAt) {
    queueFirebaseSave(createStateSnapshot());
  }

  updateFirebaseStatus(accountState.user ? "アカウント同期済み" : "端末保存済み", "online");
}

function getFirebaseErrorLabel(error, fallback) {
  const code = String(error && error.code ? error.code : "");
  const message = String(error && error.message ? error.message : "");

  if (code.includes("permission-denied") || message.includes("Permission denied")) {
    return "Firebase権限エラー";
  }

  if (code.includes("app-check") || message.toLowerCase().includes("app check")) {
    return "App Checkエラー";
  }

  return fallback;
}

function queueFirebaseSave(snapshot) {
  if (!firebaseSync.enabled || !firebaseSync.stateRef) return;

  clearTimeout(firebaseSync.saveTimer);
  updateFirebaseStatus("Firebase保存中", "syncing");

  firebaseSync.saveTimer = setTimeout(() => {
    firebaseSync.stateRef.set(snapshot)
      .then(() => updateFirebaseStatus("Firebase同期済み", "online"))
      .catch((error) => {
        console.warn("Firebaseへの保存に失敗しました。", error);
        updateFirebaseStatus("Firebase保存失敗", "offline");
      });
  }, 350);
}

function createStateSnapshot() {
  return {
    basic: state.basic,
    subjects: state.subjects,
    events: state.events,
    plan: state.plan,
    unfinished: state.unfinished,
    aiMessages: state.aiMessages,
    scannedAssignments: state.scannedAssignments,
    updatedAt: Date.now()
  };
}

function applyStateSnapshot(snapshot) {
  state.basic = { ...state.basic, ...(snapshot.basic || {}) };
  state.subjects = Array.isArray(snapshot.subjects) ? snapshot.subjects : [];
  state.events = Array.isArray(snapshot.events) ? snapshot.events : [];
  state.plan = Array.isArray(snapshot.plan) ? snapshot.plan : [];
  state.unfinished = Array.isArray(snapshot.unfinished) ? snapshot.unfinished : [];
  state.aiMessages = Array.isArray(snapshot.aiMessages) ? snapshot.aiMessages : [];
  state.scannedAssignments = Array.isArray(snapshot.scannedAssignments) ? snapshot.scannedAssignments : [];
}

function getLocalUpdatedAt() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return Number(saved.updatedAt || 0);
  } catch (error) {
    return 0;
  }
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${createId()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function updateFirebaseStatus(text, status) {
  elements.firebaseStatus.textContent = text;
  elements.firebaseStatus.className = `firebase-status ${status}`;
}

function fillBasicForm() {
  elements.testName.value = state.basic.testName || "";
  elements.startDate.value = state.basic.startDate || "";
  elements.testDate.value = state.basic.testDate || "";
  elements.weekdayMinutes.value = state.basic.weekdayMinutes || "";
  elements.weekendMinutes.value = state.basic.weekendMinutes || "";
}

function addSubject(event) {
  event.preventDefault();

  const subject = {
    id: createId(),
    name: elements.subjectName.value.trim(),
    range: elements.subjectRange.value.trim(),
    amount: Number(elements.studyAmount.value),
    unit: elements.studyUnit.value,
    weakness: elements.weakness.value
  };

  if (!subject.name || !subject.range || !subject.amount || subject.amount <= 0) {
    alert("教科名・テスト範囲・勉強量を入力してください。");
    return;
  }

  state.subjects.push(subject);
  saveState();
  elements.subjectForm.reset();
  elements.studyUnit.value = "ページ";
  elements.weakness.value = "普通";
  renderAll();
}

function deleteSubject(id) {
  state.subjects = state.subjects.filter((subject) => subject.id !== id);
  saveState();
  renderAll();
}

function addEvent(event) {
  event.preventDefault();

  const scheduleEvent = {
    id: createId(),
    title: elements.eventTitle.value.trim(),
    date: elements.eventDate.value,
    start: elements.eventStart.value,
    end: elements.eventEnd.value,
    type: elements.eventType.value,
    note: elements.eventNote.value.trim()
  };

  if (!scheduleEvent.title || !scheduleEvent.date) {
    alert("予定名と日付を入力してください。");
    return;
  }

  state.events.push(scheduleEvent);
  state.events.sort((a, b) => `${a.date}${a.start || ""}`.localeCompare(`${b.date}${b.start || ""}`));
  saveState();
  elements.eventForm.reset();
  renderAll();
}

function deleteEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  saveState();
  renderAll();
}

function validateBeforeGenerate() {
  syncBasicFromForm();

  if (!state.basic.testName.trim()) {
    alert("テスト名を入力してください。");
    return false;
  }

  if (!state.basic.startDate || !state.basic.testDate) {
    alert("計画開始日とテスト開始日を入力してください。");
    return false;
  }

  if (!Number(state.basic.weekdayMinutes) || !Number(state.basic.weekendMinutes)) {
    alert("平日と休日の勉強時間を入力してください。");
    return false;
  }

  if (state.subjects.length === 0) {
    alert("教科を1つ以上追加してください。");
    return false;
  }

  const start = parseDate(state.basic.startDate);
  const test = parseDate(state.basic.testDate);
  if (!start || !test || start >= test) {
    alert("計画開始日はテスト開始日より前の日付にしてください。");
    return false;
  }

  return true;
}

function syncBasicFromForm() {
  state.basic.testName = elements.testName.value;
  state.basic.startDate = elements.startDate.value;
  state.basic.testDate = elements.testDate.value;
  state.basic.weekdayMinutes = elements.weekdayMinutes.value;
  state.basic.weekendMinutes = elements.weekendMinutes.value;
}

function generatePlan() {
  if (!validateBeforeGenerate()) return;

  const startDate = parseDate(state.basic.startDate);
  const testDate = parseDate(state.basic.testDate);
  const dayBeforeTest = addDays(testDate, -1);
  const twoDaysBeforeTest = addDays(testDate, -2);
  const dates = getDateRange(startDate, dayBeforeTest);

  if (dates.length === 0) {
    alert("計画できる日付がありません。日付を確認してください。");
    return;
  }

  const basePlan = dates.map((date) => ({
    id: createId(),
    date: toISODate(date),
    plannedMinutes: getMinutesForDate(date),
    status: "pending",
    items: []
  }));

  const normalCards = basePlan.filter((day) => parseDate(day.date) < twoDaysBeforeTest);
  distributeStudyTasks(normalCards);
  addReviewTasks(basePlan, dayBeforeTest, twoDaysBeforeTest);

  state.plan = basePlan;
  state.unfinished = [];
  saveState();
  renderAll();
  setActiveTab("schedule");
}

function distributeStudyTasks(normalCards) {
  if (normalCards.length === 0) return;

  // 苦手度の重みを使って、苦手な教科ほど計画に出る回数を多くする。
  const totalWeightedAmount = state.subjects.reduce((sum, subject) => {
    return sum + subject.amount * weightMap[subject.weakness];
  }, 0);
  const slotsPerDay = Math.min(3, state.subjects.length);
  const totalSlots = Math.max(normalCards.length * slotsPerDay, state.subjects.length);

  state.subjects.forEach((subject) => {
    const weightedAmount = subject.amount * weightMap[subject.weakness];
    const slotCount = Math.max(1, Math.round((weightedAmount / totalWeightedAmount) * totalSlots));
    const tasks = createSubjectTasks(subject, slotCount);

    tasks.forEach((task, index) => {
      const dayIndex = Math.min(
        normalCards.length - 1,
        Math.floor((index * normalCards.length) / tasks.length)
      );
      normalCards[dayIndex].items.push(task);
    });
  });

  normalCards.forEach((day) => {
    if (day.items.length === 0) {
      day.items.push({ subjectName: "調整日", text: "暗記・ノート整理・前回の続き" });
    }
  });
}

function createSubjectTasks(subject, slotCount) {
  const tasks = [];
  const amount = Math.max(1, Math.round(subject.amount));
  const actualSlotCount = Math.min(slotCount, amount);
  const baseAmount = Math.floor(amount / actualSlotCount);
  const extra = amount % actualSlotCount;
  const pageInfo = parsePageRange(subject.range);
  let cursor = 1;

  // 勉強量を小さなかたまりに分けて、複数日に配りやすくする。
  for (let i = 0; i < actualSlotCount; i += 1) {
    const chunkAmount = baseAmount + (i < extra ? 1 : 0);
    const from = cursor;
    const to = cursor + chunkAmount - 1;
    cursor += chunkAmount;

    tasks.push({
      subjectName: subject.name,
      text: `${subject.name}：${formatTaskText(subject, from, to, pageInfo)}`
    });
  }

  return tasks;
}

function formatTaskText(subject, from, to, pageInfo) {
  // 「ワークP10〜P45」のような範囲は、日ごとのページ範囲に変換して表示する。
  if (subject.unit === "ページ" && pageInfo) {
    const startPage = pageInfo.start + from - 1;
    const endPage = pageInfo.start + to - 1;
    const label = pageInfo.prefix ? `${pageInfo.prefix}P` : "P";
    return `${label}${startPage}〜P${endPage}程度`;
  }

  if (from === to) {
    return `範囲「${subject.range}」の${from}${subject.unit}目程度`;
  }

  return `範囲「${subject.range}」の${from}〜${to}${subject.unit}程度`;
}

function parsePageRange(rangeText) {
  const match = rangeText.match(/^(.*?)(?:P|p)?\s*(\d+)\s*[〜~\-ー－]\s*(?:P|p)?\s*(\d+)/);
  if (!match) return null;

  const start = Number(match[2]);
  const end = Number(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  return {
    prefix: match[1].trim(),
    start,
    end
  };
}

function addReviewTasks(plan, dayBeforeTest, twoDaysBeforeTest) {
  const names = state.subjects.map((subject) => subject.name).join("・");

  // テスト2日前と前日は新しい範囲を進めず、復習中心の内容にする。
  plan.forEach((day) => {
    const date = parseDate(day.date);
    if (isSameDate(date, twoDaysBeforeTest) && !isSameDate(twoDaysBeforeTest, dayBeforeTest)) {
      day.items = [
        { subjectName: "復習", text: `復習中心：${names}の間違えた問題・暗記・不安な範囲を確認` }
      ];
    }

    if (isSameDate(date, dayBeforeTest)) {
      day.items = [
        { subjectName: "最終確認", text: "全教科の最終確認・暗記・間違えた問題の復習" }
      ];
    }
  });
}

function markComplete(planId) {
  const target = state.plan.find((day) => day.id === planId);
  if (!target) return;

  target.status = "done";
  state.unfinished = state.unfinished.filter((item) => item.planId !== planId);
  saveState();
  renderAll();
}

function markUnfinished(planId) {
  const target = state.plan.find((day) => day.id === planId);
  if (!target || target.status === "done") return;

  const exists = state.unfinished.some((item) => item.planId === planId);
  if (!exists) {
    state.unfinished.push({
      id: createId(),
      planId,
      date: target.date,
      plannedMinutes: target.plannedMinutes,
      items: target.items.map((item) => item.text)
    });
  }

  target.status = "missed";
  saveState();
  renderAll();
}

function redistributeUnfinished() {
  if (state.unfinished.length === 0) {
    alert("再配分する未完了の予定がありません。");
    return;
  }

  if (state.plan.length === 0 || !state.basic.testDate) {
    alert("先に計画を作成してください。");
    return;
  }

  const today = startOfToday();
  const dayBeforeTest = addDays(parseDate(state.basic.testDate), -1);

  // 完了済みの日とテスト前日は変更しない。
  const targets = state.plan.filter((day) => {
    const date = parseDate(day.date);
    return date >= today && date < dayBeforeTest && day.status !== "done";
  });

  if (targets.length === 0) {
    alert("今日以降で再配分できる日がありません。");
    return;
  }

  const tasks = state.unfinished.flatMap((entry) => {
    return entry.items.map((text) => ({
      subjectName: "再配分",
      text: `再配分：${text}`
    }));
  });

  tasks.forEach((task, index) => {
    targets[index % targets.length].items.push(task);
  });

  targets.forEach((day) => {
    if (day.status === "missed") day.status = "pending";
  });

  state.unfinished = [];
  saveState();
  renderAll();
}

function resetAll() {
  const ok = confirm("すべての入力内容と計画を削除します。よろしいですか？");
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  state.basic = {
    testName: "",
    startDate: "",
    testDate: "",
    weekdayMinutes: "",
    weekendMinutes: ""
  };
  state.subjects = [];
  state.events = [];
  state.plan = [];
  state.unfinished = [];
  state.aiMessages = [];
  state.scannedAssignments = [];
  elements.basicForm.reset();
  elements.subjectForm.reset();
  elements.eventForm.reset();
  elements.aiForm.reset();
  elements.assignmentImageInput.value = "";

  if (firebaseSync.enabled && firebaseSync.stateRef) {
    firebaseSync.stateRef.remove()
      .then(() => updateFirebaseStatus("Firebaseデータ削除済み", "online"))
      .catch((error) => {
        console.warn("Firebaseデータの削除に失敗しました。", error);
        updateFirebaseStatus("Firebase削除失敗", "offline");
      });
  }

  renderAll();
}

function renderAll() {
  renderSubjects();
  renderEvents();
  renderScannedAssignments();
  renderPlan();
  renderUnfinished();
  renderStats();
  renderDashboardNext();
  renderAIChat();
  renderAccountSettings();
}

function renderDashboardNext() {
  elements.dashboardNextTitle.textContent = "次の予定";
  elements.dashboardNextMeta.textContent = "入力タブで計画を作成してください。";
  elements.dashboardNextItems.innerHTML = '<p class="empty-message">まだ予定がありません。</p>';

  const today = startOfToday();
  const nextEvent = state.events.find((event) => {
    const date = parseDate(event.date);
    return date && date >= today;
  });

  if (state.plan.length === 0) {
    if (nextEvent) {
      elements.dashboardNextTitle.textContent = "次の予定";
      elements.dashboardNextMeta.textContent = formatEventDate(nextEvent);
      elements.dashboardNextItems.innerHTML = `
        <ul>
          <li>${escapeHTML(nextEvent.type)}：${escapeHTML(nextEvent.title)}</li>
          ${nextEvent.note ? `<li>${escapeHTML(nextEvent.note)}</li>` : ""}
        </ul>
      `;
    }
    return;
  }

  const nextPlan = state.plan.find((day) => {
    const date = parseDate(day.date);
    return date >= today && day.status !== "done";
  }) || state.plan.find((day) => day.status !== "done");

  if (!nextPlan) {
    elements.dashboardNextTitle.textContent = "すべて完了";
    elements.dashboardNextMeta.textContent = "計画内の予定は完了しています。";
    return;
  }

  const date = parseDate(nextPlan.date);
  const dayEvents = getEventsForDate(nextPlan.date);
  elements.dashboardNextTitle.textContent = isSameDate(date, today) ? "今日の予定" : "次の予定";
  elements.dashboardNextMeta.textContent = `${formatDateShort(date)} ${getWeekday(date)} / 予定 ${nextPlan.plannedMinutes}分`;

  const items = nextPlan.items.length > 0
    ? nextPlan.items.map((item) => `<li>${escapeHTML(item.text)}</li>`).join("")
    : "<li>暗記・ノート整理・前回の続き</li>";
  const eventItems = dayEvents.map((event) => {
    return `<li>予定：${escapeHTML(event.title)}${event.start ? ` ${escapeHTML(formatEventTime(event))}` : ""}</li>`;
  }).join("");
  elements.dashboardNextItems.innerHTML = `<ul>${eventItems}${items}</ul>`;
}

function renderSubjects() {
  elements.subjectList.innerHTML = "";

  if (state.subjects.length === 0) {
    elements.subjectList.innerHTML = '<p class="empty-message">まだ教科が追加されていません。</p>';
    return;
  }

  state.subjects.forEach((subject) => {
    const card = document.createElement("article");
    card.className = "subject-card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${escapeHTML(subject.name)}</h3>
          <span class="badge">${escapeHTML(subject.weakness)}</span>
        </div>
        <button class="button danger-button small-button" type="button">削除</button>
      </div>
      <p class="subject-meta">${escapeHTML(subject.range)}</p>
      <p class="subject-meta">${escapeHTML(String(subject.amount))}${escapeHTML(subject.unit)}</p>
    `;

    card.querySelector("button").addEventListener("click", () => deleteSubject(subject.id));
    elements.subjectList.appendChild(card);
  });
}

function renderEvents() {
  elements.eventList.innerHTML = "";

  if (state.events.length === 0) {
    elements.eventList.innerHTML = '<p class="empty-message">まだ部活や予定は追加されていません。</p>';
    return;
  }

  state.events.forEach((event) => {
    const item = document.createElement("article");
    item.className = "event-card";
    item.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${escapeHTML(event.title)}</h3>
          <span class="badge">${escapeHTML(event.type)}</span>
        </div>
        <button class="button danger-button small-button" type="button">削除</button>
      </div>
      <p class="event-meta">${escapeHTML(formatEventDate(event))}</p>
      ${event.note ? `<p class="event-note">${escapeHTML(event.note)}</p>` : ""}
    `;

    item.querySelector("button").addEventListener("click", () => deleteEvent(event.id));
    elements.eventList.appendChild(item);
  });
}

function getEventsForDate(dateKey) {
  return state.events.filter((event) => event.date === dateKey);
}

function formatEventDate(event) {
  const date = parseDate(event.date);
  const dateText = date ? `${formatDateShort(date)} ${getWeekday(date)}` : event.date;
  return `${dateText} / ${formatEventTime(event)}`;
}

function formatEventTime(event) {
  if (event.start && event.end) return `${event.start}〜${event.end}`;
  if (event.start) return `${event.start}〜`;
  if (event.end) return `〜${event.end}`;
  return "時間未定";
}

function createPlanEventsHTML(events) {
  if (events.length === 0) return "";

  const items = events.map((event) => {
    const note = event.note ? ` / ${escapeHTML(event.note)}` : "";
    return `<li><strong>${escapeHTML(event.type)}</strong>：${escapeHTML(event.title)} ${escapeHTML(formatEventTime(event))}${note}</li>`;
  }).join("");

  return `
    <div class="plan-events">
      <span class="plan-events-title">この日の予定</span>
      <ul>${items}</ul>
    </div>
  `;
}

function createEventOnlyCardHTML(date, events) {
  return `
    <article class="plan-card today event-only-card">
      <div class="plan-head">
        <div>
          <h3>${formatDateShort(date)}</h3>
          <div class="date-line">${getWeekday(date)}</div>
        </div>
        <div class="time-line">予定あり</div>
      </div>
      ${createPlanEventsHTML(events)}
    </article>
  `;
}

function handleAssignmentImageChange() {
  const file = elements.assignmentImageInput.files[0];
  if (!file) {
    elements.assignmentPreview.hidden = true;
    elements.assignmentPreview.removeAttribute("src");
    elements.assignmentPreviewEmpty.hidden = false;
    return;
  }

  elements.assignmentPreview.src = URL.createObjectURL(file);
  elements.assignmentPreview.hidden = false;
  elements.assignmentPreviewEmpty.hidden = true;
}

async function scanAssignmentImageDemo() {
  const file = elements.assignmentImageInput.files[0];
  if (!file) {
    alert("課題表の画像を選択してください。");
    return;
  }

  const originalText = elements.scanAssignmentButton.textContent;
  elements.scanAssignmentButton.disabled = true;
  elements.scanAssignmentButton.textContent = "読み取り中...";
  elements.scanResultList.innerHTML = '<p class="empty-message">Geminiで画像を読み取っています。</p>';
  let scanErrorMessage = "";

  try {
    const gemini = await waitForGeminiModule();
    if (gemini && typeof gemini.scanAssignmentsFromImage === "function") {
      const assignments = await gemini.scanAssignmentsFromImage(file);
      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new Error("課題候補を読み取れませんでした。");
      }

      state.scannedAssignments = assignments.map((assignment) => {
        return createScannedAssignment(
          assignment.subjectName,
          assignment.range,
          assignment.amount,
          assignment.unit,
          assignment.weakness
        );
      });
    } else {
      state.scannedAssignments = createDemoAssignmentsFromImageName(file.name);
    }
  } catch (error) {
    console.warn("Geminiでの課題読み取りに失敗しました。", error);
    state.scannedAssignments = [];
    scanErrorMessage = "Geminiでの読み取りに失敗しました。混み合っている可能性があるので、少し待ってもう一度試してください。";
  } finally {
    elements.scanAssignmentButton.disabled = false;
    elements.scanAssignmentButton.textContent = originalText;
  }

  saveState();
  if (scanErrorMessage) {
    elements.scanResultList.innerHTML = `<p class="empty-message">${scanErrorMessage}</p>`;
    return;
  }

  renderScannedAssignments();
}

function createDemoAssignmentsFromImageName(fileName) {
  const lowerName = fileName.toLowerCase();
  const candidates = [];

  if (includesAny(lowerName, ["math", "数学", "sugaku"])) {
    candidates.push(createScannedAssignment("数学", "画像内の数学課題", 12, "問", "普通"));
  }

  if (includesAny(lowerName, ["english", "英語", "eigo"])) {
    candidates.push(createScannedAssignment("英語", "画像内の英語課題", 30, "個", "普通"));
  }

  if (includesAny(lowerName, ["science", "理科", "rika"])) {
    candidates.push(createScannedAssignment("理科", "画像内の理科課題", 2, "章", "普通"));
  }

  if (includesAny(lowerName, ["social", "社会", "shakai"])) {
    candidates.push(createScannedAssignment("社会", "画像内の社会課題", 8, "ページ", "普通"));
  }

  if (candidates.length > 0) return candidates;

  return [
    createScannedAssignment("数学", "課題表から読み取り候補：ワーク", 10, "問", "普通"),
    createScannedAssignment("英語", "課題表から読み取り候補：単語・本文", 20, "個", "普通"),
    createScannedAssignment("理科", "課題表から読み取り候補：暗記範囲", 1, "章", "普通")
  ];
}

function createScannedAssignment(subjectName, range, amount, unit, weakness) {
  return {
    id: createId(),
    subjectName,
    range,
    amount,
    unit,
    weakness
  };
}

function renderScannedAssignments() {
  elements.scanResultList.innerHTML = "";

  if (state.scannedAssignments.length === 0) {
    elements.scanResultList.innerHTML = '<p class="empty-message">読み取り結果はまだありません。</p>';
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "scan-result-toolbar";
  toolbar.innerHTML = `
    <p>${state.scannedAssignments.length}件の候補があります。</p>
    <button class="button primary-button small-button" type="button">全て教科に追加</button>
  `;
  toolbar.querySelector("button").addEventListener("click", addAllScannedAssignmentsToSubjects);
  elements.scanResultList.appendChild(toolbar);

  state.scannedAssignments.forEach((assignment) => {
    const card = document.createElement("article");
    card.className = "scan-result-card";
    card.innerHTML = `
      <div>
        <h3>${escapeHTML(assignment.subjectName)}</h3>
        <p class="event-meta">${escapeHTML(assignment.range)} / ${assignment.amount}${escapeHTML(assignment.unit)}</p>
      </div>
      <button class="button secondary-button small-button" type="button">教科に追加</button>
    `;

    card.querySelector("button").addEventListener("click", () => addScannedAssignmentToSubjects(assignment.id));
    elements.scanResultList.appendChild(card);
  });
}

function addScannedAssignmentToSubjects(id) {
  const assignment = state.scannedAssignments.find((item) => item.id === id);
  if (!assignment) return;

  state.subjects.push({
    id: createId(),
    name: assignment.subjectName,
    range: assignment.range,
    amount: Number(assignment.amount),
    unit: assignment.unit,
    weakness: assignment.weakness
  });

  state.scannedAssignments = state.scannedAssignments.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function addAllScannedAssignmentsToSubjects() {
  if (state.scannedAssignments.length === 0) return;

  state.scannedAssignments.forEach((assignment) => {
    state.subjects.push({
      id: createId(),
      name: assignment.subjectName,
      range: assignment.range,
      amount: Number(assignment.amount),
      unit: assignment.unit,
      weakness: assignment.weakness
    });
  });

  state.scannedAssignments = [];
  saveState();
  renderAll();
}

function renderPlan() {
  elements.todayTodoList.innerHTML = "";
  elements.calendarList.innerHTML = "";
  elements.planName.textContent = state.basic.testName ? state.basic.testName : "";
  elements.calendarTitle.textContent = "";

  if (state.plan.length === 0 && state.events.length === 0) {
    elements.todayTodoList.innerHTML = '<p class="empty-message">入力（+）タブで基本情報と教科を入力して、計画を作成してください。</p>';
    elements.calendarList.innerHTML = '<p class="empty-message">計画を作成すると、ここにカレンダー形式で表示されます。</p>';
    return;
  }

  const today = startOfToday();
  renderTodayTodo(today);
  renderCalendarSchedule(today);
}

function renderTodayTodo(today) {
  const todayPlan = state.plan.find((day) => isSameDate(parseDate(day.date), today));
  const todayEvents = getEventsForDate(toISODate(today));

  if (!todayPlan) {
    if (todayEvents.length > 0) {
      elements.todayTodoList.innerHTML = createEventOnlyCardHTML(today, todayEvents);
      return;
    }

    elements.todayTodoList.innerHTML = '<p class="empty-message">今日の予定はありません。</p>';
    return;
  }

  elements.todayTodoList.appendChild(createPlanCard(todayPlan, today, false));
}

function renderCalendarSchedule(today) {
  const planByDate = new Map(state.plan.map((day) => [day.date, day]));
  const months = getMonthsInPlan();
  elements.calendarTitle.textContent = `${months.length}か月分`;

  months.forEach((monthDate) => {
    const monthSection = document.createElement("section");
    monthSection.className = "calendar-month";

    const monthHeading = document.createElement("h3");
    monthHeading.className = "calendar-month-title";
    monthHeading.textContent = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;

    const scrollArea = document.createElement("div");
    scrollArea.className = "calendar-scroll";

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    ["日", "月", "火", "水", "木", "金", "土"].forEach((weekday) => {
      const label = document.createElement("div");
      label.className = "calendar-weekday";
      label.textContent = weekday;
      grid.appendChild(label);
    });

    createCalendarCells(monthDate, planByDate, today).forEach((cell) => grid.appendChild(cell));
    scrollArea.appendChild(grid);
    monthSection.append(monthHeading, scrollArea);
    elements.calendarList.appendChild(monthSection);
  });
}

function createPlanCard(day, today, compact) {
  const date = parseDate(day.date);
  const dayEvents = getEventsForDate(day.date);
  const card = document.createElement("article");
  card.className = [
    "plan-card",
    compact ? "compact-plan-card" : "",
    isSameDate(date, today) ? "today" : "",
    day.status === "done" ? "done" : ""
  ].filter(Boolean).join(" ");

  const items = day.items.length > 0
    ? day.items.map((item) => `<li>${escapeHTML(item.text)}</li>`).join("")
    : "<li>暗記・ノート整理・前回の続き</li>";
  const eventBlock = createPlanEventsHTML(dayEvents);

  card.innerHTML = `
    <div class="plan-head">
      <div>
        <h3>${formatDateShort(date)} <span class="done-mark">✓ 完了</span></h3>
        <div class="date-line">${getWeekday(date)}</div>
      </div>
      <div class="time-line">予定 ${day.plannedMinutes}分</div>
    </div>
    ${eventBlock}
    <ul class="study-items">${items}</ul>
    <div class="plan-actions">
      <button class="button complete-button small-button" type="button">完了</button>
      <button class="button missed-button small-button" type="button">できなかった</button>
    </div>
  `;

  const [completeButton, missedButton] = card.querySelectorAll("button");
  completeButton.addEventListener("click", () => markComplete(day.id));
  missedButton.addEventListener("click", () => markUnfinished(day.id));
  return card;
}

function getMonthsInPlan() {
  const monthKeys = new Set([
    ...state.plan.map((day) => day.date.slice(0, 7)),
    ...state.events.map((event) => event.date.slice(0, 7))
  ].filter(Boolean));
  return Array.from(monthKeys).sort().map((key) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
}

function createCalendarCells(monthDate, planByDate, today) {
  const cells = [];
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell blank";
    cells.push(blank);
  }

  for (let dateNumber = 1; dateNumber <= lastDay.getDate(); dateNumber += 1) {
    const date = new Date(year, month, dateNumber);
    const isoDate = toISODate(date);
    const day = planByDate.get(isoDate);
    const dayEvents = getEventsForDate(isoDate);
    const cell = document.createElement("article");
    cell.className = [
      "calendar-cell",
      day ? "has-plan" : "",
      dayEvents.length > 0 ? "has-event" : "",
      day && day.status === "done" ? "done" : "",
      day && day.status === "missed" ? "missed" : "",
      isSameDate(date, today) ? "today" : ""
    ].filter(Boolean).join(" ");

    cell.innerHTML = createCalendarCellHTML(date, day, dayEvents);

    if (day) {
      const [completeButton, missedButton] = cell.querySelectorAll("button");
      completeButton.addEventListener("click", () => markComplete(day.id));
      missedButton.addEventListener("click", () => markUnfinished(day.id));
    }

    cells.push(cell);
  }

  return cells;
}

function createCalendarCellHTML(date, day, dayEvents) {
  const eventItems = dayEvents.map((event) => {
    return `<li>${escapeHTML(shortenText(event.title, 18))}${event.start ? ` ${escapeHTML(event.start)}` : ""}</li>`;
  }).join("");
  const eventBlock = eventItems ? `<ul class="calendar-events">${eventItems}</ul>` : "";

  if (!day) {
    return `
      <div class="calendar-cell-head">
        <span class="calendar-date">${date.getDate()}</span>
      </div>
      ${eventBlock}
    `;
  }

  const previewItems = day.items.slice(0, 2).map((item) => {
    return `<li>${escapeHTML(shortenText(item.text, 34))}</li>`;
  }).join("");
  const remaining = day.items.length > 2 ? `<li>ほか${day.items.length - 2}件</li>` : "";
  const statusLabel = day.status === "done" ? "完了" : day.status === "missed" ? "未完了" : "";

  return `
    <div class="calendar-cell-head">
      <span class="calendar-date">${date.getDate()}</span>
      <span class="calendar-time">${day.plannedMinutes}分</span>
    </div>
    ${statusLabel ? `<div class="calendar-status">${statusLabel}</div>` : ""}
    ${eventBlock}
    <ul class="calendar-items">${previewItems}${remaining}</ul>
    <div class="calendar-actions">
      <button class="calendar-action complete" type="button" aria-label="${formatDateShort(date)}を完了">完了</button>
      <button class="calendar-action missed" type="button" aria-label="${formatDateShort(date)}を未完了にする">未</button>
    </div>
  `;
}

function shortenText(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function renderUnfinished() {
  elements.unfinishedList.innerHTML = "";
  elements.unfinishedCount.textContent = `${state.unfinished.length}件`;

  if (state.unfinished.length === 0) {
    elements.unfinishedList.innerHTML = '<p class="empty-message">未完了の予定はありません。</p>';
    return;
  }

  state.unfinished.forEach((entry) => {
    const date = parseDate(entry.date);
    const item = document.createElement("article");
    item.className = "unfinished-item";
    item.innerHTML = `
      <strong>${formatDateShort(date)} ${getWeekday(date)}</strong>
      <ul>${entry.items.map((text) => `<li>${escapeHTML(text)}</li>`).join("")}</ul>
    `;
    elements.unfinishedList.appendChild(item);
  });
}

function renderStats() {
  elements.subjectCount.textContent = `${state.subjects.length}教科`;
  elements.daysLeft.textContent = getDaysLeftText();

  const total = state.plan.length;
  const done = state.plan.filter((day) => day.status === "done").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  elements.progressText.textContent = `${progress}%`;
  elements.progressBar.style.width = `${progress}%`;
}

async function handleAIMessage(event) {
  event.preventDefault();

  const text = elements.aiInput.value.trim();
  if (!text) {
    alert("AIに聞きたいことを入力してください。");
    return;
  }

  state.aiMessages.push({
    role: "user",
    text
  });

  const assistantMessage = {
    role: "assistant",
    text: "Geminiに聞いています..."
  };
  state.aiMessages.push(assistantMessage);

  elements.aiInput.value = "";
  saveState();
  renderAIChat();

  try {
    assistantMessage.text = await requestGeminiAIReply(text);
  } catch (error) {
    console.warn("Gemini AI応答に失敗しました。デモ応答に切り替えます。", error);
    assistantMessage.text = `${createDemoAIReply(text)}\n\n※Gemini接続に失敗したため、デモ応答を表示しています。`;
  }

  saveState();
  renderAIChat();
}

async function requestGeminiAIReply(message) {
  const gemini = await waitForGeminiModule();
  if (!gemini || typeof gemini.generateStudyReply !== "function") {
    throw new Error("Geminiモジュールがまだ読み込まれていません。");
  }

  return gemini.generateStudyReply(message, createGeminiContext());
}

function waitForGeminiModule(timeoutMs = 6000) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      if (window.tesnaviGemini) {
        resolve(window.tesnaviGemini);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(null);
        return;
      }

      setTimeout(check, 120);
    };

    check();
  });
}

function createGeminiContext() {
  const todayPlan = getTodayPlan();
  const today = startOfToday();
  const upcomingEvents = state.events.filter((event) => {
    const date = parseDate(event.date);
    return date && date >= today;
  }).slice(0, 8);

  return {
    today: toISODate(today),
    test: state.basic,
    subjects: state.subjects,
    todayPlan,
    unfinished: state.unfinished,
    upcomingEvents,
    progress: {
      totalDays: state.plan.length,
      doneDays: state.plan.filter((day) => day.status === "done").length
    }
  };
}

function renderAIChat() {
  elements.aiMessages.innerHTML = "";

  const messages = state.aiMessages.length > 0
    ? state.aiMessages
    : [{
      role: "assistant",
      text: "こんにちは。テスナビのAIです。\n勉強でわからないところ、計画の相談、ちょっと疲れたときの雑談まで、気軽に話してください。Geminiで返答します。"
    }];

  messages.forEach((message) => {
    const item = document.createElement("article");
    item.className = `ai-message ${message.role}`;
    item.innerHTML = `
      <span class="ai-message-role">${message.role === "user" ? "あなた" : "テスラクAI"}</span>
      <p class="ai-message-text">${escapeHTML(message.text)}</p>
    `;
    elements.aiMessages.appendChild(item);
  });

  elements.aiMessages.scrollTop = elements.aiMessages.scrollHeight;
}

async function registerAccount(event) {
  event.preventDefault();

  const email = elements.registerEmail.value.trim();
  const password = elements.registerPassword.value;
  const confirm = elements.registerPasswordConfirm.value;

  if (!email || !password || !confirm) {
    setAuthMessage("メールアドレスとパスワードを入力してください。", "error");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("パスワードは6文字以上にしてください。", "error");
    return;
  }

  if (password !== confirm) {
    setAuthMessage("パスワード確認が一致していません。", "error");
    return;
  }

  try {
    const auth = getFirebaseAuth();
    await auth.createUserWithEmailAndPassword(email, password);
    elements.registerForm.reset();
    setAuthMessage("登録しました。これからはアカウントにデータを同期します。", "success");
  } catch (error) {
    console.warn("新規登録に失敗しました。", error);
    setAuthMessage(getAuthErrorMessage(error), "error");
  }
}

async function loginAccount(event) {
  event.preventDefault();

  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    setAuthMessage("メールアドレスとパスワードを入力してください。", "error");
    return;
  }

  try {
    const auth = getFirebaseAuth();
    await auth.signInWithEmailAndPassword(email, password);
    elements.loginForm.reset();
    setAuthMessage("ログインしました。アカウントのデータと同期します。", "success");
  } catch (error) {
    console.warn("ログインに失敗しました。", error);
    setAuthMessage(getAuthErrorMessage(error), "error");
  }
}

async function loginWithGoogle() {
  try {
    const auth = getFirebaseAuth();
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    await auth.signInWithPopup(provider);
    setAuthMessage("Googleアカウントでログインしました。アカウントのデータと同期します。", "success");
  } catch (error) {
    console.warn("Googleログインに失敗しました。", error);
    setAuthMessage(getAuthErrorMessage(error), "error");
  }
}

async function logoutAccount() {
  try {
    const auth = getFirebaseAuth();
    await auth.signOut();
    setAuthMessage("ログアウトしました。この端末内保存に戻ります。", "success");
  } catch (error) {
    console.warn("ログアウトに失敗しました。", error);
    setAuthMessage(getAuthErrorMessage(error), "error");
  }
}

async function updateAccountInfo(event) {
  event.preventDefault();

  const user = accountState.user;
  if (!user) {
    setAuthMessage("ログイン情報を変更するには、先にログインしてください。", "error");
    return;
  }

  const nextEmail = elements.accountNewEmail.value.trim();
  const nextPassword = elements.accountNewPassword.value;

  if (!nextEmail && !nextPassword) {
    setAuthMessage("変更したいメールアドレスかパスワードを入力してください。", "error");
    return;
  }

  try {
    if (nextEmail && nextEmail !== user.email) {
      await user.updateEmail(nextEmail);
    }

    if (nextPassword) {
      if (nextPassword.length < 6) {
        setAuthMessage("新しいパスワードは6文字以上にしてください。", "error");
        return;
      }
      await user.updatePassword(nextPassword);
    }

    await user.reload();
    accountState.user = getFirebaseAuth().currentUser;
    elements.accountUpdateForm.reset();
    renderAccountSettings();
    setAuthMessage("ログイン情報を更新しました。", "success");
  } catch (error) {
    console.warn("ログイン情報の更新に失敗しました。", error);
    setAuthMessage(getAuthErrorMessage(error), "error");
  }
}

async function submitContact(event) {
  event.preventDefault();

  const message = elements.contactMessage.value.trim();
  if (!message) {
    setContactMessage("お問い合わせ内容を入力してください。", "error");
    return;
  }

  const inquiry = {
    id: createId(),
    name: elements.contactName.value.trim(),
    email: elements.contactEmail.value.trim(),
    message,
    userId: accountState.user ? accountState.user.uid : "",
    createdAt: Date.now()
  };

  try {
    if (!firebaseSync.database) {
      throw new Error("Firebase Database is not ready.");
    }

    await firebaseSync.database.ref(`tesuraku/inquiries/${inquiry.id}`).set(inquiry);
    elements.contactForm.reset();
    setContactMessage("お問い合わせを送信しました。", "success");
  } catch (error) {
    console.warn("お問い合わせの送信に失敗しました。端末内に控えを保存します。", error);
    saveContactDraft(inquiry);
    elements.contactForm.reset();
    setContactMessage("送信できなかったため、この端末に控えを保存しました。", "error");
  }
}

function getFirebaseAuth() {
  if (!firebaseSync.auth) {
    throw new Error("ログイン機能の準備ができていません。");
  }

  return firebaseSync.auth;
}

function renderAccountSettings() {
  const user = accountState.user;
  const isLoggedIn = Boolean(user);
  const email = user && user.email ? user.email : "未登録";
  const uid = user && user.uid ? user.uid : "未登録";

  elements.accountStatusBadge.textContent = isLoggedIn ? "ログイン中" : "未ログイン";
  elements.accountStatusTitle.textContent = isLoggedIn ? "アカウント同期で利用中" : "端末内保存で利用中";
  elements.accountStatusDescription.textContent = isLoggedIn
    ? "このアカウントでログインすれば、別の端末からも同じデータにアクセスできます。"
    : "この端末には保存されますが、別の端末からは同じデータにアクセスできません。";
  elements.logoutButton.hidden = !isLoggedIn;
  elements.accountLoginState.textContent = isLoggedIn ? "ログイン中" : "未ログイン";
  elements.accountEmailDisplay.textContent = email;
  elements.accountUidDisplay.textContent = uid;
}

function setAuthMessage(message, type) {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `settings-message ${type || ""}`.trim();
}

function setContactMessage(message, type) {
  elements.contactMessageStatus.textContent = message;
  elements.contactMessageStatus.className = `settings-message ${type || ""}`.trim();
}

function saveContactDraft(inquiry) {
  const saved = localStorage.getItem(CONTACT_DRAFTS_KEY);
  let drafts = [];

  try {
    drafts = saved ? JSON.parse(saved) : [];
  } catch (error) {
    drafts = [];
  }

  drafts.push(inquiry);
  localStorage.setItem(CONTACT_DRAFTS_KEY, JSON.stringify(drafts.slice(-20)));
}

function getAuthErrorMessage(error) {
  const code = String(error && error.code ? error.code : "");
  const message = String(error && error.message ? error.message : "");

  if (code.includes("email-already-in-use")) return "このメールアドレスはすでに登録されています。";
  if (code.includes("invalid-email")) return "メールアドレスの形式を確認してください。";
  if (code.includes("weak-password")) return "パスワードは6文字以上にしてください。";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "メールアドレスまたはパスワードが違います。";
  if (code.includes("user-not-found")) return "このメールアドレスのアカウントが見つかりません。";
  if (code.includes("requires-recent-login")) return "安全のため、もう一度ログインしてから変更してください。";
  if (code.includes("popup-closed-by-user")) return "Googleログイン画面が閉じられました。もう一度試してください。";
  if (code.includes("popup-blocked")) return "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。";
  if (code.includes("account-exists-with-different-credential")) return "同じメールアドレスの別ログイン方法がすでに登録されています。先にその方法でログインしてください。";
  if (code.includes("operation-not-allowed")) return "Firebase Consoleでメール/パスワードまたはGoogleログインを有効にしてください。";
  if (message) return message;
  return "処理に失敗しました。時間をおいてもう一度試してください。";
}

function createDemoAIReply(message) {
  const text = message.toLowerCase();
  const todayPlan = getTodayPlan();
  const subjectNames = state.subjects.map((subject) => subject.name).join("・");

  // 将来Gemini APIを使う場合は、この関数の中身をAPI呼び出しに差し替える。
  if (includesAny(text, ["数学", "計算", "方程式", "関数", "証明"])) {
    return "数学で止まったときは、まず「どこまでわかっているか」を分けるのが近道です。\n1. 問題文の条件に線を引く\n2. 使えそうな公式や解き方を1つだけ書く\n3. 途中式を省略せずに書く\n4. 答え合わせ後、間違えた行に印をつける\n\n問題文をそのまま送ってくれたら、デモ版として解き方の考え方を一緒に整理します。";
  }

  if (includesAny(text, ["英語", "単語", "英文", "文法", "リスニング"])) {
    return "英語は短く何回も触れるのが強いです。\n単語なら「見る → 隠して言う → 書く → 例文で使う」の順がおすすめです。文法なら、まず日本語訳よりも主語と動詞を見つけてみてください。\n\n今日なら10分だけ単語、次の10分で間違えた文法を1つ復習、くらいの小分けが続きやすいです。";
  }

  if (includesAny(text, ["理科", "社会", "暗記", "覚え", "用語"])) {
    return "暗記は、読むだけより「思い出す練習」が効きます。\nおすすめは、ノートを閉じて3つだけ言えるか試す方法です。言えなかった用語だけカード化すると、量が増えすぎません。\n\n今日やるなら、範囲を広げすぎず「用語10個 → すぐ小テスト → 間違いだけ再チェック」でいきましょう。";
  }

  if (includesAny(text, ["計画", "予定", "何すれば", "今日", "勉強時間"])) {
    if (todayPlan) {
      const items = todayPlan.items.map((item) => `・${item.text}`).join("\n");
      return `今日の計画は ${todayPlan.plannedMinutes}分 です。\n${items}\n\n最初の5分は準備時間にして、1つ目の予定だけ始めてみましょう。全部やる気を出してから始めるより、始めてから気分が乗ることの方が多いです。`;
    }

    return subjectNames
      ? `登録されている教科は ${subjectNames} ですね。まだ今日の予定がないので、入力タブで計画を作ると、ここで「今日何をするか」も一緒に相談できます。`
      : "まずは入力タブでテスト日と教科を入れてみましょう。計画ができたら、今日やることを一緒に整理できます。";
  }

  if (includesAny(text, ["やる気", "疲れ", "つらい", "眠い", "しんどい", "雑談", "不安"])) {
    return "話してくれてありがとう。勉強って、内容より先に気持ちが重くなる日もあります。\n今日は完璧を狙わず「机に座る」「1問だけ解く」「単語を5個だけ見る」でも十分前進です。\n\n今の気分を10点満点で言うなら何点くらいですか？そこに合わせて、今日の軽めプランを一緒に作れます。";
  }

  if (includesAny(text, ["gemini", "api", "ai連携", "実用化"])) {
    return "実用化するときは、今のデモ応答部分をGemini API呼び出しに差し替える形がよさそうです。\n送る情報は「ユーザーの質問」「今日の計画」「登録教科」「未完了一覧」くらいに絞ると、返答が具体的になります。APIキーはフロントに直接置かず、サーバー側か安全な中継処理で扱うのが安心です。";
  }

  return "なるほど。今のデモ版では、勉強の進め方や気持ちの整理を中心に答えられます。\nもしよければ「教科名」「どこがわからないか」「今どこまでできたか」を少しだけ足して送ってください。そこから、次にやる1ステップに分けて一緒に考えます。";
}

function getTodayPlan() {
  const today = startOfToday();
  return state.plan.find((day) => isSameDate(parseDate(day.date), today));
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function getMinutesForDate(date) {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const baseMinutes = Number(isWeekend ? state.basic.weekendMinutes : state.basic.weekdayMinutes);
  const hasEvent = getEventsForDate(toISODate(date)).length > 0;

  // 部活や予定がある日は、入力された勉強時間の6割くらいにして無理を減らす。
  if (hasEvent) {
    return Math.max(30, Math.round(baseMinutes * 0.6));
  }

  return baseMinutes;
}

function getDateRange(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
}

function getDaysLeftText() {
  if (!state.basic.testDate) return "--";

  const testDate = parseDate(state.basic.testDate);
  if (!testDate) return "--";

  const diff = Math.ceil((testDate - startOfToday()) / 86400000);
  if (diff < 0) return "終了";
  if (diff === 0) return "今日";
  return `あと${diff}日`;
}

function parseDate(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function isSameDate(a, b) {
  return a && b && toISODate(a) === toISODate(b);
}

function formatDateShort(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekday(date) {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] + "曜日";
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
