var express = require("express");
var app = express();
var path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
var session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const multer = require('multer');
const https = require('https');
// const findOrCreate = require('mongoose-findorcreate');
const fs = require('fs');

const PORT = 3000;

app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({ secret: "abcChitkara", resave: false, saveUninitialized: true })
);


mongoose.connect("mongodb://localhost:27017/medicvDB", {useNewUrlParser: true, useCreateIndex: true , useUnifiedTopology: true, useFindAndModify: false}, (err)=>{
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
  recievedRequests: [{ from: String, status: String}],//  status: (accepted), (rejected), (none) -> not responded.
  sentRequests: [{to: String, status: String}], 
  uploads: [ {folderName: String, contents: [{ _id: String, displayName: String}]} ],
  password: String,
  verified: Boolean,
  dateCreated: Date,


});

// const uploadSchema = new mongoose.Schema({
//   fileName: String,
//   folder: {type: mongoose.Types.ObjectId, ref: User}
// });
// const Upload = mongoose.model('uploads', uploadSchema);

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);

const User = mongoose.model("users", userSchema);

var pwd = '';

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  //  currentUser = user;
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

function authenticateUser(req, res, next){
  
  if(req.path==='/' || req.path=='/login' || req.path=='/login/' || req.path=='/register'){
    return next();
  } else {
    if(req.isAuthenticated()){
      currentUser = req.user;
      return next();
    } else {
      res.redirect('/login');
    }
  }
}



//  Middleware  //
app.all("*", authenticateUser);

app.get('/', (req, res)=>{
  res.render('landing');
})

app.get('/login', (req, res)=>{
  if(req.isAuthenticated()){
    return res.redirect('/home');
  }
  res.render('login', {reg: false});
});

app.get('/register', (req,res)=>{
  if(req.isAuthenticated()){
    return res.redirect('/home');
  }
  res.render('login', {reg: true});
});

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
        createUserFolder(req.user.id);
        pwd = `/uploads/${req.user.id}/`;
        res.sendStatus(200);
      });
      
    }
  });
  
});

app.post("/register", (req, res) => {
  User.register({username: req.body.username.toLowerCase()}, req.body.password, function(err, user) {
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
        createUserFolder(req.user.id);
        pwd = `/uploads/${req.user.id}/`;
        res.sendStatus(200);
      });
    }

  });
  
});

app.get("/home", (req, res) => {
  User.findById(req.user.id, (err, data)=>{
    if(err){
      console.log(err);
    } else {
      res.render("home", {data: data.uploads, user: `${req.user.id}`});
    }
  })
});

//  Create User Folder if does not exists...
function createUserFolder(id){
  var dir = __dirname + '/public/uploads/' + id;
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  pwd = '/uploads/' + id;  //  set pwd to serve static files
}

app.post('/createfolder', (req, res)=>{
  var name = req.body.folderName.trim();
  var dir = __dirname + '/public/uploads/' + req.user.id + '/' + name;
  if (!fs.existsSync(dir)){
    try {
      fs.mkdirSync(dir);
    } catch (error) {
      console.log(error);
      return res.sendStatus(507);
    }
    User.findOneAndUpdate({ _id:req.user.id }, 
      {$push: {uploads: {folderName: name, contents: []}}}, (err)=>{
        if(err){
          console.log(err);
        }
      });
    res.sendStatus(200);
  } else {
    return res.sendStatus(300);
  }
});

app.post('/home/:folderName', (req, res)=>{
  // console.log(req.path);
  
  User.findById(req.user.id, (err, data)=>{
    if(err){
      console.log(err);
    } else {
      const folder = data.uploads.filter(folder=> {
        return folder.folderName == req.params.folderName;
      })
      if(folder.length){
        pwd = `/uploads/${req.user.id}/${req.params.folderName}/`;
        return res.send(JSON.stringify(folder[0].contents));
      }
      else res.send("No Folder");
    }
  })
});

var multerConf = {
  storage: multer.diskStorage({
    destination: function(req, file, next){      
      next(null, __dirname + `/public${pwd}`);
    },
    filename: function(req, file, next){
      const ext = file.mimetype.split('/')[1];
      next(null, file.fieldname + Date.now() + '.' + ext);
    }
  }),
  fileFilter: function(req, file, next){
    if(!file){
      next();
    } else {
      const image = file.mimetype.startsWith('image');
      if(image){
        next(null, true);
      } else {
        next({message: 'File type not Supported'}, false);
      }
    }
  }
};

app.post('/uploadfile', multer(multerConf).single('photo'), (req, res)=>{ 

  User.updateOne(
    {_id: req.user.id, "uploads.folderName": req.body.foldername },
    { $push: {"uploads.$.contents": { _id: req.file.filename , displayName: req.body.fileName}} },
    (err, data)=>{
      if(err){
        console.log(err);
      } else {
        res.send({displayName: req.body.fileName, _id: req.file.filename});
      }
    }
  );
})

app.post('/renamefolder', (req, res)=>{
  var oldName = req.body.oldFolderName.trim();
  var newName = req.body.newFolderName.trim();
  var oldDir = __dirname + '/public/uploads/' + req.user.id + '/' + oldName;
  var newDir = __dirname + '/public/uploads/' + req.user.id + '/' + newName;

  if(!fs.existsSync(newDir)){
    User.updateOne(
      {_id: req.user.id, "uploads.folderName": oldName },
      { $set: { "uploads.$.folderName": newName } },
      (err, data)=>{
        if(err){
          console.log(err);
          res.sendStatus(500);
        } else {
          fs.rename(oldDir, newDir, function(err){
            if(err){
              console.log(err);
              return res.sendStatus(500);
            } else {
              return res.sendStatus(200);
            }
          });
        }
      }
    )
  } else {
    return res.sendStatus(300);
  }

});

app.delete('/deletefolder', (req, res)=>{
  var dir = __dirname + '/public/uploads/' + req.user.id + '/' + req.body.folderName;
  User.updateOne(
    { _id: req.user.id},
    { $pull: { uploads: { folderName: req.body.folderName} } },
    (err, data)=>{
      if(err){
        console.log(err);
        res.send(err.message);
      } else {
        console.log(data);
        fs.rmdirSync(dir, { recursive: true });
        res.sendStatus(200);
      }
    }
  )
})

app.post('/sendimportrequest', (req, res)=>{
  var importFrom = req.body.importFromUser.toLowerCase();
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(re.test(importFrom)){
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.get('/logout', (req, res)=>{
  req.logOut();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log("Server Started on " + PORT);
});

