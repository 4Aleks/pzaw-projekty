import { DatabaseSync } from "node:sqlite";
import argon2 from "argon2";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);


db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS articles (
    article_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    comment_id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    name TEXT NOT NULL,
    text TEXT NOT NULL
  );
`);

const db_ops = {
  get_articles: db.prepare("SELECT * FROM articles ORDER BY article_id DESC"),
  get_article: db.prepare("SELECT * FROM articles WHERE article_id = ?"),
  insert_article: db.prepare("INSERT INTO articles (title, content) VALUES (?, ?)"),
  update_article: db.prepare("UPDATE articles SET title = ?, content = ? WHERE article_id = ?"),
  get_comments: db.prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY comment_id DESC"),
  insert_comment: db.prepare("INSERT INTO comments (article_id, user_id, name, text) VALUES (?, ?, ?, ?)"),
  update_comment: db.prepare("UPDATE comments SET text = ? WHERE comment_id = ?"),
  delete_comment: db.prepare("DELETE FROM comments WHERE comment_id = ?"),
  get_user: db.prepare("SELECT * FROM users WHERE username = ?"),
  insert_user: db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)"),
  get_comment_owner: db.prepare("SELECT user_id FROM comments WHERE comment_id = ?")
};


export async function registerUser(username, password) {
  const hash = await argon2.hash(password);
  return db_ops.insert_user.run(username, hash, 'user');
}

export async function verifyUser(username, password) {
  const user = db_ops.get_user.get(username);
  if (!user) return null;
  const isMatch = await argon2.verify(user.password, password);
  return isMatch ? user : null;
}


export function getArticles() { return db_ops.get_articles.all(); }
export function getArticle(id) {
  const article = db_ops.get_article.get(id);
  if (article) article.comments = db_ops.get_comments.all(id);
  return article;
}
export function addArticle(t, c) { return db_ops.insert_article.run(t, c); }
export function updateArticle(id, t, c) { return db_ops.update_article.run(t, c, id); }
export function addComment(aId, uId, n, t) { return db_ops.insert_comment.run(aId, uId, n, t); }
export function deleteComment(id) { return db_ops.delete_comment.run(id); }
export function getCommentOwner(id) { return db_ops.get_comment_owner.get(id); }


async function seed() {
  const uCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (uCount === 0) {
    const adminHash = await argon2.hash("admin123");
    db_ops.insert_user.run("admin", adminHash, "admin");
    console.log("Utworzono admina (admin/admin123)");
  }

  const aCount = db.prepare("SELECT COUNT(*) as c FROM articles").get().c;
  if (aCount === 0) {
    const clubs = [
      { title: "FC Barcelona", content: "Klub z Katalonii, słynący z akademii La Masia i pięknej gry tiki-taka." },
      { title: "Real Madryt", content: "Królewscy z Madrytu, najbardziej utytułowany klub w historii Ligi Mistrzów." },
      { title: "Liverpool FC", content: "The Reds z Anfield, duma Anglii znana z niesamowitego hymnu You'll Never Walk Alone." },
      { title: "Manchester United", content: "Czerwone Diabły z Old Trafford, jeden z najbogatszych klubów świata." }
    ];
    clubs.forEach(c => {
      const info = db_ops.insert_article.run(c.title, c.content);
      db_ops.insert_comment.run(info.lastInsertRowid, null, "Admin", `komentarz o  ${c.title}!`);
    });
    console.log("Dodanie 4 klubów i komentarzy.");
  }
}
seed();

export default { 
  getArticles, getArticle, addArticle, updateArticle, addComment, 
  deleteComment, verifyUser, registerUser, getCommentOwner 
};