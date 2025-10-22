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

export function getCategorySummaries() {
  return Object.entries(card_categories).map(([id, category]) => {
    return { id, name: category.name };
  });
}

export function hasCategory(categoryId) {
  return card_categories.hasOwnProperty(categoryId);
}

export function getCategory(categoryId) {
  if (hasCategory(categoryId))
    return { id: categoryId, ...card_categories[categoryId] };
  return null;
}

export function addCard(categoryId, card) {
  if (hasCategory(categoryId)) card_categories[categoryId].cards.push(card);
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

export default {
  getCategorySummaries,
  hasCategory,
  getCategory,
  addCard,
  validateCardData,
};
