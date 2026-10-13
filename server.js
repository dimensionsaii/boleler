const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

const MAX_PLAYERS = 30;
const TURNS_PER_PLAYER = 7;

const words = [
  // Қазақша вайб 🇰🇿
  "Домбыра", "Бауырсақ", "Киіз үй", "Қымыз",
  "Шаңырақ", "Қамшы", "Асық", "Тақия",
  "Бесік", "Қазан", "Түйе", "Қобыз",
  "Наурыз", "Бүркіт", "Құрт", "Дастарқан",

  // Жануарлар 🐾
  "Мысық", "Ит", "Қоян", "Кірпі",
  "Піл", "Керік", "Маймыл", "Тасбақа",
  "Қолтырауын", "Акула", "Пингвин", "Жарқанат",
  "Көбелек", "Ұлу", "Сегізаяқ", "Динозавр",

  // Тамақ 🍕
  "Балмұздақ", "Пицца", "Бургер", "Суши",
  "Қарбыз", "Банан", "Ананас", "Шие",
  "Торт", "Жұмыртқа", "Кеспе", "Попкорн",
  "Шоколад", "Сәбіз", "Құлпынай", "Картоп",

  // Заттар 🎒
  "Қолшатыр", "Телефон", "Құлаққап", "Айна",
  "Көзілдірік", "Шәйнек", "Шаңсорғыш", "Тоңазытқыш",
  "Оятқыш", "Тіс щеткасы", "Қайшы", "Шам",
  "Рюкзак", "Тәж", "Гитара", "Кілт",

  // Көлік пен орындар 🚀
  "Ұшақ", "Велосипед", "Тікұшақ", "Зымыран",
  "Кеме", "Пойыз", "Жедел жәрдем", "Трактор",
  "Мектеп", "Аурухана", "Жағажай", "Қамал",
  "Көпір", "Ғарыш", "Ай", "Жанартау",

  // Әрекеттер 💃
  "Би билеу", "Ұйықтау", "Жылау", "Күлу",
  "Балық аулау", "Сурет салу", "Тамақ пісіру",
  "Жүгіру", "Суға секіру", "Ән айту",
  "Селфи түсіру", "Қар лақтыру",

  // Күлкілі тапсырмалар 😂
  "Ұшатын мысық",
  "Билейтін банан",
  "Көзілдірікті түйе",
  "Ұйықтап жатқан робот",
  "Пицца жеген динозавр",
  "Тәж киген бақа",
  "Телефон ұстаған маймыл",
  "Жылаған пияз",
  "Велосипед тепкен аю",
  "Ғарыштағы бауырсақ",
  "Домбыра тартқан мысық",
  "Қолшатыр ұстаған пингвин",
  "Таксиге жүгірген студент", "Бауырсақ жеген мысық", "Ұйықтап қалған мұғалім",
  "Домбыра тартқан робот", "Скейтборд тепкен түйе", "Билейтін қияр",
  "Балмұздақ жеген аю", "Ғарыштағы киіз үй", "Кітап оқыған бақа",
  "Селфи түсірген пингвин", "Торт пісірген айдаһар", "Қымыз ішкен динозавр",
  "Автобус күткен мысық", "Қардағы пальма", "Ұшатын шәйнек",
  "Емтихан", "Жатақхана", "Студент", "Кітапхана", "Диплом", "Стипендия",
  "Ноутбук", "Пернетақта", "Тінтуір", "Қуаттағыш", "Камера", "Микрофон",
  "Аққу", "Түлкі", "Қасқыр", "Бақа", "Арыстан", "Жолбарыс", "Аю", "Елік",
  "Бүркітші", "Алтыбақан", "Көкпар", "Тұсаукесер", "Сәукеле", "Жетіген",
  "Бешбармақ", "Самса", "Манты", "Палау", "Шұбат", "Ірімшік", "Күріш",
  "Кемпірқосақ", "Найзағай", "Аққала", "Сарқырама", "Шөл", "Орман",
  "Коньки", "Шаңғы", "Футбол", "Баскетбол", "Шахмат", "Бокс", "Теннис",
  "Суперқаһарман", "Сиқыршы", "Су перісі", "Қарақшы", "Робот", "Айдаһар",
  "Пойыздағы піл", "Тақия киген панда", "Жүгіруші тасбақа", "Әнші картоп",
  "Күнге күйген аққала", "Жаңбырдағы динозавр", "Балық ұстаған робот"
];

