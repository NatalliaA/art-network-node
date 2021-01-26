var express                 = require("express"),
    app                     = express(),
    bodyParser              = require("body-parser"),
    mongoose                = require("mongoose"),
    passport                = require("passport"),
    methodOverride          = require('method-override'),
    LocalStrategy           = require("passport-local"), 
    flash                   = require("connect-flash"),
    Exhibit                 = require("./models/exhibit"),
    Comment                 = require ("./models/comment"),
    User                    = require("./models/user"),
    seedDB                  = require("./seeds");

//for hiding api key/secret
require('dotenv').config();

//requiring routes
var exhibitsRoutes = require('./routes/exhibits'),
    commentsRoutes    = require('./routes/comments'),
    indexRoutes       = require('./routes/index'); 
    
//connect to db
//production: create and connect to DB hosted on MongoDB Atlas
var dbUrl = process.env.DB_URL || "mongodb://localhost/artdb";
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
.then(()=> console.log ("Connect to DB!"))
.catch(error => console.log (error.message));
   
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname +'/public'));
app.use(methodOverride('_method'));
app.use(flash());
//seed the database with data from seeds.js file which doesn't save manualy added exhibs and comments
//once you leave the website
//seedDB();

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//CURRENTUSER

app.use(function(req, res, next){
    //middleware for including currentUser: req.user on every route, in every template
    res.locals.currentUser = req.user;
    //middleware for including message in every template
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});    

//use files with routes
app.use('/' , indexRoutes);
app.use('/exhibits', exhibitsRoutes);
app.use('/exhibits/:id/comments', commentsRoutes);

app.use('*', function(req, res, next){
    req.flash('error', 'Page not found.');
    res.redirect("/exhibits");
});

app.listen(3000, function(){
    console.log("Art server has started.");
});
