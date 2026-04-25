const STORAGE_KEY = "organize-labs-todo-custom";
const PRESET_KEY = "organize-labs-todo-presets";
const days = ["M", "T", "W", "T", "F", "S", "S"];
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneSeedState() {
  return JSON.parse(JSON.stringify(seedState));
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function createDateMeta(date) {
  return {
    date,
    key: getDateKey(date),
    day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
    label: String(date.getDate()),
    month: date.toLocaleDateString("en", { month: "short" }),
    isToday: getDateKey(date) === getTodayKey(),
  };
}

function getMonthDates(monthKey = getCurrentMonthKey()) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0);
  return Array.from({ length: lastDate.getDate() }, (_, index) => createDateMeta(addDays(firstDate, index)));
}

function getDashboardDates() {
  return getMonthDates(getCurrentMonthKey());
}

function getVisibleDateGroups() {
  const dates = getDashboardDates();
  const groups = [];
  for (let index = 0; index < dates.length; index += 7) {
    groups.push({
      dates: dates.slice(index, index + 7),
    });
  }
  return groups;
}

function getDateGroupTitle(group) {
  const first = group.dates[0];
  const last = group.dates[group.dates.length - 1];
  if (!first || !last) return "Dates";
  if (group.dates.some((date) => date.isToday)) return "This Week";
  return `${first.month} ${first.label} - ${last.month} ${last.label}`;
}

const seedState = {
  heroText: "POV: Everyone's sleeping, you're building your future",
  brandText: "@ORGANIZE.LABS",
  boardTitle: "Future Builder",
  activeReview: "weekly",
  selectedMonth: getCurrentMonthKey(),
  selectedWeekId: "",
  tasks: ["Wake up early", "Deep work", "Workout", "Read", "Plan tomorrow"].map((text) => ({
    id: createId(),
    text,
  })),
  dateChecks: {},
};

seedState.tasks.forEach((task) => {
  seedState.dateChecks[task.id] = {};
});

const colors = ["#f6dce2", "#dce7f4", "#f5efb8", "#dff1de", "#f1ddd2", "#e4def4", "#d7ece7"];
let state = loadState();
const weeksElement = document.querySelector("#weeks");
const input = document.querySelector("#taskInput");
const addButton = document.querySelector("#addButton");
const workbench = document.querySelector(".workbench");
const sidebarToggle = document.querySelector("#sidebarToggle");
const preserveButton = document.querySelector("#preserveButton");
const presetList = document.querySelector("#presetList");
const presetCount = document.querySelector("#presetCount");
const loadButton = document.querySelector("#loadButton");
const resetButton = document.querySelector("#resetButton");
const weeklyReviewButton = document.querySelector("#weeklyReviewButton");
const monthlyReviewButton = document.querySelector("#monthlyReviewButton");
const dashboardView = document.querySelector("#dashboardView");
const reviewPage = document.querySelector("#reviewPage");
const backToDashboardButton = document.querySelector("#backToDashboardButton");
const reviewPageTitle = document.querySelector("#reviewPageTitle");
const reviewPageLabel = document.querySelector("#reviewPageLabel");
const reviewPageScore = document.querySelector("#reviewPageScore");
const reviewPageMeta = document.querySelector("#reviewPageMeta");
const reviewDetailGrid = document.querySelector("#reviewDetailGrid");
const reviewChartTitle = document.querySelector("#reviewChartTitle");
const reviewChart = document.querySelector("#reviewChart");
const dashboardChart = document.querySelector("#dashboardChart");
const taskProgressList = document.querySelector("#taskProgressList");
const monthSelect = document.querySelector("#monthSelect");
const reviewWeekSelect = document.querySelector("#reviewWeekSelect");
const reviewPageWeeklyButton = document.querySelector("#reviewPageWeeklyButton");
const reviewPageMonthlyButton = document.querySelector("#reviewPageMonthlyButton");
let selectedPresetId = "";