// Сайт файлдары
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "script.js"));
});

app.get("/boleler-bg.png", (req, res) => {
  res.sendFile(path.join(__dirname, "boleler-bg.png"));
});

// Жауаптарды салыстыру
function normalize(text) {
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Бір әріптік қатені анықтау
function isCloseAnswer(answer, word) {
  const a = [...normalize(answer)];
  const b = [...normalize(word)];

  if (b.length < 4 || Math.abs(a.length - b.length) > 1) {
    return false;
  }

  let i = 0;
  let j = 0;
  let mistakes = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }

    mistakes++;
    if (mistakes > 1) return false;

    if (a.length > b.length) {
      i++;
    } else if (b.length > a.length) {
      j++;
    } else {
      i++;
      j++;
    }
  }

  if (i < a.length || j < b.length) mistakes++;

  return mistakes === 1;
}

// Ойыншылар тізімі
function sendPlayers(code) {
  const room = rooms.get(code);
  if (!room) return;

  io.to(code).emit("players-updated", {
    players: room.players,
    hostId: room.hostId,
    drawerId: room.drawerId
  });
}

function clearTimers(room) {
  clearTimeout(room.timeout);
  clearInterval(room.ticker);
}

// Ойыншылар азайса, лоббиге қайтару
function stopGame(code) {
  const room = rooms.get(code);
  if (!room) return;

  clearTimers(room);

  room.started = false;
  room.phase = "lobby";
  room.drawerId = null;
  room.word = "";
  room.options = [];

  io.to(code).emit("game-stopped");
  sendPlayers(code);
}

// Ойын қорытындысы
function finishGame(code) {
  const room = rooms.get(code);
  if (!room) return;

  clearTimers(room);

  room.started = false;
  room.phase = "lobby";
  room.drawerId = null;
  room.word = "";
  room.options = [];

  const topScore = Math.max(
    ...room.players.map(player => player.score)
  );

  const winners = room.players
    .filter(player => player.score === topScore)
    .map(player => player.name);

  io.to(code).emit("game-finished", {
    winners,
    score: topScore
  });

  sendPlayers(code);
}

// Келесі суретші
function nextTurn(code) {
  const room = rooms.get(code);
  if (!room || !room.started) return;

  if (room.players.length < 2) {
    stopGame(code);
    return;
  }

  const currentIndex = room.players.findIndex(
    player => player.id === room.drawerId
  );

  const startIndex = currentIndex === -1
    ? room.nextIndex % room.players.length
    : (currentIndex + 1) % room.players.length;

  for (let offset = 0; offset < room.players.length; offset++) {
    const index = (startIndex + offset) % room.players.length;
    const player = room.players[index];

    if (player.turns < TURNS_PER_PLAYER) {
      beginTurn(code, player.id);
      return;
    }
  }

  finishGame(code);
}

// Бір кезекті аяқтау
function finishTurn(code) {
  const room = rooms.get(code);
  if (!room || room.phase !== "drawing") return;

  clearTimers(room);
  room.phase = "results";

  io.to(code).emit("round-ended", {
    word: room.word
  });

  room.timeout = setTimeout(() => nextTurn(code), 3000);
}

// Жаңа кезек
function beginTurn(code, drawerId) {
  const room = rooms.get(code);
  if (!room || !room.started) return;

  const drawer = room.players.find(
    player => player.id === drawerId
  );

  if (!drawer) return;

  clearTimers(room);

  room.drawerId = drawerId;
  room.phase = "choosing";
  room.guessed.clear();
  room.word = "";
  room.turnId++;

  drawer.turns++;

  const available = words.filter(
    word => word !== room.lastWord
  );

  room.options = [];

  while (room.options.length < 3 && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    room.options.push(available.splice(index, 1)[0]);
  }

  io.to(code).emit("turn-started", {
    turnId: room.turnId,
    drawerId,
    drawerName: drawer.name,
    drawerTurn: drawer.turns,
    totalTurns: TURNS_PER_PLAYER
  });

  io.to(drawerId).emit("word-options", {
    turnId: room.turnId,
    words: room.options
  });

  sendPlayers(code);

  // Таңдамаса, 15 секундтан кейін автоматты таңдау
  room.timeout = setTimeout(() => {
    if (room.phase === "choosing") {
      selectWord(code, room.options[0]);
    }
  }, 15000);
}

