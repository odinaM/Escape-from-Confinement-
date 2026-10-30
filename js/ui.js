// dom элементы
const $ = (id) => document.getElementById(id);
const splashScreen = $("splashScreen"),
  introScreen = $("introScreen"),
  mapSelectScreen = $("mapSelectScreen");
const gameScreen = $("gameScreen"),
  resultsScreen = $("resultsScreen");
const cardsContainer = $("cardsContainer"),
  nameBlock = $("nameBlock");
const selectedMapLabel = $("selectedMapLabel"),
  playerNameInput = $("playerName");
const startBtn = $("startBtn"),
  gameContainer = $("gameContainer");
const playerEl = $("player"),
  mapImage = $("mapImage");
const overlay = $("overlay"),
  overlayBtn = $("overlayBtn"),
  toastEl = $("toast");

// утилиты
const formatElapsed = (ms) => {
  const t = Math.floor(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const showToast = (text, ms = 1400) => {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), ms);
};

// навигация
$("toMapBtn").addEventListener("click", () => {
  splashScreen.classList.add("hidden");
  mapSelectScreen.classList.remove("hidden");
  renderMaps();
});
$("toIntroBtn").addEventListener("click", () => {
  splashScreen.classList.add("hidden");
  introScreen.classList.remove("hidden");
});
$("toMapBtnRules").addEventListener("click", () => {
  introScreen.classList.add("hidden");
  mapSelectScreen.classList.remove("hidden");
  renderMaps();
});
$("backToIntroBtn").addEventListener("click", () => {
  mapSelectScreen.classList.add("hidden");
  introScreen.classList.remove("hidden");
});

// рендер карт
function renderMaps() {
  cardsContainer.innerHTML = "";
  mapsData.maps.forEach((map) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <div class="thumb ${map.id}"><img src="${map.img}" alt="${map.name}" class="map-thumb-img"></div>
        <b>${map.name}</b><small>${map.desc}</small>
        <div style="margin-top:8px;"><span class="diff-badge ${map.diffClass}">${map.diffName}</span></div>`;
    card.addEventListener("click", () => selectMap(map, card));
    cardsContainer.appendChild(card);
  });
}

function selectMap(map, cardEl) {
  state.selectedMap = map;
  document
    .querySelectorAll(".card")
    .forEach((c) => c.classList.remove("selected"));
  cardEl.classList.add("selected");
  nameBlock.classList.remove("hidden");
  selectedMapLabel.textContent = `Выбрана карта: ${map.name} (${map.diffName}). Теперь введите имя.`;
  playerNameInput.focus();
  playerNameInput.classList.remove("error");
}

// старт игры и проверки
startBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.classList.add("error");
    alert("Ошибка: Введите имя!");
    playerNameInput.focus();
    return;
  }
  if (name.length < 2) {
    playerNameInput.classList.add("error");
    alert("Ошибка: Имя слишком короткое!");
    playerNameInput.focus();
    return;
  }
  if (!state.selectedMap) {
    alert("Выберите карту!");
    return;
  }

  playerNameInput.classList.remove("error");
  startGame(name); // Вызов функции из game.js
});

playerNameInput.addEventListener("input", () =>
  playerNameInput.classList.remove("error"),
);
playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startBtn.click();
});

// экран результатов
function showResults(win) {
  resultsScreen.classList.remove("hidden");
  $("historyBlock").classList.add("hidden");

  const titleEl = $("resTitle");
  titleEl.textContent = win ? "ПОБЕДА!" : "ИГРА ОКОНЧЕНА";
  titleEl.className = win ? "win-title" : "lose-title";

  $("resTime").textContent = formatElapsed(state.elapsedMs);
  $("resMonsters").textContent = state.hits.monsters;
  $("resTraps").textContent = state.hits.traps;
  $("resLives").textContent = Math.max(0, state.lives);
  $("resMessage").textContent = win
    ? `Отличная работа, ${state.playerName}! Ты выбрался из заточения.`
    : `Увы, ${state.playerName}. Монстры и ловушки оказались сильнее.`;

  saveGameResult(win);
}

// сохранение и результаты
function saveGameResult(win) {
  const history = JSON.parse(localStorage.getItem("escapeGameHistory")) || [];
  history.push({
    name: state.playerName,
    time: formatElapsed(state.elapsedMs),
    lives: Math.max(0, state.lives),
    win: win,
    date: new Date().toLocaleDateString("ru-RU"),
  });
  if (history.length > 5) history.shift();
  localStorage.setItem("escapeGameHistory", JSON.stringify(history));
}

$("historyBtn").addEventListener("click", () => {
  const block = $("historyBlock"),
    list = $("historyList");
  if (block.classList.contains("hidden")) {
    const history = JSON.parse(localStorage.getItem("escapeGameHistory")) || [];
    list.innerHTML = history.length === 0 ? "<li>Пока нет партий.</li>" : "";
    [...history].reverse().forEach((game) => {
      const li = document.createElement("li");
      const status = game.win
        ? '<span class="history-win">Победа</span>'
        : '<span class="history-lose">Поражение</span>';
      li.innerHTML = `<div><b>${game.name}</b> (${game.date})<br><small>Время: ${game.time} | Жизни: ${game.lives}</small></div><div>${status}</div>`;
      list.appendChild(li);
    });
    block.classList.remove("hidden");
  } else {
    block.classList.add("hidden");
  }
});

// рестарт
$("restartBtn").addEventListener("click", () => {
  resultsScreen.classList.add("hidden");
  splashScreen.classList.remove("hidden");
  nameBlock.classList.add("hidden");
  document
    .querySelectorAll(".card")
    .forEach((c) => c.classList.remove("selected"));
  state.selectedMap = null;
  playerNameInput.value = "";
  selectedMapLabel.textContent = "";
  if (typeof clearField === "function") clearField();
});

// Инициализация сердечек при загрузке
window.addEventListener("DOMContentLoaded", () => {
  const heartsContainer = $("hudLives");
  if (heartsContainer) {
    heartsContainer.innerHTML =
      '<span style="color:var(--accent);">&#10084;&#10084;&#10084;&#10084;&#10084;</span>';
  }
});
