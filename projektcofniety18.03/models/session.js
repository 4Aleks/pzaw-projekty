import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path, { readBigInts: true });
const SESSION_COOKIE = "__Host-fisz-id";
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

// Tworzymy tabelę sesji w bazie danych
db.exec(`
  CREATE TABLE IF NOT EXISTS fc_session (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER,
    created_at      INTEGER
  ) STRICT;
`);

// Przygotowane zapytania SQL
const db_ops = {
  create_session: db.prepare(
    `INSERT INTO fc_session (id, user_id, created_at)
            VALUES (?, ?, ?) RETURNING id, user_id, created_at;`
  ),
  get_session: db.prepare(
    "SELECT id, user_id, created_at from fc_session WHERE id = ?;"
  ),
  // DODANE: Zapytanie do usuwania sesji po ID
  delete_session: db.prepare(
    "DELETE FROM fc_session WHERE id = ?;"
  ),
};

function createSession(user, res) {
  let sessionId = randomBytes(8).readBigInt64BE();
  let createdAt = Date.now();
  
  let session = db_ops.create_session.get(sessionId, user, createdAt);
  
  res.locals.session = session;
  res.cookie(SESSION_COOKIE, session.id.toString(), {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: true, // Wymaga HTTPS lub localhost
  });
  
  return session;
}

function sessionHandler(req, res, next) {
  let sessionId = req.cookies[SESSION_COOKIE];
  let session = null;
  
  if (sessionId != null) {
    if (!sessionId.match(/^-?[0-9]+$/)) {
      // Invalid session id
      sessionId = null;
    } else {
      sessionId = BigInt(sessionId);
    }
  }
  
  // sessionId may look valid but might not exist in db
  if (sessionId != null) {
    session = db_ops.get_session.get(sessionId);
  }
    
  if (session != null) {
    res.locals.session = session;
    res.cookie(SESSION_COOKIE, res.locals.session.id.toString(), {
      maxAge: ONE_WEEK,
      httpOnly: true,
      secure: true,
    });
  } else {
    session = createSession(null, res);
  }
  
  setImmediate(printUserSession);
  next();

  function printUserSession() {
    console.info(
      "Session:",
      session.id,
      "user:",
      session.user_id, // Używam user_id zgodnie z kolumną w bazie
      "created at:",
      new Date(Number(session.created_at)).toISOString()
    );
  }
}

// DODANE: Funkcja do niszczenia sesji przy wylogowywaniu
export function deleteSession(res) {
  // Jeśli użytkownik ma przypisaną sesję
  if (res.locals.session && res.locals.session.id) {
    // 1. Usuwamy wpis z bazy SQLite
    db_ops.delete_session.run(res.locals.session.id);
    
    // 2. Czyścimy ciasteczko w przeglądarce
    res.clearCookie(SESSION_COOKIE);
    
    // 3. Usuwamy obiekt sesji z aktualnego żądania
    res.locals.session = null;
  }
}

export default {
  createSession,
  sessionHandler,
  deleteSession, // DODANE DO EKSPORTU
};