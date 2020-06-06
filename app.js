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
const ncp = require('ncp').ncp;
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
  username: String,
  recievedRequests: [{ from: String, status: String}],//  status: (accepted), (rejected), (none) -> not responded.
  sentRequests: [{to: String, status: String}], 
  uploads: [ {folderName: String, contents: [{ _id: String, displayName: String}]} ],
  acceptedRequest: String,
  password: String,
  verified: Boolean,
  dateCreated: Date,


});

userSchema.plugin(passportLocalMongoose);

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
  User.register({username: req.body.username.trim().toLowerCase()}, req.body.password, function(err, user) {
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
      User.findOne({username: req.user.acceptedRequest})
      .then(d=>{
        res.render("home", {data: data.uploads,username: data.username , user: `${req.user.id}`, requests: req.user.recievedRequests.filter( request => request.status == 'none'), requestedFolders: d!=null ? d.uploads :null });
      })
      .catch(err=>{
        console.log(err);
        throw err;
      })
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
        fs.rmdirSync(dir, { recursive: true });
        res.sendStatus(200);
      }
    }
  )
})

app.post('/sendimportrequest', (req, res)=>{
  var importFrom = req.body.importFromUser.trim().toLowerCase();
  if(importFrom == req.user.username){
    return res.send({err: "You Cannot Send Request to Yourself. TY ❤️"})
  }
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(re.test(importFrom)){
    var request = {
      from: req.user.username,
      status: 'none'
    }
    User.findOne({username: request.from},
      (err, data)=>{
        if(err){
          console.log(err);
        } else {
          if(data.sentRequests.length == 0){
            User.updateOne(
              { username: importFrom },
              { $push: { recievedRequests: request } }
            )
            .then(function(data){
              if(data.n == 0){
                return res.send({err: "No User"});
              } else{
                var request = {
                  to: importFrom,
                  status: 'none'
                }
                User.updateOne(
                  { _id: req.user.id },
                  { $push: { sentRequests: request } }
                )
                .then(function(data){
                  if(data.n == 0){
                    console.log("DB Inconsistent");
                    return res.send({err: "Could not process Request"});
                  }
                  return res.sendStatus(200);
                })
                .catch((err)=>{
                  console.log(err);
                  throw err;
                })
              }
            })
            .catch(function(err){
              console.log(err);
              throw err;
            });
          } else {
            return res.send({err: "You have one pending request"});
          }
        }
      });
  } else {
    return res.sendStatus(400);
  }
});

app.post('/handlerequest', (req, res)=>{
  var requestId = req.body.id;
  var response = req.body.status;
  // var dir = __dirname + '/public/uploads/' + req.user.id + '/' + oldName;

  var from = null;

  User.find({_id: req.user.id, "recievedRequests._id": requestId},
  { "recievedRequests.$.from": 1 },
  (err, data)=>{
    if(err){
      console.log(err);
    } else {
      from = data[0].recievedRequests[0].from;
      User.updateOne({_id: req.user.id, "recievedRequests._id": requestId },
      { $set: {"recievedRequests.$.status": response} } 
      )
      .then(data=>{
        if(data.n == 0){
          console.log("Some Error Occurred");
          return res.send("Failed");
        } else {
          if(response == 'accepted'){
            User.updateOne({ username: from },
            {$set: { "sentRequests": [], acceptedRequest: req.user.username }},
            (err)=>{
              if(err){
                console.log(err);
                return res.send({err: "Error"}); 
              } else {
                return res.send("OK");
              }
            })
          } else {
            User.updateOne({ username: from },
              {$set: { "sentRequests": [] }},
              (err)=>{
                if(err){
                  console.log(err);
                  return res.send({err: "Error"}); 
                } else {
                  return res.send("OK");
                }
              })
          }

        }
      })
      .catch(err=>{
        console.log(err);
        throw err;
      })
    }
  })


});

app.post("/importselectedfolder", (req, res)=>{
  // folders in req.body.folder
  var target = __dirname + '/public/uploads/' + req.user.id + '/' + req.body.folder;
  var src = null;
  User.findOne({username: req.user.acceptedRequest, uploads: {$elemMatch: {folderName: req.body.folder}} },
    {"uploads.$.folderName": 1})
  .then(data=>{
    if(data.uploads.length == 0){
      return res.send({err: "Error"});
    } else {
      const folder = {
        folderName: data.uploads[0].folderName,
        contents : data.uploads[0].contents
      }
      
      src = __dirname + '/public/uploads/' + data._id + '/' + req.body.folder;
      if (!fs.existsSync(target)){
        try {
          fs.mkdirSync(target);
        } catch (error) {
          console.log(error);
          throw error;
        }
        ncp(src, target, (err)=>{
          if(err){
            console.log(err);
            return res.send({err: "Could not create Folder on server"});
          } else {
            User.updateOne({_id: req.user._id},
            {$push: {uploads: folder}}, (err)=>{
              if(err){
                console.log(err);
              } else{
                User.updateOne({_id: req.user._id},
                  {$set: {acceptedRequest: null}},
                  (err)=>{
                    if(err){
                      console.log(err);
                      return res.send({err: "Error"});
                    } else {
                      return res.redirect('/home');
                    }
                  }
                )
              }
            });
          }
        })
      } else {
        return res.send({err: "Folder with same name already exists."});
      }
    }
    
  })
  .catch(err=>{
    console.log(err);
    throw err;
  })
});

app.get('/logout', (req, res)=>{
  req.logOut();
  res.send("OK");
});

app.listen(PORT, () => {
  console.log("Server Started on " + PORT);
});

