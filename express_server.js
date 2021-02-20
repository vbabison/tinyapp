const express = require("express");
const app = express();
const bcrypt = require('bcrypt');
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const { Template } = require("ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser())
app.set("view engine", "ejs");

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const urlsForUser = (id) => {
  const templateVars = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url]["userID"] === id) {
      templateVars[url] = urlDatabase[url];
    }
  }
  console.log(templateVars)
  console.log(urlDatabase)
  return templateVars
};

const users = { 
  "aJ48lW": {
    id: "aJ48lW", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

const emailLookup = (email) => {
  for (user in users) {
    if (users[user].email === email) {
      return users[user];
    }
  }
  return false;
};

const generateRandomString = () => {
  let randomString = Math.random().toString(36).substring(7);
  return randomString;
};

app.post("/login", (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.end('403 Forbidden')
    res.redirect(`/login`);
    return
  }
  const user = emailLookup(req.body.email);
  if (!user) {
    res.end('403 Forbidden');
    return;
  } else {
    
    if (!bcrypt.compareSync(req.body.password, user.hashedPassword)) {
      res.end('403 Forbidden');
      return;
    }
  }
  res.cookie('user_id', user.id)
  res.redirect(`/urls`);
});

app.get("/login", (req, res) => {
  const templateVars = { user: null };
  res.render("urls_login", templateVars);
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect(`/urls`);
});

app.get("/register", (req, res) => {
  const templateVars = { user: req.cookies["user_id"], 'email': req.body.email, 'password': req.body.password };
  res.render("urls_registration", templateVars);
});

app.post("/register", (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.end('400 Bad Request')
    res.redirect(`/register`);
  }
  const lookupVal = emailLookup(req.body.email)
  if (lookupVal) {
    res.end('User exists! Login');
    res.redirect(`/login`);
    return
  }
  const randomId = generateRandomString();
  users[randomId] = { id: "", email: "", password: "" };
  users[randomId].id = randomId;
  users[randomId].email = req.body.email;
  users[randomId].password = req.body.password;
  users[randomId].hashedPassword = bcrypt.hashSync(req.body.password, 10);
  res.cookie('user_id', randomId);
  res.redirect(`/urls`);
});

app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlsForUser(req.cookies["user_id"]) };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlDatabase };
  if(!templateVars.user) {
    res.redirect("/login")
  }
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]["longURL"] };
  if (templateVars.longURL === undefined) {
    res.send("Reenter vaild shortUrl")
  } else {
    res.render("urls_show", templateVars);
  }
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  urlDatabase[randomString] = { longURL: req.body.longURL, userID: req.cookies["user_id"]};
  res.redirect(`/urls/${randomString}`);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if(req.cookies["user_id"]) {
    const templateVars = { user: users[req.cookies["user_id"]], urls: urlsForUser(req.cookies["user_id"]) };
    delete urlDatabase[req.params.shortURL];
    res.redirect(`/urls`);
  }
});

app.post("/urls/:shortURL", (req, res) => {
  if(req.cookies["user_id"]) {
    urlDatabase[req.params.shortURL]["longURL"] = req.body.longURL;
    res.redirect(`/urls`);
  }
});