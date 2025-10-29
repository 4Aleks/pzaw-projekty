import { DatabaseSync } from "node:sqlite";

const db_path = "./db.sqlite";
const db = new DatabaseSync(db_path);

console.log("Creating database tables");
db.exec(
  `CREATE TABLE IF NOT EXISTS fc_categories (
    category_id   INTEGER PRIMARY KEY,
    id            TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS fc_cards (
    id            INTEGER PRIMARY KEY,
    category_id   INTEGER NOT NULL REFERENCES fc_categories(category_id) ON DELETE NO ACTION,
    front         TEXT NOT NULL,
    back          TEXT NOT NULL
  ) STRICT;`
);

const db_ops = {
  insert_category: db.prepare(
    `INSERT INTO fc_categories (id, name)
        VALUES (?, ?) RETURNING category_id, id, name;`
  ),
  insert_card: db.prepare(
    `INSERT INTO fc_cards (category_id, front, back) 
        VALUES (?, ?, ?) RETURNING id, front, back;`
  ),
  insert_card_by_id: db.prepare(
    `INSERT INTO fc_cards (category_id, front, back) VALUES (
      (SELECT category_id FROM fc_categories WHERE id = ?),
      ?, 
      ?
    ) 
    RETURNING id, front, back;`
  ),
  get_categories: db.prepare("SELECT id, name FROM fc_categories;"),
  get_category_by_id: db.prepare(
    "SELECT category_id, id, name FROM fc_categories WHERE id = ?;"
  ),
  get_cards_by_category_id: db.prepare(
    "SELECT id, front, back FROM fc_cards WHERE category_id = ?;"
  ),
};

const card_categories = {
  "j-angielski-food": {
    name: "j. angielski - food",
    cards: [
      { front: "truskawka", back: "strawberry" },
      { front: "gałka muszkatołowa", back: "nutmeg" },
      { front: "jabłko", back: "apple" },
      { front: "karczoch", back: "artichoke" },
      { front: "cielęcina", back: "veal" },
    ],
  },
  "stolice-europejskie": {
    name: "stolice europejskie",
    cards: [
      { front: "Holandia", back: "Amsterdam" },
      { front: "Włochy", back: "Rzym" },
      { front: "Niemcy", back: "Berlin" },
      { front: "Węgry", back: "Budapeszt" },
      { front: "Rumunia", back: "Bukareszt" },
    ],
  },
};

if (process.env.POPULATE_DB) {
  console.log("Populating db...");
  Object.entries(card_categories).map(([id, data]) => {
    let category = db_ops.insert_category.get(id, data.name);
    console.log("Created category:", category);
    for (let card of data.cards) {
      let c = db_ops.insert_card.get(
        category.category_id,
        card.front,
        card.back
      );
      console.log("Created card:", c);
    }
  });
}

export function getCategorySummaries() {
  var categories = db_ops.get_categories.all();
  return categories;
}

export function hasCategory(categoryId) {
  let category = db_ops.get_category_by_id.get(categoryId);
  return category != null;
}

export function getCategory(categoryId) {
  let category = db_ops.get_category_by_id.get(categoryId);
  if (category != null) {
    category.cards = db_ops.get_cards_by_category_id.all(category.category_id);
    return category;
  }
  return null;
}

export function addCard(categoryId, card) {
  return db_ops.insert_card_by_id.get(categoryId, card.front, card.back);
}

export function validateCardData(card) {
  var errors = [];
  var fields = ["front", "back"];
  for (let field of fields) {
    if (!card.hasOwnProperty(field)) errors.push(`Missing field '${field}'`);
    else {
      if (typeof card[field] != "string")
        errors.push(`'${field}' expected to be string`);
      else {
        if (card[field].length < 1 || card[field].length > 500)
          errors.push(`'${field}' expected length: 1-500`);
      }
    }
  }
  return errors;
}

export function addCategory(categoryId, name) {
  return db_ops.insert_category.get(categoryId, name);
}

export default {
  getCategorySummaries,
  hasCategory,
  getCategory,
  addCard,
  addCategory,
  validateCardData,
};
