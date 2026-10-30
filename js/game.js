// утилиты
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

// старт
function startGame(name) {
  state.playerName = name;
  state.lives = 5;
  state.hits = { monsters: 0, traps: 0 };
  state.reachedGoal = false;
  state.elapsedMs = 0;
  state.paused = false;
  state.running = true;

  state.playerPos = { x: 0, y: 0 };
  playerEl.style.left = "0px";
  playerEl.style.top = "0px";

  clearField();

  mapImage.src = state.selectedMap.img;
  mapImage.style.display = "block";
  mapImage.onerror = () => {
    mapImage.style.display = "none";
  };

  if (state.selectedMap.id === "desert")
    gameContainer.style.background = "#e4c97e";
  else if (state.selectedMap.id === "swamp")
    gameContainer.style.background = "#4a3b5c";
  else gameContainer.style.background = "#9fb89a";

  $("hudName").textContent = name;
  $("hudHits").textContent = "0 / 0";
  updateLivesHud();

  mapSelectScreen.classList.add("hidden");
  resultsScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  overlay.classList.add("hidden");

  state.lastFrame = 0;
  startSpawner();
  state.rafId = requestAnimationFrame(gameLoop);
  showToast(`Беги к правому краю! Ищи полосатую зону ВЫХОДА.`, 3000);
}

// игровой цикл
function gameLoop(now) {
  if (!state.running) return;
  if (state.paused) {
    state.lastFrame = now;
    state.rafId = requestAnimationFrame(gameLoop);
    return;
  }
  if (state.lastFrame === 0) {
    state.lastFrame = now;
    state.rafId = requestAnimationFrame(gameLoop);
    return;
  }

  let dt = now - state.lastFrame;
  if (dt > 40) dt = 40;

  state.lastFrame = now;
  state.elapsedMs += dt;
  $("hudElapsed").textContent = formatElapsed(state.elapsedMs);

  let dx = 0,
    dy = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.keys.has("ф"))
    dx -= 1;
  if (
    state.keys.has("ArrowRight") ||
    state.keys.has("d") ||
    state.keys.has("в")
  )
    dx += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("w") || state.keys.has("ц"))
    dy -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("s") || state.keys.has("ы"))
    dy += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    let step = state.moveSpeed * (dt / 16.67);
    if (step > 10) step = 10;

    state.playerPos.x += (dx / len) * step;
    state.playerPos.y += (dy / len) * step;
    state.playerPos.x = clamp(
      state.playerPos.x,
      0,
      gameContainer.clientWidth - playerEl.clientWidth,
    );
    state.playerPos.y = clamp(
      state.playerPos.y,
      0,
      gameContainer.clientHeight - playerEl.clientHeight,
    );

    playerEl.style.left = state.playerPos.x + "px";
    playerEl.style.top = state.playerPos.y + "px";
  }

  const goalX = gameContainer.clientWidth - playerEl.clientWidth - 10;
  if (!state.reachedGoal && state.playerPos.x >= goalX) {
    state.reachedGoal = true;
    endGame(true);
    return;
  }
  state.rafId = requestAnimationFrame(gameLoop);
}

// монстры
function startSpawner() {
  clearInterval(state.monsterTimer);
  spawnWave();
  state.monsterTimer = setInterval(() => {
    if (!state.running || state.paused || state.reachedGoal) return;
    spawnWave();
  }, state.selectedMap.spawnRate);

  clearInterval(state.healTimer);
  if (state.selectedMap.hasHeal) {
    state.healTimer = setInterval(() => {
      if (!state.running || state.paused || state.reachedGoal) return;
      spawnHeal();
    }, 7000);
  }
}

function spawnWave() {
  for (let i = 0; i < state.selectedMap.spawnCount; i++) spawnMonster();
  for (let j = 0; j < state.selectedMap.trapCount; j++) spawnTrap();
}

function spawnMonster() {
  if (!state.running) return;
  const el = document.createElement("div");
  el.className = "monster";
  if (state.selectedMap.speedMult > 1.2) el.classList.add("fast");

  const w = gameContainer.clientWidth,
    h = gameContainer.clientHeight;
  const pos = {
    x: rand(0, Math.max(0, w - 22)),
    y: rand(0, Math.max(0, h - 22)),
  };
  if (Math.hypot(pos.x - state.playerPos.x, pos.y - state.playerPos.y) < 90) {
    pos.x = clamp(pos.x + (pos.x < state.playerPos.x ? -100 : 100), 0, w - 22);
  }

  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";
  gameContainer.appendChild(el);

  const angle = rand(0, Math.PI * 2);
  const speed = rand(0.9, 1.8) * state.selectedMap.speedMult;
  const m = {
    el,
    x: pos.x,
    y: pos.y,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    alive: true,
  };
  state.monsters.push(m);
  animateMonster(m);
}