function getInitialSidebarState() {
  const saved = localStorage.getItem("organize-labs-sidebar-open");
  if (saved === "true") return true;
  if (saved === "false") return false;
  return window.innerWidth > 680;
}

let isSidebarOpen = getInitialSidebarState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneSeedState();

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return cloneSeedState();
  }
}

function normalizeState(source) {
  const nextState = source || cloneSeedState();
  nextState.activeReview = nextState.activeReview === "monthly" ? "monthly" : "weekly";
  nextState.selectedMonth = nextState.selectedMonth || getCurrentMonthKey();
  nextState.selectedWeekId = nextState.selectedWeekId || "";

  if (Array.isArray(nextState.tasks)) {
    nextState.tasks = nextState.tasks.map((task) => ({
      id: task.id || createId(),
      text: task.text || "Untitled",
    }));
    nextState.dateChecks = normalizeDateChecks(nextState);
    nextState.weeks = [];
    return nextState;
  }

  const taskMap = new Map();
  (nextState.weeks || []).forEach((week) => {
    (week.tasks || []).forEach((task) => {
      const key = (task.text || "Untitled").trim().toLowerCase();
      if (!taskMap.has(key)) {
        taskMap.set(key, {
          id: createId(),
          text: task.text || "Untitled",
        });
      }
    });
  });

  const tasks = Array.from(taskMap.values());
  const weeks = (nextState.weeks || []).map((week, weekIndex) => {
    const checks = {};
    tasks.forEach((task) => {
      checks[task.id] = Array(7).fill(false);
    });

    (week.tasks || []).forEach((oldTask) => {
      const key = (oldTask.text || "Untitled").trim().toLowerCase();
      const task = taskMap.get(key);
      if (!task) return;
      const legacyDays = Array.isArray(oldTask.days) ? oldTask.days : Array(7).fill(Boolean(oldTask.done));
      checks[task.id] = days.map((_, index) => Boolean(legacyDays[index]));
    });

    return {
      id: week.id || createId(),
      title: week.title || `Week ${weekIndex + 1}`,
      checks,
    };
  });

  return {
    ...nextState,
    tasks,
    weeks: [],
    dateChecks: migrateWeeksToDateChecks(tasks, weeks),
  };
}

function normalizeDateChecks(source) {
  const dateChecks = source.dateChecks || migrateWeeksToDateChecks(source.tasks, source.weeks || []);
  source.tasks.forEach((task) => {
    if (!dateChecks[task.id]) {
      dateChecks[task.id] = {};
    }
  });

  return dateChecks;
}

