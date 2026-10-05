const socket = io();

const nameInput = document.getElementById("name");
const createButton = document.getElementById("create-room");
const joinButton = document.getElementById("join-room");
const roomCodeInput = document.getElementById("room-code");

const lobby = document.getElementById("lobby");
const lobbyCode = document.getElementById("lobby-code");
const lobbyStatus = document.getElementById("lobby-status");
const playersList = document.getElementById("players");
const startButton = document.getElementById("start-game");

const game = document.getElementById("game");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorInput = document.getElementById("color");
const clearButton = document.getElementById("clear-canvas");
const fillButton = document.getElementById("fill-canvas");

const wordText = document.getElementById("draw-word");
const wordChoice = document.getElementById("word-choice");
const wordOptions = document.getElementById("word-options");
const nextWordButton = document.getElementById("next-word");
const timerText = document.getElementById("timer");

const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess");
const messages = document.getElementById("messages");

// Ұпайлар тізімі
let gamePlayers = document.getElementById("game-players");

if (!gamePlayers) {
  const heading = document.createElement("h2");
  heading.textContent = "Ойыншылар мен ұпайлар 🏆";

  gamePlayers = document.createElement("ul");
  gamePlayers.id = "game-players";

  game.prepend(heading, gamePlayers);
}

// Көшбасшы
let leaderText = document.getElementById("leader-text");

if (!leaderText) {
  leaderText = document.createElement("div");
  leaderText.id = "leader-text";
  gamePlayers.before(leaderText);
}

// Қорытынды
let gameResult = document.getElementById("game-result");

if (!gameResult) {
  gameResult = document.createElement("div");
  gameResult.id = "game-result";
  gameResult.hidden = true;
  lobby.prepend(gameResult);
}

// Қорытынды карточкасының стилі
Object.assign(gameResult.style, {
  marginBottom: "20px",
  padding: "20px",
  color: "#594018",
  background: "#fff1b8",
  border: "2px solid #e6cf79",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "800",
  lineHeight: "1.5",
  overflowWrap: "anywhere"
});

let turnId = 0;
let isDrawer = false;
let canDraw = false;
let drawing = false;
let lastCanvasSend = 0;
let latestCanvasUpdate = 0;

ctx.strokeStyle = colorInput.value;
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";

canvas.style.touchAction = "none";
nextWordButton.hidden = true;

function checkConnection() {
  if (socket.connected) return true;

  alert("Сервермен байланыс жоқ.");
  return false;
}

function stopDrawing() {
  drawing = false;
}

function clearCanvas() {
  latestCanvasUpdate++;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
}

function updateTools() {
  colorInput.disabled = !canDraw;
  clearButton.disabled = !canDraw;
  fillButton.disabled = !canDraw;
}

function addMessage(text, correct = false) {
  const message = document.createElement("p");
  message.textContent = text;

  if (correct) message.classList.add("correct");

  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

// Бөлме құру
createButton.addEventListener("click", () => {
  const name = nameInput.value.trim();

  if (!name) {
    alert("Алдымен атыңды жаз 😊");
    return;
  }

  if (checkConnection()) {
    socket.emit("create-room", { name });
  }
});

// Бөлмеге қосылу
joinButton.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const code = roomCodeInput.value.trim();

  if (!name || !code) {
    alert("Атыңды және бөлме кодын жаз.");
    return;
  }

  if (checkConnection()) {
    socket.emit("join-room", { name, code });
  }
});

// Лоббиге кіру
socket.on("room-entered", data => {
  isDrawer = false;
  canDraw = false;

  stopDrawing();
  clearCanvas();
  updateTools();

  lobby.hidden = false;
  game.hidden = true;
  lobbyCode.textContent = data.code;

  gameResult.hidden = true;
  startButton.textContent = "Ойынды бастау";

  messages.replaceChildren();
});

