import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import db from "./models/database.js";
import settings from "./models/settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

/* =======================
   KONFIGURACJA
======================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(morgan("dev"));

/* =======================
   SETTINGS / THEME
======================= */

app.use("/settings/toggle-theme", settings.themeToggle);

function settingsLocals(req, res, next) {
  res.locals.app = settings.getSettings(req);
  res.locals.page = req.originalUrl;
  next();
}
app.use(settingsLocals);



/* Lista artykułów */
app.get("/", (req, res) => {
  const articles = db.getArticles();

  res.render("list", {
    title: "Artykuły",
    articles,
    last_viewed_articles: null,
  });
});


app.get("/articles/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.sendStatus(400);

  const article = db.getArticle(id);
  if (!article) return res.sendStatus(404);

  res.render("article", {
    title: article.title,
    article,
  });
});


app.post("/articles/:id/comments", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.sendStatus(400);

  const { name, text } = req.body;

  if (name && text) {
    db.addComment(id, name, text);
  }

  res.redirect(`/articles/${id}`);
});


app.post("/comments/:commentId/edit", (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  const { name, text, articleId } = req.body;

  if (!isNaN(commentId) && name && text) {
    db.updateComment(commentId, name, text);
  }

  res.redirect(`/articles/${articleId}`);
});


app.post("/comments/:commentId/delete", (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  const { articleId } = req.body;

  if (!isNaN(commentId)) {
    db.deleteComment(commentId);
  }

  res.redirect(`/articles/${articleId}`);
});



app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});