function migrateWeeksToDateChecks(tasks, weeks) {
  const dateChecks = {};
  tasks.forEach((task) => {
    dateChecks[task.id] = {};
  });

  weeks.forEach((week, weekIndex) => {
    tasks.forEach((task) => {
      (week.checks?.[task.id] || []).forEach((isDone, dayIndex) => {
        const dateKey = getDateKey(addDays(new Date(), weekIndex * 7 + dayIndex));
        dateChecks[task.id][dateKey] = Boolean(isDone);
      });
    });
  });

  return dateChecks;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadPresets() {
  const saved = localStorage.getItem(PRESET_KEY);
  if (!saved) return [];

  try {
    return JSON.parse(saved).map((preset) => ({
      ...preset,
      state: normalizeState(preset.state),
    }));
  } catch {
    return [];
  }
}

function savePresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

function syncEditableState() {
  state.heroText = document.querySelector("#heroText").textContent.trim() || seedState.heroText;
  state.brandText = document.querySelector("#brandText").textContent.trim() || seedState.brandText;
  state.boardTitle = document.querySelector("#boardTitle").textContent.trim() || seedState.boardTitle;
}

function bindEditable(element, key, fallback) {
  element.textContent = state[key] || fallback;
  element.addEventListener("blur", () => {
    state[key] = element.textContent.trim() || fallback;
    element.textContent = state[key];
    saveState();
  });
  element.addEventListener("keydown", stopEnterLineBreak);
}

function stopEnterLineBreak(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function renderPresetOptions() {
  const presets = loadPresets();
  presetList.innerHTML = "";
  presetCount.textContent = presets.length;

  if (!presets.length) {
    const empty = document.createElement("div");
    empty.className = "empty-preset";
    empty.textContent = "No preserved boards";
    presetList.append(empty);
    selectedPresetId = "";
    loadButton.disabled = true;
    return;
  }

  if (!presets.some((preset) => preset.id === selectedPresetId)) {
    selectedPresetId = presets[0].id;
  }

  presets.forEach((preset) => {
    const button = document.createElement("div");
    const textWrap = document.createElement("span");
    const name = document.createElement("span");
    const date = document.createElement("span");
    const deleteButton = document.createElement("button");

    button.className = `preset-item${preset.id === selectedPresetId ? " is-active" : ""}`;
    button.role = "button";
    button.tabIndex = 0;
    textWrap.className = "preset-text";
    name.className = "preset-name";
    name.contentEditable = "true";
    name.spellcheck = false;
    date.className = "preset-date";
    deleteButton.type = "button";
    deleteButton.className = "preset-delete";
    deleteButton.textContent = "x";
    deleteButton.ariaLabel = `Delete ${preset.name}`;
    name.textContent = preset.name;
    date.textContent = formatPresetDate(preset.createdAt);

    button.addEventListener("click", () => {
      selectedPresetId = preset.id;
      renderPresetOptions();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectedPresetId = preset.id;
        renderPresetOptions();
      }
    });
    name.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedPresetId = preset.id;
      document.querySelectorAll(".preset-item").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
    name.addEventListener("blur", () => {
      renamePreset(preset.id, name.textContent);
    });
    name.addEventListener("keydown", stopEnterLineBreak);
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deletePreset(preset.id);
    });

    textWrap.append(name, date);
    button.append(textWrap, deleteButton);
    presetList.append(button);
  });
  loadButton.disabled = false;
}

function renderReviewRate() {
  weeklyReviewButton.classList.toggle("is-active", state.activeReview === "weekly");
  monthlyReviewButton.classList.toggle("is-active", state.activeReview === "monthly");
  reviewPageWeeklyButton.classList.toggle("is-active", state.activeReview === "weekly");
  reviewPageMonthlyButton.classList.toggle("is-active", state.activeReview === "monthly");
}

function renderDashboardInsights() {
  renderLineChart(dashboardChart, getVisibleDateGroups().map((group) => getWeekStats({
    title: getDateGroupTitle(group),
    dates: group.dates,
  })));
  const visibleDates = getDashboardDates();
  taskProgressList.innerHTML = "";

  state.tasks.forEach((task) => {
    const total = visibleDates.length;
    const done = visibleDates.reduce((sum, date) => sum + Number(Boolean(state.dateChecks[task.id]?.[date.key])), 0);
    const rate = getRate(done, total);
    const row = document.createElement("div");
    const top = document.createElement("div");
    const name = document.createElement("span");
    const value = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("span");

    row.className = "task-progress-row";
    top.className = "task-progress-top";
    track.className = "rate-track";
    fill.style.width = `${rate}%`;
    name.textContent = task.text;
    value.textContent = `${rate}%`;

    top.append(name, value);
    track.append(fill);
    row.append(top, track);
    taskProgressList.append(row);
  });
}

function setReviewMode(mode) {
  state.activeReview = mode;
  if (mode === "monthly" && !getMonthKeys().includes(state.selectedMonth)) {
    state.selectedMonth = getMonthKeys()[0] || getCurrentMonthKey();
  }
  saveState();
  renderReviewRate();
  showReviewPage();
}

function getMonthKeys() {
  const dateKeys = getKnownDateKeys();
  return [...new Set(dateKeys.map((dateKey) => dateKey.slice(0, 7)))].sort();
}

