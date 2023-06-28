//jshint esversion:6
require('dotenv').config()
const express = require("express")
const ejs = require("ejs")
const parser = require("body-parser")
const mongoose = require("mongoose")
const app = express()
const encrypt = require("mongoose-encryption")

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(parser.urlencoded({extended: true}))

const url = 'mongodb+srv://neilsupillo:ZQyxOzXjbdtpBVqW@eru.0yav6uh.mongodb.net/secretDb?retryWrites=true&w=majority';

mongoose.connect(url, {useNewUrlParser: true})
.then( ()=> {
    console.log("connected to db")
})
.catch( (err)=> {
    console.log(`error connected to db ${err}`)
});

const dataSchema = new mongoose.Schema({
    email: String,
    password: String
})
console.log(process.env.SECRET)
const secret = process.env.SECRET
dataSchema.plugin(encrypt,{secret: secret, encryptedFields: ['password']})

const Secret = new mongoose.model("secret", dataSchema)


app.get("/", function (req, res) {
    res.render("home")
});

app.route("/login")
 .get(function (req, res) {
    res.render("login")
})
 .post( async function (req, res) {
  const que = await Secret.findOne({email: req.body.username})
  console.log(que)
  //.then({
    if(que){ 
       if(que.password === req.body.password){
              res.render("secrets")
          }else{
              res.send("wrong password")
          }
      }else{
          res.send("not found")
      }
 // })
   
     
 });


app.route("/register")
.get( function (req, res) {
    res.render("register")
})
.post( function (req, res) {
    const newData = new Secret({
        email: req.body.username,
        password: req.body.password
    })
    newData.save()
    .then( ()=>{
     res.render("secrets")
        })
});

app.listen(3000, function () {
    console.log("up")
})

