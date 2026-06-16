const STORAGE_KEY = "tesuraku-state-v1";
const DEVICE_ID_KEY = "tesuraku-device-id";

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
  enabled: false,
  isApplyingRemote: false,
  saveTimer: null,
  stateRef: null
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
  plan: [],
  unfinished: [],
  aiMessages: []
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
  subjectForm: document.getElementById("subjectForm"),
  basicForm: document.getElementById("basicForm"),
  subjectList: document.getElementById("subjectList"),
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
  firebaseStatus: document.getElementById("firebaseStatus")
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
  elements.generateButton.addEventListener("click", generatePlan);
  elements.redistributeButton.addEventListener("click", redistributeUnfinished);
  elements.resetButton.addEventListener("click", resetAll);
  elements.goInputButton.addEventListener("click", () => setActiveTab("input"));
  elements.goScheduleButton.addEventListener("click", () => setActiveTab("schedule"));
  elements.aiForm.addEventListener("submit", handleAIMessage);

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

function initFirebaseSync() {
  if (!window.firebase || !window.firebase.database) {
    updateFirebaseStatus("Firebase SDK未読み込み", "offline");
    return;
  }

  try {
    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);
    const database = window.firebase.database(app);
    const deviceId = getDeviceId();

    firebaseSync.stateRef = database.ref(`tesuraku/users/${deviceId}/state`);
    firebaseSync.enabled = true;
    updateFirebaseStatus("Firebase接続中", "syncing");

    firebaseSync.stateRef.on("value", (snapshot) => {
      const remoteState = snapshot.val();

      if (!remoteState) {
        queueFirebaseSave(createStateSnapshot());
        updateFirebaseStatus("Firebase接続済み", "online");
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
      }

      updateFirebaseStatus("Firebase同期済み", "online");
    }, (error) => {
      console.warn("Firebaseの読み込みに失敗しました。", error);
      updateFirebaseStatus("Firebase同期エラー", "offline");
    });
  } catch (error) {
    console.warn("Firebase初期化に失敗しました。", error);
    updateFirebaseStatus("Firebase接続失敗", "offline");
  }
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
    plan: state.plan,
    unfinished: state.unfinished,
    aiMessages: state.aiMessages,
    updatedAt: Date.now()
  };
}

function applyStateSnapshot(snapshot) {
  state.basic = { ...state.basic, ...(snapshot.basic || {}) };
  state.subjects = Array.isArray(snapshot.subjects) ? snapshot.subjects : [];
  state.plan = Array.isArray(snapshot.plan) ? snapshot.plan : [];
  state.unfinished = Array.isArray(snapshot.unfinished) ? snapshot.unfinished : [];
  state.aiMessages = Array.isArray(snapshot.aiMessages) ? snapshot.aiMessages : [];
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
  state.plan = [];
  state.unfinished = [];
  state.aiMessages = [];
  elements.basicForm.reset();
  elements.subjectForm.reset();
  elements.aiForm.reset();

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
  renderPlan();
  renderUnfinished();
  renderStats();
  renderDashboardNext();
  renderAIChat();
}

function renderDashboardNext() {
  elements.dashboardNextTitle.textContent = "次の予定";
  elements.dashboardNextMeta.textContent = "入力タブで計画を作成してください。";
  elements.dashboardNextItems.innerHTML = '<p class="empty-message">まだ予定がありません。</p>';

  if (state.plan.length === 0) return;

  const today = startOfToday();
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
  elements.dashboardNextTitle.textContent = isSameDate(date, today) ? "今日の予定" : "次の予定";
  elements.dashboardNextMeta.textContent = `${formatDateShort(date)} ${getWeekday(date)} / 予定 ${nextPlan.plannedMinutes}分`;

  const items = nextPlan.items.length > 0
    ? nextPlan.items.map((item) => `<li>${escapeHTML(item.text)}</li>`).join("")
    : "<li>暗記・ノート整理・前回の続き</li>";
  elements.dashboardNextItems.innerHTML = `<ul>${items}</ul>`;
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

function renderPlan() {
  elements.todayTodoList.innerHTML = "";
  elements.calendarList.innerHTML = "";
  elements.planName.textContent = state.basic.testName ? state.basic.testName : "";
  elements.calendarTitle.textContent = "";

  if (state.plan.length === 0) {
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

  if (!todayPlan) {
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

  card.innerHTML = `
    <div class="plan-head">
      <div>
        <h3>${formatDateShort(date)} <span class="done-mark">✓ 完了</span></h3>
        <div class="date-line">${getWeekday(date)}</div>
      </div>
      <div class="time-line">予定 ${day.plannedMinutes}分</div>
    </div>
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
  const monthKeys = new Set(state.plan.map((day) => day.date.slice(0, 7)));
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
    const cell = document.createElement("article");
    cell.className = [
      "calendar-cell",
      day ? "has-plan" : "",
      day && day.status === "done" ? "done" : "",
      day && day.status === "missed" ? "missed" : "",
      isSameDate(date, today) ? "today" : ""
    ].filter(Boolean).join(" ");

    cell.innerHTML = createCalendarCellHTML(date, day);

    if (day) {
      const [completeButton, missedButton] = cell.querySelectorAll("button");
      completeButton.addEventListener("click", () => markComplete(day.id));
      missedButton.addEventListener("click", () => markUnfinished(day.id));
    }

    cells.push(cell);
  }

  return cells;
}

function createCalendarCellHTML(date, day) {
  if (!day) {
    return `<div class="calendar-date">${date.getDate()}</div>`;
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

function handleAIMessage(event) {
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

  state.aiMessages.push({
    role: "assistant",
    text: createDemoAIReply(text)
  });

  elements.aiInput.value = "";
  saveState();
  renderAIChat();
}

function renderAIChat() {
  elements.aiMessages.innerHTML = "";

  const messages = state.aiMessages.length > 0
    ? state.aiMessages
    : [{
      role: "assistant",
      text: "こんにちは。テスラクのデモAIです。\n勉強でわからないところ、計画の相談、ちょっと疲れたときの雑談まで、気軽に話してください。今はローカルの簡易応答ですが、あとでGemini APIに差し替えられる作りにしています。"
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
  return Number(isWeekend ? state.basic.weekendMinutes : state.basic.weekdayMinutes);
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