function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function getKnownDateKeys() {
  const dateKeys = new Set(getDashboardDates().map((date) => date.key));
  Object.values(state.dateChecks).forEach((taskChecks) => {
    Object.keys(taskChecks).forEach((dateKey) => dateKeys.add(dateKey));
  });
  return [...dateKeys].sort();
}

function getWeekStartDate(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  return weekStart;
}

function getWeekRanges() {
  const starts = new Map();
  getKnownDateKeys().forEach((dateKey) => {
    const weekStart = getWeekStartDate(new Date(`${dateKey}T00:00:00`));
    const startKey = getDateKey(weekStart);
    if (!starts.has(startKey)) {
      const dates = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          date,
          key: getDateKey(date),
        };
      });
      starts.set(startKey, {
        id: startKey,
        title: `Week of ${weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
        month: startKey.slice(0, 7),
        dates,
      });
    }
  });
  return [...starts.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function getMonthWeekStats(monthKey) {
  return getWeekRanges()
    .map((week) => ({
      ...week,
      dates: week.dates.filter((date) => date.key.startsWith(monthKey)),
    }))
    .filter((week) => week.dates.length)
    .map((week) => getWeekStats(week));
}

function getWeekStats(week) {
  const done = week.dates.reduce((dateSum, date) => {
    return dateSum + state.tasks.reduce((taskSum, task) => taskSum + Number(Boolean(state.dateChecks[task.id]?.[date.key])), 0);
  }, 0);
  const total = state.tasks.length * week.dates.length;

  return {
    title: week.title,
    done,
    total,
    rate: getRate(done, total),
  };
}

function getDayStats(week) {
  return week.dates.map((date) => {
    const done = state.tasks.reduce((sum, task) => sum + Number(Boolean(state.dateChecks[task.id]?.[date.key])), 0);
    const total = state.tasks.length;
    const actualDate = new Date(`${date.key}T00:00:00`);

    return {
      title: new Date(`${date.key}T00:00:00`).toLocaleDateString("en", { weekday: "short" }),
      chartLabel: actualDate.toLocaleDateString("en", { month: "numeric", day: "numeric" }),
      done,
      total,
      rate: getRate(done, total),
    };
  });
}

function getDateStats(date) {
  const done = state.tasks.reduce((sum, task) => sum + Number(Boolean(state.dateChecks[task.id]?.[date.key])), 0);
  const total = state.tasks.length;

  return {
    title: date.label || new Date(`${date.key}T00:00:00`).toLocaleDateString("en", { day: "numeric" }),
    done,
    total,
    rate: getRate(done, total),
  };
}

function getRate(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function showReviewPage() {
  dashboardView.hidden = true;
  reviewPage.hidden = false;
  renderReviewPage();
}

function showDashboard() {
  reviewPage.hidden = true;
  dashboardView.hidden = false;
}

function renderReviewPage() {
  reviewWeekSelect.innerHTML = "";
  const weekRanges = getWeekRanges();
  weekRanges.forEach((week) => {
    const option = document.createElement("option");
    option.value = week.id;
    option.textContent = `${week.title} - ${formatMonthKey(week.month)}`;
    reviewWeekSelect.append(option);
  });

  const monthKeys = getMonthKeys();
  monthSelect.innerHTML = "";
  monthKeys.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = formatMonthKey(monthKey);
    monthSelect.append(option);
  });

  const isMonthly = state.activeReview === "monthly";
  monthSelect.hidden = !isMonthly;
  reviewWeekSelect.hidden = isMonthly;

  if (isMonthly && !monthKeys.includes(state.selectedMonth)) {
    state.selectedMonth = monthKeys[0] || getCurrentMonthKey();
  }
  monthSelect.value = state.selectedMonth;

  if (!weekRanges.some((week) => week.id === state.selectedWeekId)) {
    state.selectedWeekId = weekRanges.find((week) => week.dates.some((date) => date.key === getTodayKey()))?.id || weekRanges[weekRanges.length - 1]?.id || "";
  }
  reviewWeekSelect.value = state.selectedWeekId;

  const weekStats = isMonthly ? getMonthWeekStats(state.selectedMonth) : weekRanges.map((week) => getWeekStats(week));
  const selectedWeek = weekRanges.find((week) => week.id === state.selectedWeekId) || weekRanges[weekRanges.length - 1];
  const selectedWeekStats = selectedWeek ? getWeekStats(selectedWeek) : { title: "Week", rate: 0, done: 0, total: 0 };
  const totalDone = weekStats.reduce((sum, week) => sum + week.done, 0);
  const totalChecks = weekStats.reduce((sum, week) => sum + week.total, 0);
  const totalRate = getRate(totalDone, totalChecks);

  reviewPageTitle.textContent = isMonthly ? "Monthly Review" : "Weekly Review";
  reviewPageLabel.textContent = isMonthly ? formatMonthKey(state.selectedMonth) : selectedWeekStats.title;
  reviewPageScore.textContent = `${isMonthly ? totalRate : selectedWeekStats.rate}%`;
  reviewPageMeta.textContent = isMonthly
    ? `${totalDone} / ${totalChecks} checks completed`
    : `${selectedWeekStats.done} / ${selectedWeekStats.total} checks completed`;

  const detailStats = isMonthly ? weekStats : getDayStats(selectedWeek);
  reviewChartTitle.textContent = isMonthly ? "Week progress curve" : "Day progress curve";
  renderReviewChart(detailStats);

  reviewDetailGrid.innerHTML = "";
  detailStats.forEach((item) => {
    const card = document.createElement("article");
    const title = document.createElement("h2");
    const score = document.createElement("strong");
    const meta = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("span");

    card.className = "review-detail-card";
    title.textContent = item.title;
    score.textContent = `${item.rate}%`;
    meta.textContent = `${item.done} / ${item.total} checks`;
    track.className = "rate-track";
    fill.style.width = `${item.rate}%`;

    track.append(fill);
    card.append(title, score, meta, track);
    reviewDetailGrid.append(card);
  });
}

function renderReviewChart(items) {
  renderLineChart(reviewChart, items);
}

function renderLineChart(svgElement, items) {
  const width = 640;
  const height = 220;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const points = items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : padding + (chartWidth / (items.length - 1)) * index;
    const y = padding + chartHeight - (chartHeight * item.rate) / 100;
    return { ...item, x, y };
  });
  const linePoints =
    points.length === 1
      ? `${padding},${points[0].y} ${width - padding},${points[0].y}`
      : points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length ? `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}` : "";

  svgElement.innerHTML = `
    <defs>
      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#b7ee8e" stop-opacity="0.55"></stop>
        <stop offset="100%" stop-color="#b7ee8e" stop-opacity="0.06"></stop>
      </linearGradient>
    </defs>
    <line class="chart-grid" x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}"></line>
    <line class="chart-grid" x1="${padding}" y1="${padding + chartHeight / 2}" x2="${width - padding}" y2="${padding + chartHeight / 2}"></line>
    <line class="chart-grid" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}"></line>
    <polygon class="chart-area" points="${area}"></polygon>
    <polyline class="chart-line" points="${linePoints}"></polyline>
    ${points
      .map(
        (point) => `
          <g>
            <circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="5"></circle>
            <text class="chart-label" x="${point.x}" y="${height - 8}" text-anchor="middle">${point.chartLabel || point.title.slice(0, 3)}</text>
          </g>
        `,
      )
      .join("")}
  `;
}

function renamePreset(id, value) {
  const presets = loadPresets();
  const preset = presets.find((item) => item.id === id);
  if (!preset) return;

  preset.name = value.trim() || "Untitled preset";
  savePresets(presets);
  renderPresetOptions();
}

function deletePreset(id) {
  const presets = loadPresets();
  const preset = presets.find((item) => item.id === id);
  if (!preset) return;

  const confirmed = window.confirm(`"${preset.name}" を削除しますか？`);
  if (!confirmed) return;

  const nextPresets = presets.filter((item) => item.id !== id);
  if (selectedPresetId === id) {
    selectedPresetId = nextPresets[0]?.id || "";
  }
  savePresets(nextPresets);
  renderPresetOptions();
}

function renderSidebarState() {
  workbench.classList.toggle("is-sidebar-closed", !isSidebarOpen);
  sidebarToggle.textContent = isSidebarOpen ? "Hide Tab" : "Show Tab";
  localStorage.setItem("organize-labs-sidebar-open", String(isSidebarOpen));
}

function formatPresetDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function render() {
  state = normalizeState(state);
  weeksElement.innerHTML = "";
  renderPresetOptions();
  renderReviewRate();

  const taskColumn = document.createElement("section");
  taskColumn.className = "task-column";
  const taskHeader = document.createElement("div");
  taskHeader.className = "task-column-header";
  taskHeader.textContent = "Tasks";
  taskColumn.append(taskHeader);

  state.tasks.forEach((task) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const deleteButton = document.createElement("button");

    row.className = "task-list-row";
    label.className = "task-name";
    label.contentEditable = "true";
    label.spellcheck = false;
    label.textContent = task.text;
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.ariaLabel = "Delete task";

    label.addEventListener("blur", () => {
      task.text = label.textContent.trim() || "Untitled";
      label.textContent = task.text;
      saveState();
      renderTopHabits();
      renderDashboardInsights();
    });
    label.addEventListener("keydown", stopEnterLineBreak);

    deleteButton.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      delete state.dateChecks[task.id];
      saveState();
      render();
    });

    row.append(label, deleteButton);
    taskColumn.append(row);
  });

  weeksElement.append(taskColumn);

  const visibleGroups = getVisibleDateGroups();
  visibleGroups.forEach((group, groupIndex) => {
    const groupElement = document.createElement("section");
    groupElement.className = `date-group${group.dates.some((date) => date.isToday) ? " has-today" : ""}`;
    groupElement.dataset.today = String(group.dates.some((date) => date.isToday));
    groupElement.style.setProperty("--week-color", colors[groupIndex % colors.length]);

    const header = document.createElement("div");
    header.className = "date-group-header";
    header.textContent = getDateGroupTitle(group);
    groupElement.append(header);

    const dateHeader = document.createElement("div");
    dateHeader.className = "date-header";
    group.dates.forEach((date) => {
      const dateCell = document.createElement("div");
      dateCell.className = `date-head-cell${date.isToday ? " is-today" : ""}`;
      dateCell.dataset.today = String(date.isToday);
      dateCell.innerHTML = `<span>${date.day}</span><strong>${date.label}</strong><small>${date.month}</small>`;
      dateHeader.append(dateCell);
    });
    groupElement.append(dateHeader);

    state.tasks.forEach((task) => {
      const node = document.createElement("div");
      const checks = document.createElement("div");

      node.className = "check-row";
      checks.className = "day-checks";
      group.dates.forEach((date) => {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(state.dateChecks[task.id]?.[date.key]);
        checkbox.ariaLabel = `${task.text} ${date.key}`;
        checkbox.addEventListener("change", () => {
          if (!state.dateChecks[task.id]) {
            state.dateChecks[task.id] = {};
          }
          state.dateChecks[task.id][date.key] = checkbox.checked;
          saveState();
          updateProgress();
          renderTopHabits();
          renderDashboardInsights();
          renderReviewRate();
          if (!reviewPage.hidden) renderReviewPage();
        });
        checks.append(checkbox);
      });

      node.append(checks);
      groupElement.append(node);
    });

    weeksElement.append(groupElement);
  });

  requestAnimationFrame(scrollTodayToStart);

  updateProgress();
  renderTopHabits();
  renderDashboardInsights();
}

function scrollTodayToStart() {
  const todayCell = weeksElement.querySelector('.date-head-cell[data-today="true"]');
  const targetCell = todayCell || weeksElement.querySelector(".date-head-cell");
  if (!targetCell) return;

  weeksElement.scrollLeft = targetCell.offsetLeft - weeksElement.querySelector(".task-column").offsetWidth;
}

function updateProgress() {
  const visibleDates = getDashboardDates();
  const done = visibleDates.reduce((dateSum, date) => {
    return dateSum + state.tasks.reduce((taskSum, task) => taskSum + Number(Boolean(state.dateChecks[task.id]?.[date.key])), 0);
  }, 0);
  const total = visibleDates.length * state.tasks.length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  document.querySelector("#progressRing").style.setProperty("--progress", progress);
  document.querySelector("#progressText").textContent = `${progress}%`;
  document.querySelector("#doneCount").textContent = done;
  document.querySelector("#totalCount").textContent = total;
}

function renderTopHabits() {
  const visibleDates = getDashboardDates();
  const topHabits = state.tasks
    .filter((task) => visibleDates.some((date) => !state.dateChecks[task.id]?.[date.key]))
    .slice(0, 3);

  const list = document.querySelector("#topHabits");
  list.innerHTML = "";

  if (!topHabits.length) {
    const item = document.createElement("li");
    item.textContent = "All clear. Plan the next move.";
    list.append(item);
    return;
  }

  topHabits.forEach((task) => {
    const item = document.createElement("li");
    item.textContent = task.text;
    list.append(item);
  });
}

function addTask() {
  const text = input.value.trim();
  if (!text) return;

  const task = {
    id: createId(),
    text,
  };
  state.tasks.push(task);
  state.dateChecks[task.id] = {};

  input.value = "";
  saveState();
  render();
}

function preserveCurrentBoard() {
  syncEditableState();
  saveState();

  const defaultName = `${state.boardTitle} ${new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())}`;
  const name = window.prompt("保存名を入力", defaultName);
  if (!name) return;

  const presets = loadPresets();
  presets.unshift({
    id: createId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)),
  });
  savePresets(presets);
  selectedPresetId = presets[0].id;
  renderPresetOptions();
}

function loadSelectedPreset() {
  const presets = loadPresets();
  const preset = presets.find((item) => item.id === selectedPresetId);
  if (!preset) return;

  state = JSON.parse(JSON.stringify(preset.state));
  state = normalizeState(state);
  saveState();
  document.querySelector("#heroText").textContent = state.heroText || seedState.heroText;
  document.querySelector("#brandText").textContent = state.brandText || seedState.brandText;
  document.querySelector("#boardTitle").textContent = state.boardTitle || seedState.boardTitle;
  render();
}

bindEditable(document.querySelector("#heroText"), "heroText", seedState.heroText);
bindEditable(document.querySelector("#brandText"), "brandText", seedState.brandText);
bindEditable(document.querySelector("#boardTitle"), "boardTitle", seedState.boardTitle);

addButton.addEventListener("click", addTask);
sidebarToggle.addEventListener("click", () => {
  isSidebarOpen = !isSidebarOpen;
  renderSidebarState();
});
preserveButton.addEventListener("click", preserveCurrentBoard);
loadButton.addEventListener("click", loadSelectedPreset);
weeklyReviewButton.addEventListener("click", () => setReviewMode("weekly"));
monthlyReviewButton.addEventListener("click", () => setReviewMode("monthly"));
reviewPageWeeklyButton.addEventListener("click", () => setReviewMode("weekly"));
reviewPageMonthlyButton.addEventListener("click", () => setReviewMode("monthly"));
backToDashboardButton.addEventListener("click", showDashboard);
monthSelect.addEventListener("change", () => {
  state.selectedMonth = monthSelect.value;
  saveState();
  renderReviewPage();
});
reviewWeekSelect.addEventListener("change", () => {
  state.selectedWeekId = reviewWeekSelect.value;
  saveState();
  renderReviewPage();
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTask();
});

resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("現在のボードを初期状態に戻しますか？Preserveした保存版は残ります。");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
});

document.querySelector("#currentDate").textContent = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
}).format(new Date());

renderSidebarState();
render();
