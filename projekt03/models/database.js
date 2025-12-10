import Database from "better-sqlite3";

const db_path = "./db.sqlite";
const db = new Database(db_path);


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



const articleCount = db.prepare("SELECT COUNT(*) AS c FROM articles").get().c;

if (articleCount === 0) {
  console.log("Dodawanie danych startowych...");

  const insertArticle = db.prepare(`
    INSERT INTO articles (title, content)
    VALUES (?, ?)
  `);

  const articles = [
    {
      title: "FC Barcelona",
      content:
        "FC Barcelona to jeden z najbardziej rozpoznawalnych klubów piłkarskich świata. Słynie z ofensywnego stylu gry i filozofii tiki-taka.",
    },
    {
      title: "Real Madryt",
      content:
        "Real Madryt to najbardziej utytułowany klub w historii Ligi Mistrzów. Znany jest z silnej kadry i zwycięskiej mentalności.",
    },
    {
      title: "Liverpool FC",
      content:
        "Liverpool to klub o bogatej historii, słynący z atmosfery na Anfield oraz filozofii gry w stylu heavy metal football.",
    },
    {
      title: "Manchester United",
      content:
        "Manchester United to jeden z najpopularniejszych klubów na świecie, znany z ery Sir Alexa Fergussona i ofensywnego stylu gry.",
    },
  ];

  const insertComment = db.prepare(`
    INSERT INTO comments (article_id, name, text)
    VALUES (?, ?, ?)
  `);

  articles.forEach((article, index) => {
    const info = insertArticle.run(article.title, article.content);

    if (index === 0) {
      insertComment.run(info.lastInsertRowid, "mati", "bedzie 0:2 jutro");
    }
  });
}



const db_ops = {
  get_articles: db.prepare("SELECT * FROM articles"),
  get_article: db.prepare("SELECT * FROM articles WHERE article_id = ?"),
  get_comments: db.prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY comment_id DESC"),

  insert_comment: db.prepare("INSERT INTO comments (article_id, name, text) VALUES (?, ?, ?)"),

  update_comment: db.prepare("UPDATE comments SET name = ?, text = ? WHERE comment_id = ?"),
  delete_comment: db.prepare("DELETE FROM comments WHERE comment_id = ?"),
};

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

export function updateComment(commentId, name, text) {
  return db_ops.update_comment.run(name, text, commentId);
}

export function deleteComment(commentId) {
  return db_ops.delete_comment.run(commentId);
}

export default {
  getArticles,
  getArticle,
  addComment,
  updateComment,
  deleteComment,
};