// Ұпайлар және көшбасшы
socket.on("players-updated", data => {
  playersList.replaceChildren();
  gamePlayers.replaceChildren();

  const sorted = [...data.players].sort(
    (a, b) => b.score - a.score
  );

  const topScore = sorted[0]?.score || 0;
  const leaders = sorted.filter(
    player => player.score === topScore
  );

  if (topScore === 0) {
    leaderText.textContent = "Кім мықты екен? Әлі көреміз 👀";
  } else if (leaders.length === 1) {
    leaderText.textContent =
      leaders[0].name + " — мына көтібөк ұтып жатыр 🏆";
  } else {
    leaderText.textContent =
      leaders.map(player => player.name).join(", ") +
      " — тең келе жатыр 🤝";
  }

  sorted.forEach(player => {
    const text =
      player.name +
      (player.id === data.hostId ? " 👑" : "") +
      (player.id === data.drawerId ? " 🎨" : "") +
      " — " + player.score + " ұпай";

    const lobbyItem = document.createElement("li");
    lobbyItem.textContent = text;
    playersList.appendChild(lobbyItem);

    const gameItem = document.createElement("li");
    gameItem.textContent = text;
    gamePlayers.appendChild(gameItem);
  });

  const isHost = socket.id === data.hostId;

  startButton.hidden = !isHost;
  startButton.disabled = data.players.length < 2;

  lobbyStatus.textContent = data.players.length < 2
    ? "Кемінде екі ойыншы қажет."
    : isHost
      ? "Ойыншылар жиналды!"
      : "Бөлме иесінің ойынды бастауын күт.";
});

// Бастау немесе қайта ойнау
startButton.addEventListener("click", () => {
  if (checkConnection()) {
    socket.emit("start-game");
  }
});

// Жаңа кезек
socket.on("turn-started", data => {
  turnId = data.turnId;
  isDrawer = socket.id === data.drawerId;
  canDraw = false;
  lastCanvasSend = 0;

  stopDrawing();
  clearCanvas();
  updateTools();

  gameResult.hidden = true;
  lobby.hidden = true;
  game.hidden = false;

  wordChoice.hidden = true;
  wordOptions.replaceChildren();
  nextWordButton.hidden = true;

  wordText.textContent = isDrawer
    ? "Сөз таңда"
    : "Құпия сөз";

  timerText.textContent = isDrawer
    ? "Сөз таңдауға 15 секунд берілді"
    : data.drawerName + " сөз таңдап жатыр…";

  addMessage(
    "🎨 Суретші: " + data.drawerName +
    " — кезегі " + data.drawerTurn + "/" + data.totalTurns
  );
});

// Сөздер тек суретшіге келеді
socket.on("word-options", data => {
  if (!isDrawer || data.turnId !== turnId) return;

  wordChoice.hidden = false;
  wordOptions.replaceChildren();

  data.words.forEach(word => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = word;

    button.addEventListener("click", () => {
      if (!checkConnection()) return;

      socket.emit("select-word", { turnId, word });
      wordChoice.hidden = true;
    });

    wordOptions.appendChild(button);
  });
});

socket.on("drawing-word", data => {
  if (isDrawer) {
    wordText.textContent = data.word;
  }
});

// Таймер басталды
socket.on("round-started", data => {
  wordChoice.hidden = true;
  canDraw = isDrawer;
  updateTools();

  timerText.textContent =
    "Қалған уақыт: " + data.seconds + " секунд";
});

socket.on("timer-update", data => {
  timerText.textContent =
    "Қалған уақыт: " + data.seconds + " секунд";
});

// Бір кезек аяқталды
socket.on("round-ended", data => {
  canDraw = false;
  stopDrawing();
  updateTools();

  wordText.textContent = data.word;
  timerText.textContent = "3 секундтан кейін кезек жалғасады!";
  addMessage("Жауабы: " + data.word);
});

