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


app.use('/user/',(req,res,next)=>{
  if(req.session.isLogin){
    next();
  }
  else{
    res.redirect('/');      ///  change this to /login
  }
});


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
  // console.log(req.body);
  var date = new Date();

  connection.query('select * from `user` where `email` = ?',[req.body.email],(err,data)=>{
    if(err){
      console.log(err);
      throw err;
    }
    if(data[0]){
      console.log("Email already exists");
    }
    else{
      var date = getDate();
      connection.query('insert into `user` (`email`, `name`, `password`, `dateCreated`) values (?, ?, ?, ?);',[req.body.email, req.body.name, req.body.password, date],(err,data)=>{
        if(err){
          console.log(err);
          throw err;
        }
        console.log("Data Inserted Succesfully");
        // console.log(data);
        req.session.isLogin = 1;
        req.session.name = req.body.email;
        req.session.isActive = 1;
        req.session.name = req.body.name;
        req.session.id = data.insertId;
        req.session.dateCreated = date;
        res.redirect(`/user/`);
    });
  }
});


  /////  Add to DB and session here /////
  //res.render('home');
});

app.get('/user/',(req,res)=>{
  
  res.render('home');
});


app.get('/home',(req,res)=>{
  res.render('home');
});

app.listen(PORT, ()=>{
  console.log("Server Started on "+ PORT);
});




function getDate() {
  var x=new Date().getDate().toString();
  var y=new Date().getMonth().toString();
  var z=new Date().getFullYear().toString();
  var r = z+"-"+y+"-"+x;
  return r;
}