function animateMonster(m) {
  if (!m.alive || !state.running) return;
  if (!state.paused) {
    if (state.selectedMap.id === "swamp") {
      // Преследование
      const dx = state.playerPos.x - m.x,
        dy = state.playerPos.y - m.y;
      const dist = Math.hypot(dx, dy) || 1;
      m.dx += (dx / dist) * 0.02;
      m.dy += (dy / dist) * 0.02;
      const currentSpeed = Math.hypot(m.dx, m.dy);
      const maxSpeed = 2.5 * state.selectedMap.speedMult;
      if (currentSpeed > maxSpeed) {
        m.dx = (m.dx / currentSpeed) * maxSpeed;
        m.dy = (m.dy / currentSpeed) * maxSpeed;
      }
    }
    m.x += m.dx;
    m.y += m.dy;

    const w = gameContainer.clientWidth,
      h = gameContainer.clientHeight;
    if (m.x < -30 || m.x > w + 30 || m.y < -30 || m.y > h + 30) {
      m.alive = false;
      m.el.remove();
      state.monsters = state.monsters.filter((x) => x !== m);
      return;
    }
    m.el.style.left = m.x + "px";
    m.el.style.top = m.y + "px";

    if (checkCollision(playerEl, m.el)) {
      m.alive = false;
      m.el.remove();
      state.monsters = state.monsters.filter((x) => x !== m);
      onHit("monster");
      return;
    }
  }
  requestAnimationFrame(() => animateMonster(m));
}

function spawnTrap() {
  if (!state.running) return;
  const el = document.createElement("div");
  el.className = "trap";

  const w = gameContainer.clientWidth,
    h = gameContainer.clientHeight;
  let pos = {
    x: rand(0, Math.max(0, w - 44)),
    y: rand(0, Math.max(0, h - 44)),
  };
  if (Math.hypot(pos.x - state.playerPos.x, pos.y - state.playerPos.y) < 80) {
    pos.x = clamp(pos.x + (pos.x < state.playerPos.x ? -90 : 90), 0, w - 44);
  }
  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";
  gameContainer.appendChild(el);

  const t = { el, alive: true };
  state.traps.push(t);
  if (checkCollision(playerEl, el)) {
    t.alive = false;
    el.remove();
    state.traps = state.traps.filter((x) => x !== t);
    onHit("trap");
  }
}

function spawnHeal() {
  if (!state.running) return;
  const el = document.createElement("div");
  el.className = "heal";
  el.innerHTML = "+";

  const w = gameContainer.clientWidth,
    h = gameContainer.clientHeight;
  const pos = {
    x: rand(0, Math.max(0, w - 24)),
    y: rand(0, Math.max(0, h - 24)),
  };
  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";
  gameContainer.appendChild(el);

  const hp = { el, x: pos.x, y: pos.y, alive: true };
  state.monsters.push(hp);
  animateHeal(hp);
}

function animateHeal(hp) {
  if (!hp.alive || !state.running) return;
  if (!state.paused && checkCollision(playerEl, hp.el)) {
    hp.alive = false;
    hp.el.remove();
    state.monsters = state.monsters.filter((x) => x !== hp);
    if (state.lives < 5) {
      state.lives++;
      updateLivesHud();
      showToast("Аптечка! +1 ♥", 1000);
    } else {
      showToast("Жизни полны!", 1000);
    }
    return;
  }
  if (hp.alive) requestAnimationFrame(() => animateHeal(hp));
}

// взаимодействия
function checkCollision(a, b) {
  const r1 = a.getBoundingClientRect(),
    r2 = b.getBoundingClientRect();
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function onHit(type) {
  if (!state.running || state.paused || state.reachedGoal) return;
  state.lives--;
  if (type === "monster") state.hits.monsters++;
  else state.hits.traps++;

  updateLivesHud();
  $("hudHits").textContent = `${state.hits.monsters} / ${state.hits.traps}`;
  gameContainer.animate(
    [{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }],
    { duration: 180 },
  );
  showToast(type === "monster" ? "Монстр! -1 ♥" : "Ловушка! -1 ♥", 900);
  if (state.lives <= 0) endGame(false);
}

function updateLivesHud() {
  let html = "";
  for (let i = 0; i < 5; i++) {
    html +=
      i < state.lives
        ? '<span style="color:var(--accent);">&#10084;</span>'
        : '<span style="color:#ccc; opacity:0.5;">&#9825;</span>';
  }
  $("hudLives").innerHTML = html;
}

// управление
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.running && !state.reachedGoal) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  if (
    state.running &&
    !state.paused &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
  )
    e.preventDefault();
  state.keys.add(e.key);
});
document.addEventListener("keyup", (e) => state.keys.delete(e.key));

function togglePause() {
  state.paused = !state.paused;
  if (state.paused) {
    overlay.classList.remove("hidden");
    overlayBtn.onclick = () => togglePause();
  } else {
    overlay.classList.add("hidden");
    state.lastFrame = performance.now();
  }
}

// конец и очистка
function endGame(win) {
  state.running = false;
  clearInterval(state.monsterTimer);
  clearInterval(state.healTimer);
  if (state.rafId) cancelAnimationFrame(state.rafId);

  state.monsters.forEach((m) => m.el.remove());
  state.traps.forEach((t) => t.el.remove());
  state.monsters = [];
  state.traps = [];

  overlay.classList.add("hidden");
  gameScreen.classList.add("hidden");

  showResults(win); // Вызов функции из ui.js
}

function clearField() {
  gameContainer
    .querySelectorAll(".monster, .trap, .heal")
    .forEach((el) => el.remove());
  state.monsters = [];
  state.traps = [];
}