// Бүкіл ойын аяқталды
socket.on("game-finished", data => {
  isDrawer = false;
  canDraw = false;

  stopDrawing();
  clearCanvas();
  updateTools();

  game.hidden = true;
  lobby.hidden = false;
  gameResult.hidden = false;

  if (data.score === 0) {
    gameResult.textContent =
      "Ойын аяқталды! Ешкім ұпай жинамады 😅";
  } else if (data.winners.length === 1) {
    gameResult.textContent =
      data.winners[0] +
      " — бүгінгі ең мықты көтібөк! 🏆 " +
      data.score + " ұпай";
  } else {
    gameResult.textContent =
      data.winners.join(", ") +
      " — бүгінгі жеңімпаздар! 🏆 Әрқайсысы " +
      data.score + " ұпай";
  }

  startButton.textContent = "Қайта ойнау 🔄";
});

// Координаттар
function getPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

// Суретті жіберу
function sendCanvas(force = false) {
  if (!canDraw || !socket.connected) return;

  const now = Date.now();

  if (!force && now - lastCanvasSend < 150) return;

  lastCanvasSend = now;

  socket.emit("canvas-update", {
    turnId,
    image: canvas.toDataURL("image/png")
  });
}

canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !canDraw) return;

  event.preventDefault();
  drawing = true;

  canvas.setPointerCapture(event.pointerId);

  const position = getPosition(event);

  ctx.beginPath();
  ctx.moveTo(position.x, position.y);
});

canvas.addEventListener("pointermove", event => {
  if (!drawing || !canDraw) return;

  const position = getPosition(event);

  ctx.lineTo(position.x, position.y);
  ctx.stroke();

  sendCanvas();
});

function finishDrawing() {
  if (drawing) sendCanvas(true);
  stopDrawing();
}

canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
canvas.addEventListener("lostpointercapture", finishDrawing);

colorInput.addEventListener("input", () => {
  ctx.strokeStyle = colorInput.value;
});

// Тазалау
clearButton.addEventListener("click", () => {
  if (!canDraw) return;

  stopDrawing();
  clearCanvas();
  sendCanvas(true);
});

// Фонды бояу
fillButton.addEventListener("click", () => {
  if (!canDraw) return;

  stopDrawing();

  ctx.fillStyle = colorInput.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  sendCanvas(true);
});

// Басқа ойыншының суреті
socket.on("canvas-update", data => {
  if (isDrawer || data.turnId !== turnId) return;

  const updateId = ++latestCanvasUpdate;
  const receivedTurn = data.turnId;
  const image = new Image();

  image.onload = () => {
    if (updateId !== latestCanvasUpdate) return;
    if (receivedTurn !== turnId) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.beginPath();
  };

  image.src = data.image;
});

// Чатқа жазу
guessForm.addEventListener("submit", event => {
  event.preventDefault();

  const answer = guessInput.value.trim();

  if (!answer || !checkConnection()) return;

  socket.emit("guess-message", answer);

  guessInput.value = "";
  guessInput.focus();
});

socket.on("chat-message", data => {
  addMessage(data.text, data.correct);
});

// Ойыншылар жетпесе
socket.on("game-stopped", () => {
  isDrawer = false;
  canDraw = false;

  stopDrawing();
  clearCanvas();
  updateTools();

  game.hidden = true;
  lobby.hidden = false;
  gameResult.hidden = true;

  startButton.textContent = "Ойынды бастау";

  alert("Ойын тоқтады. Кемінде екі ойыншы қажет.");
});

// Байланыс үзілсе
socket.on("disconnect", () => {
  isDrawer = false;
  canDraw = false;

  stopDrawing();
  clearCanvas();
  updateTools();

  game.hidden = true;
  lobby.hidden = true;
  gameResult.hidden = true;

  alert("Байланыс үзілді. Қайта қосылған соң бөлмеге қайта кір.");
});

socket.on("room-error", message => {
  alert(message);
});

updateTools();