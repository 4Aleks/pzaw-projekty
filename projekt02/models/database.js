import { DatabaseSync } from "node:sqlite";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    article_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS comments (
    comment_id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    text TEXT NOT NULL
  ) STRICT;
`);

const db_ops = {
  insert_article: db.prepare(`
    INSERT INTO articles (title, content)
    VALUES (?, ?) RETURNING article_id, title, content;
  `),
  get_articles: db.prepare("SELECT article_id, title FROM articles;"),
  get_article: db.prepare("SELECT article_id, title, content FROM articles WHERE article_id = ?;"),
  insert_comment: db.prepare(`
    INSERT INTO comments (article_id, name, text)
    VALUES (?, ?, ?) RETURNING comment_id, name, text;
  `),
  get_comments: db.prepare(`
    SELECT name, text FROM comments WHERE article_id = ? ORDER BY comment_id DESC;
  `)
};

const sample_articles = [
  {
    title: "FC Barcelona",
    content:
      "FC Barcelona to najlepszy klub."
  },
  {
    title: "Liverpool",
    content:
      "Liverpoolto jest super."
  },
  {
    title: "Real Madrid",
    content:
      "Real Madrid to ..."
  }
];


const existing = db_ops.get_articles.all();
if (existing.length === 0) {
  for (const art of sample_articles) db_ops.insert_article.get(art.title, art.content);
}

export function getArticles() {
  return db_ops.get_articles.all();
}

export function getArticle(id) {
  const article = db_ops.get_article.get(id);
  if (!article) return null;
  article.comments = db_ops.get_comments.all(id);
  return article;
}

export function addComment(articleId, name, text) {
  return db_ops.insert_comment.get(articleId, name, text);
}

export default { getArticles, getArticle, addComment };
