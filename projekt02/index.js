import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import db from "./models/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  const articles = db.getArticles();
  res.render("list", { articles });
});

app.get("/articles/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const article = db.getArticle(id);
  if (!article) return res.status(404).send("Nie znaleziono artykułu");
  res.render("article", { article, comments: article.comments });
});

app.post("/articles/:id/comments", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, text } = req.body;
  if (name && text) db.addComment(id, name, text);
  res.redirect(`/articles/${id}`);
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
