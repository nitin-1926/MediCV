var express = require('express');
var app = express();
var path = require('path');
const bodyParser = require('body-parser');
var session = require('express-session');
const cookeParser = require('cookie-parser');


app.use(express.static(path.join(__dirname, '/public')));
app.set('views',path.join(__dirname, 'views'));
app.set('view engine','ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookeParser());
app.use(session({ secret: 'abcChitkara', resave: false, saveUninitialized: true, }));


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

app.post('/login',(req,res)=>{
  var email = req.body.email.toLowerCase();
  var password = req.body.password;

  users.findOne({email: email, password: password},(err,data)=>{
    if(err){
      throw err;
    }
    if(data!=null){
      res.send({valid: 1});
    }
    else{
      res.send({valid: 0});
    }
  })
});


app.get('/home',(req,res)=>{
  res.render('home');
});

app.listen(2000, ()=>{
  console.log("Server Started");
});