var express = require("express");
var app = express();
var path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
var session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const PORT = 3000;

app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({ secret: "abcChitkara", resave: false, saveUninitialized: true })
);


mongoose.connect("mongodb://localhost:27017/medicvDB", {useNewUrlParser: true,useCreateIndex: true , useUnifiedTopology: true}, (err)=>{
  if(err){
    console.log("DB Connection Error");
  } else {
    console.log("DB Connected");
  }
});

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  uploads: [ {type: String} ],
  password: String,
  verified: Boolean,
  dateCreated: Date

});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);

const User = mongoose.model("users", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

function authenticateUser(req, res, next){

  if(req.path=='/' || req.path=='/login' || req.path=='/register'){
    return next();
  } else {
    if(req.isAuthenticated()){
      return next();
    } else {
      res.redirect('/');
    }
  }
}

//  Middleware  //
app.all("*", authenticateUser);


app.get('/', (req, res)=>{
  if(req.isAuthenticated()){
    return res.redirect('/home');
  }
  res.render('login');
})

app.post("/login", (req, res) => {
  var user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.sendStatus(200);
      });
    }
  });
  
});

app.post("/register", (req, res) => {
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
      if(err.name =="UserExistsError"){
        passport.authenticate("local")(req, res, function(){
          res.redirect('/home');
        });
      } else {
        console.log("ERROR: ", err);
        res.redirect('/');
      }
    } else {
      passport.authenticate("local")(req, res, function(){
        res.sendStatus(200);
      });
    }

  });
  
});


app.get("/home", (req, res) => {
  res.render("home");
});

app.listen(PORT, () => {
  console.log("Server Started on " + PORT);
});

