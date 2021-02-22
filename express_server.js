const express = require("express");
const app = express();
const bcrypt = require('bcrypt');
const PORT = 8080;
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const { Template } = require("ejs");
const Keygrip = require("keygrip")
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser())
app.set("view engine", "ejs");
const { getUserByEmail } = require('./helpers.js');

var cookieSession = require('cookie-session')

app.use(cookieSession({
  name: 'session',
  keys: ["SEKRIT3", "SEKRIT2", "SEKRIT1"],
  maxAge: 24 * 60 * 60 * 1000
}))

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
  const user = getUserByEmail(req.body.email, users);
  if (!user) {
    res.end('User Does Not Exist. Please Register!');
    return;
  } else {
    
    if (!bcrypt.compareSync(req.body.password, user.hashedPassword)) {
      res.end('Password Incorrect!');
      return;
    }
  }
  req.session.user_id = user.id;
  res.redirect(`/urls`);
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlsForUser(req.session.user_id) }
  if (!templateVars.user) {
    const templateVars = { user: null };
    res.render("urls_login", templateVars);
  } else {
    res.redirect(`/urls`);
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/urls`);
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlsForUser(req.session.user_id) }
  if (!templateVars.user) {
    const templateVars = { user: req.session.user_id, 'email': req.body.email, 'password': req.body.password };
    res.render("urls_registration", templateVars);
  } else {
    res.redirect(`/urls`);
  }
});

app.post("/register", (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.end('400 Bad Request')
    res.redirect(`/register`);
  }
  const lookupVal = getUserByEmail(req.body.email, users)
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
  req.session.user_id = randomId;
  res.redirect(`/urls`);
});

app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlsForUser(req.session.user_id) }
  if (!templateVars.user) {
    res.redirect(`/login`);
  } else {
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlDatabase };
  if(!templateVars.user) {
    res.redirect("/login")
  }
  res.render("urls_new", templateVars);
});

app.get("/", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlDatabase };
  if (!templateVars.user) {
    res.redirect(`/login`);
  } else {
    res.redirect(`/urls`);
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  urlDatabase[randomString] = { longURL: req.body.longURL, userID: req.session.user_id};
  res.redirect(`/urls/${randomString}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  try {
    if (!req.session.user_id) {
      res.end("Please Login")
    }
    if(req.session.user_id) {
      const templateVars = { user: users[req.session.user_id], urls: urlsForUser(req.session.user_id) };
      delete urlDatabase[req.params.shortURL];
      res.redirect(`/urls`);
    } else {
      res.end("You Don't Own This URL!");
    }
  } catch (error) {
    res.end("Id Does Not Exist!")
  }
});

app.get("/u/:shortURL", (req, res) => {
  try {
    res.redirect(urlDatabase[req.params.shortURL].longURL);
  }
  catch(err) {
    res.end('403 Forbidden')
  }
});

app.get("/urls/:shortURL", (req, res) => {
  try {
    const templateVars = { user: users[req.session.user_id], shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]["longURL"], urls: urlsForUser(req.session.user_id) };

    if (!templateVars.user) {
      res.send("Reenter vaild shortUrl")
    }
    if (templateVars.user) {
      for (const url in urlDatabase) {
        if (url === req.params.shortURL && urlDatabase[url]["userID"] === req.session.user_id) {
          res.render("urls_show", templateVars);
        }
        if (url === req.params.shortURL && urlDatabase[url]["userID"] !== req.session.user_id) {
          res.end("You Don't Own This URL!");
        }
      }
      res.render("urls_show", templateVars);
    }
  } catch (error) {
    res.end("Id Does Not Exist!")
  }
});

app.post("/urls/:shortURL", (req, res) => {
  try {
    const templateVars = { user: users[req.session.user_id], shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]["longURL"], urls: urlsForUser(req.session.user_id) };

    if (!templateVars.user) {
      res.send("Please Login")
    }
    if (templateVars.user) {
      for (const url in urlDatabase) {
        if (url === req.params.shortURL && urlDatabase[url]["userID"] === req.session.user_id) {
          urlDatabase[req.params.shortURL]["longURL"] = req.body.longURL;
          res.redirect(`/urls`);
        }
        if (url === req.params.shortURL && urlDatabase[url]["userID"] !== req.session.user_id) {
          res.end("You Don't Own This URL!");
        }
      }
    }
  } catch (error) {
    res.end("Id Does Not Exist!")
  }
});