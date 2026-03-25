import session from "../models/session.js";
import user from "../models/user.js";

// Pola formularzy z tutoriala
const login_form_fields = [
  { name: "username", display_name: "Nazwa użytkownika", type: "text", min_length: 3, max_length: 25, required: true },
  { name: "password", display_name: "Hasło", type: "password", min_length: 8, required: true },
];

const signup_form_fields = [
  { name: "username", display_name: "Nazwa użytkownika", type: "text", min_length: 3, max_length: 25, required: true },
  { name: "password", display_name: "Hasło", type: "password", min_length: 8, required: true },
  { name: "password_confirm", display_name: "Powtórz hasło", type: "password", min_length: 8, required: true, must_match: "password" },
];

function getFormData(req, fields) {
  const data = {};
  fields.forEach((field) => { data[field.name] = req.body[field.name]; });
  return data;
}

function validateForm(data, fields) {
  const errors = {};
  fields.forEach((field) => {
    if (field.required && typeof data[field.name] !== "string") {
      errors[field.name] = "Pole jest wymagane"; return;
    }
    if (field.min_length != null && data[field.name].length < field.min_length) {
      errors[field.name] = `Min. ${field.min_length} znaków`;
    }
    if (field.must_match != null && data[field.name] !== data[field.must_match]) {
      errors[field.name] = `Hasła muszą się zgadzać`;
    }
  });
  return errors;
}

export function signup_get(req, res) {
  let form = { data: {}, fields: signup_form_fields, errors: {}, action: "/auth/signup", method: "POST" };
  res.render("auth_signup", { title: "Rejestracja", form });
}

export async function signup_post(req, res) {
  let form = { data: getFormData(req, signup_form_fields), fields: signup_form_fields, errors: {}, action: "/auth/signup", method: "POST" };
  form.errors = validateForm(form.data, form.fields);
  
  if (Object.keys(form.errors).length === 0) {
    let new_user = await user.createUser(form.data["username"], form.data["password"]);
    if (new_user != null) {
      session.createSession(new_user.id, res);
      return res.redirect("/");
    } else {
      form.errors["username"] = "Użytkownik już istnieje";
    }
  }
  res.render("auth_signup", { title: "Rejestracja", form });
}

export function login_get(req, res) {
  let form = { data: {}, fields: login_form_fields, errors: {}, action: "/auth/login", method: "POST" };
  res.render("auth_login", { title: "Logowanie", form });
}

export async function login_post(req, res) {
  let form = { data: getFormData(req, login_form_fields), fields: login_form_fields, errors: {}, action: "/auth/login", method: "POST" };
  form.errors = validateForm(form.data, form.fields);
  
  if (Object.keys(form.errors).length === 0) {
    let user_id = await user.validatePassword(form.data["username"], form.data["password"]);
    if (user_id == null) {
      form.errors["username"] = "Błędny login lub hasło";
    } else {
      session.createSession(user_id, res);
      return res.redirect("/");
    }
  }
  res.render("auth_login", { title: "Logowanie", form });
}

export function logout(req, res) {
  session.deleteSession(res);
  res.redirect("/");
}

export default { login_get, login_post, signup_get, signup_post, logout };