// Сөзді бекітіп, таймерді қосу
function selectWord(code, word) {
  const room = rooms.get(code);

  if (!room || room.phase !== "choosing") return;
  if (!room.options.includes(word)) return;

  clearTimers(room);

  room.word = word;
  room.lastWord = word;
  room.phase = "drawing";
  room.endsAt = Date.now() + 60000;

  io.to(room.drawerId).emit("drawing-word", { word });
  io.to(code).emit("round-started", { seconds: 60 });

  room.ticker = setInterval(() => {
    const seconds = Math.max(
      0,
      Math.ceil((room.endsAt - Date.now()) / 1000)
    );

    io.to(code).emit("timer-update", { seconds });

    if (seconds === 0) finishTurn(code);
  }, 1000);

  room.timeout = setTimeout(() => finishTurn(code), 60000);
}

// Ойыншы қосылғанда
io.on("connection", socket => {
  function leaveRoom() {
    const code = socket.data.roomCode;
    if (!code) return;

    socket.leave(code);
    delete socket.data.roomCode;

    const room = rooms.get(code);
    if (!room) return;

    const index = room.players.findIndex(
      player => player.id === socket.id
    );

    const wasDrawer = room.drawerId === socket.id;

    room.players = room.players.filter(
      player => player.id !== socket.id
    );

    room.guessed.delete(socket.id);

    if (room.players.length === 0) {
      clearTimers(room);
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    if (room.started && room.players.length < 2) {
      stopGame(code);
      return;
    }

    if (room.started && wasDrawer) {
      room.nextIndex = Math.max(0, index);
      nextTurn(code);
      return;
    }

    sendPlayers(code);

    if (
      room.phase === "drawing" &&
      room.players.every(player =>
        player.id === room.drawerId ||
        room.guessed.has(player.id)
      )
    ) {
      finishTurn(code);
    }
  }

  // Бөлме құру
  socket.on("create-room", data => {
    const name = String(data?.name || "").trim().slice(0, 24);

    if (!name) {
      socket.emit("room-error", "Атыңды жаз.");
      return;
    }

    leaveRoom();

    let code;

    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (rooms.has(code));

    rooms.set(code, {
      hostId: socket.id,
      drawerId: null,
      players: [{
        id: socket.id,
        name,
        score: 0,
        turns: 0
      }],
      started: false,
      phase: "lobby",
      word: "",
      lastWord: "",
      options: [],
      guessed: new Set(),
      turnId: 0,
      nextIndex: 0,
      timeout: null,
      ticker: null
    });

    socket.join(code);
    socket.data.roomCode = code;

    socket.emit("room-entered", { code });
    sendPlayers(code);
  });

  // Бөлмеге қосылу
  socket.on("join-room", data => {
    const name = String(data?.name || "").trim().slice(0, 24);
    const code = String(data?.code || "").trim();
    const room = rooms.get(code);

    if (!name) {
      socket.emit("room-error", "Атыңды жаз.");
      return;
    }

    if (!room) {
      socket.emit("room-error", "Бөлме табылмады.");
      return;
    }

    if (socket.data.roomCode === code) return;

    if (room.started) {
      socket.emit("room-error", "Ойын басталып кетті.");
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit(
        "room-error",
        "Бөлме толы: ең көбі " + MAX_PLAYERS + " ойыншы."
      );
      return;
    }

    leaveRoom();

    room.players.push({
      id: socket.id,
      name,
      score: 0,
      turns: 0
    });

    socket.join(code);
    socket.data.roomCode = code;

    socket.emit("room-entered", { code });
    sendPlayers(code);
  });

  // Ойынды бастау немесе қайта ойнау
  socket.on("start-game", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room || room.started) return;

    if (room.hostId !== socket.id) {
      socket.emit("room-error", "Ойынды бөлме иесі бастайды.");
      return;
    }

    if (room.players.length < 2) {
      socket.emit("room-error", "Кемінде екі ойыншы қажет.");
      return;
    }

    room.players.forEach(player => {
      player.score = 0;
      player.turns = 0;
    });

    room.lastWord = "";
    room.started = true;

    beginTurn(code, room.hostId);
  });

  // Сөз таңдау
  socket.on("select-word", data => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room || !room.started) return;
    if (room.drawerId !== socket.id) return;
    if (data?.turnId !== room.turnId) return;

    selectWord(code, data?.word);
  });

  // Only the active drawer may send small, validated drawing commands.
  function drawingRoom(data) {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.phase !== "drawing" || Date.now() >= room.endsAt ||
        room.drawerId !== socket.id || data?.turnId !== room.turnId) return null;
    return { code, room };
  }

  socket.on("draw-segments", data => {
    const target = drawingRoom(data);
    if (!target || !Array.isArray(data.segments) ||
        data.segments.length < 1 || data.segments.length > 64) return;
    const valid = data.segments.every(s => s &&
      [s.x0, s.y0, s.x1, s.y1].every(n => Number.isFinite(n) && n >= 0 && n <= 1) &&
      Number.isFinite(s.width) && s.width >= 1 && s.width <= 24 &&
      typeof s.color === "string" && /^#[0-9a-f]{6}$/i.test(s.color));
    if (!valid) return;
    const segments = data.segments.map(({x0,y0,x1,y1,color,width}) => ({x0,y0,x1,y1,color,width}));
    socket.to(target.code).emit("draw-segments", {turnId: target.room.turnId, segments});
  });

  socket.on("board-action", data => {
    const target = drawingRoom(data);
    if (!target || !["clear", "fill"].includes(data.action)) return;
    if (data.action === "fill" && (typeof data.color !== "string" || !/^#[0-9a-f]{6}$/i.test(data.color))) return;
    socket.to(target.code).emit("board-action", {
      turnId: target.room.turnId, action: data.action,
      ...(data.action === "fill" ? {color: data.color} : {})
    });
  });

  // Чат және жауаптар
  socket.on("guess-message", text => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room || !room.started || typeof text !== "string") return;

    const answer = text.trim().slice(0, 100);

    const player = room.players.find(
      player => player.id === socket.id
    );

    if (!answer || !player) return;

    const matchesWord =
      room.word !== "" &&
      normalize(answer) === normalize(room.word);

    if (matchesWord) {
      if (
        room.phase !== "drawing" ||
        Date.now() >= room.endsAt
      ) {
        socket.emit("room-error", "Бұл кезектің уақыты бітті.");
        return;
      }

      if (socket.id === room.drawerId) {
        socket.emit("room-error", "Суретші өз сөзін жаза алмайды 😊");
        return;
      }

      if (room.guessed.has(socket.id)) {
        socket.emit("room-error", "Бұл сөзді таптың! 🎉");
        return;
      }

      room.guessed.add(socket.id);
      player.score += 100;

      const drawer = room.players.find(
        player => player.id === room.drawerId
      );

      if (drawer) drawer.score += 50;

      io.to(code).emit("chat-message", {
        text: player.name + ": Дұрыс, көтібөк! 🎉",
        correct: true
      });

      sendPlayers(code);

      const everyoneGuessed = room.players.every(player =>
        player.id === room.drawerId ||
        room.guessed.has(player.id)
      );

      if (everyoneGuessed) finishTurn(code);
    } else {
      io.to(code).emit("chat-message", {
        text: player.name + ": " + answer,
        correct: false
      });

      if (
        room.phase === "drawing" &&
        Date.now() < room.endsAt &&
        socket.id !== room.drawerId &&
        !room.guessed.has(socket.id) &&
        isCloseAnswer(answer, room.word)
      ) {
        socket.emit("chat-message", {
          text: "Сәл қалды, көтібөк! 👀",
          correct: false
        });
      }
    }
  });

  socket.on("disconnect", leaveRoom);
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log("Ойын дайын: http://localhost:" + port);
});