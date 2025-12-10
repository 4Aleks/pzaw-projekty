import Database from "better-sqlite3";

const db_path = "./db.sqlite";
const db = new Database(db_path);

// Tworzenie tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    article_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    comment_id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    text TEXT NOT NULL
  );
`);

// Przygotowane zapytania
const db_ops = {
  get_articles: db.prepare("SELECT * FROM articles"),
  get_article: db.prepare("SELECT * FROM articles WHERE article_id = ?"),
  get_comments: db.prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY comment_id DESC"),
  insert_comment: db.prepare("INSERT INTO comments (article_id, name, text) VALUES (?, ?, ?)")
};

// Funkcje API
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
  return db_ops.insert_comment.run(articleId, name, text);
}

export default { getArticles, getArticle, addComment };
