//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const url = process.env.MONGO_URL
mongoose.connect(url, {useNewUrlParser: true})
.then( ()=> {
    console.log("connected to db")
})
.catch( (err)=> {
    console.log(`error connected to db ${err}`)
});


const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secrets: [{
      secret: String
  }]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id)
  .then( (user)=>{
      done(null, user)
  })
   .catch( (err)=>{
      done(err, null)
  })

});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
const info = profile._json  

    User.findOrCreate({username: info.email , googleId: info.sub }, function (err, user) {
      return cb(err, user);
    });
  }
));
/* facebook */
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
 callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
  
    User.findOrCreate({ username: profile.displayName, facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/* facebook get request */
app.get('/auth/facebook',
  passport.authenticate('facebook',{scope: 'public_profile'}));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

/* google get request */
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile", "email"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });
  
  /* app gets request */
app.get("/", function(req, res){
  res.render("home");
});
app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

 app.get("/secrets", async function(req, res){
 if (req.isAuthenticated()){
 
  const foundUsers = await User.find({"secrets": {$exists: true, $not: {$size: 0}}})
  //console.log(foundUsers)
  //.then( ()=>{
 res.render("secrets", {usersWithSecrets: foundUsers}); 
 
 
  /* })
   .catch( (err)=>{
       console.log(err) 
   })  */
    } else {
    res.redirect("/login");
  }
});

/* app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});  */

app.get("/submit", async function(req, res){
  if (req.isAuthenticated()){
 const userId = await User.findById(req.user.id)
 console.log(userId)
    res.render("submit", {user: userId, toEdit: ""});
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async function(req, res){
  const submittedSecret = req.body.secret;
const cus = {
    secret: submittedSecret
}
//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

 const foundUser = await User.findById(req.user.id)
 if(foundUser) { 
    foundUser.secrets.push(cus)
        foundUser.save()
          res.redirect("/secrets");
    }else{
        console.log(err)
    }
         
});

app.get("/logout", function(req, res){
  req.logout( function (err) {
  if(err){
        console.log(err)
        }
  });
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.post("/edit", function (req, res) {
   const editVal = req.body.passedVal;
   const delId = (req.body.hisId)
   const secretId = (req.body.del)
   console.log(delId, secretId)
   User.updateOne({_id: delId}, {$pull: {secrets: {_id: secretId}}})
   .then( async ()=>{
       const userId = await User.findById(req.user.id)
 console.log(userId)
    res.render("submit", {user: userId, toEdit: editVal});
   })
   .catch( (err)=> {
    console.log(`error connected to db ${err}`)
});
})
app.post("/delete", function (req, res) {
   const delId = (req.body.hisId)
   const secretId = (req.body.del)
   console.log(delId, secretId)
   User.updateOne({_id: delId}, {$pull: {secrets: {_id: secretId}}})
   .then( ()=>{
       res.redirect("/submit")
   })
   .catch( (err)=> {
    console.log(`error connected to db ${err}`)
});
})



app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
