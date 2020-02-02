var express = require('express');
var app = express();
var path = require('path');
const bodyParser = require('body-parser');
var session = require('express-session');
const cookeParser = require('cookie-parser');

const PORT=2000;


app.use(express.static(path.join(__dirname, '/public')));
app.set('views',path.join(__dirname, 'views'));
app.set('view engine','ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookeParser());
app.use(session({ secret: 'abcChitkara', resave: false, saveUninitialized: true, }));

/*
var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/medicv';
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);

mongoose.connect(mongoDB);
mongoose.connection.on('error', (err) => {
  console.log('DB connection Error');
});
mongoose.connection.on('connected', (err) => {
  console.log('DB connected');
});

var userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  dob: String,
  city: String,
  age: String,
  phoneNo: String,
  dateCreated: String,
  profilePic: String,
  status: String,        // verified  pending
  isActive: Boolean,        //  account deleted?
  subscription: String         //  free  premium
});

var users = mongoose.model('users',userSchema);

*/


var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'Prabhat',
  password: 'secret',
  database: 'medicv'
});

connection.connect(function(err){
  if(err){
    console.log("DB Connection Error");
    return;
  }
  console.log("DB Connected");
});


app.use('/user/:id',(req,res,next)=>{
  if(req.session.isLogin){
    next();
  }
  else{
    res.redirect('/');      ///  change this to /login
  }
})



/*/////////////////////////////////////////////////


Make Middle ware to check logged in


/////////////////////////////////////////////////*/

app.post('/login',(req,res)=>{
  var email = req.body.email.toLowerCase();
  var password = req.body.password;

  connection.query('select * from `user` where `email` = ? and `password` = ?',[email,password],(err,data)=>{
    if(err){
      console.log(err);
      throw err;
    }
    if(data.length){
      req.session.data=data[0];
      req.session.isLogin = 1;
      res.send({valid: 1});
      return;
    }
    res.send({valid: 0});
      

  });



});

//////////  Register User ////////////

app.post('/register',(req,res)=>{
  console.log(req.body);
  
  /////  Add to DB and session here /////
  //res.render('home');
});

app.get('/user/',(req,res)=>{
  res.render('home');
})


app.get('/home',(req,res)=>{
  res.render('home');
});

app.listen(PORT, ()=>{
  console.log("Server Started on "+ PORT);
});