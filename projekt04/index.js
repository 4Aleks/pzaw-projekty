import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import session from "express-session";
import db from "./models/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8000;

// CIASTECZKA
const SECRET = process.env.SECRET || "64_znakowy_domyslny_sekret_do_podpisywania_ciasteczek";
const LAST_VIEWED_COOKIE = "__Host-last-viewed";
const THEME_COOKIE = "blog-theme";

app.set("view engine", "ejs");
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


app.use(cookieParser(SECRET));

// SESJE
app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const validate = (val, min) => val && typeof val === 'string' && val.trim().length >= min;

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.app = { theme: req.cookies[THEME_COOKIE] || "light" };
  res.locals.page = req.originalUrl;
  next();
});

// MOTYW
app.get("/settings/toggle-theme", (req, res) => {
  const currentTheme = req.cookies[THEME_COOKIE] || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  res.cookie(THEME_COOKIE, newTheme, { maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.redirect(req.query.next || "/");
});

// LOGOWANIE I REJESTRACJA
app.get("/login", (req, res) => res.render("login", { title: "Logowanie" }));
app.post("/login", async (req, res) => {
  const user = await db.verifyUser(req.body.username, req.body.password);
  if (user) {
    req.session.user = { id: user.user_id, username: user.username, role: user.role };
    res.redirect("/");
  } else res.status(401).send("Błędny login lub hasło.");
});

app.get("/register", (req, res) => res.render("register", { title: "Rejestracja" }));
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!validate(username, 3) || !validate(password, 6)) return res.status(400).send("Za krótki login (3) lub hasło (6).");
  try {
    await db.registerUser(username.trim(), password);
    res.redirect("/login");
  } catch (e) { res.status(400).send("Login zajęty."); }
});

app.get("/logout", (req, res) => { req.session.destroy(); res.redirect("/"); });

//ARTYKUŁY
app.get("/", (req, res) => {
  let last_viewed_clubs = null;
  const last_viewed_ids = req.signedCookies[LAST_VIEWED_COOKIE];
  if (Array.isArray(last_viewed_ids)) {
    last_viewed_clubs = last_viewed_ids.map(id => db.getArticle(id)).filter(c => c !== null);
  }
  res.render("list", { title: "Blog Piłkarski", articles: db.getArticles(), last_viewed_clubs });
});

app.post("/articles", (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).send("Tylko Admin");
  const { title, content } = req.body;
  if (validate(title, 3) && validate(content, 10)) db.addArticle(title.trim(), content.trim());
  res.redirect("/");
});

app.get("/articles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const article = db.getArticle(id);
  if (!article) return res.sendStatus(404);

  // CIASTECZKA
  let last_viewed = req.signedCookies[LAST_VIEWED_COOKIE] || [];
  if (!Array.isArray(last_viewed)) last_viewed = [];
  last_viewed = [id, ...last_viewed.filter(x => x !== id)].slice(0, 3);
  res.cookie(LAST_VIEWED_COOKIE, last_viewed, { httpOnly: true, secure: true, maxAge: 7*24*60*60*1000, signed: true });

  res.render("article", { title: article.title, article });
});

app.post("/articles/:id/edit", (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).send("Tylko Admin.");
  const { title, content } = req.body;
  if (validate(title, 3) && validate(content, 10)) db.updateArticle(req.params.id, title.trim(), content.trim());
  res.redirect(`/articles/${req.params.id}`);
});

//KOMENTARZE
app.post("/articles/:id/comments", (req, res) => {
  if (!req.session.user) return res.status(403).send("Zaloguj się.");
  const { text } = req.body;
  if (validate(text, 2)) db.addComment(req.params.id, req.session.user.id, req.session.user.username, text.trim());
  res.redirect(`/articles/${req.params.id}`);
});

app.post("/comments/:cId/delete", (req, res) => {
  const owner = db.getCommentOwner(req.params.cId);
  if (req.session.user?.role === 'admin' || req.session.user?.id === owner?.user_id) db.deleteComment(req.params.cId);
  res.redirect(`/articles/${req.body.articleId}`);
});

app.listen(PORT, () => console.log(`Serwer: http://localhost:${PORT}`));