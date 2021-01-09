var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var async = require('async');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
//for hiding variable values
require('dotenv').config();

//replace app variable with router 

//=================
//ROUTES
//=================

//ROOT ROUTE - landing page
router.get("/", function(req, res){
    res.render("landing");
});   

//======================
// AUTH ROUTES
//=====================    

//REGISTER/SIGNUP ROUTE

//Show signup form
router.get('/register', function(req, res){
    res.render('register');
});  
//handle signup logic
router.post('/register', function(req, res){
       var newUser = new User({
         username: req.body.username,
         email: req.body.email
        });

        User.register(newUser, req.body.password, function(err, user){
        if(err)
        {
            //err.message from passport package, displays corresponding error message 
            //flash with render: error message goes directly as the second argument
            return res.render('register', {error: err.message});                                
        }        
            passport.authenticate('local')(req, res, function(){
            req.flash('success', 'Welcome to WeSeeArt ' + user.username + '!');
            res.redirect('/exhibits');
            });        
    });
});

//LOGIN ROUTE

//show login form
router.get('/login', function(req, res){
    res.render('login');
});

//handle login logic
//2nd parameter is a middleware, which calls passport.use(new LocalStrategy(User.authenticate()));
//3d parameter is a callback that doesn't do anything, we just keep it to show 
//that the 2nd parameter is in the middle (middleware)
router.post('/login', passport.authenticate('local', 
    {
        successRedirect: '/exhibits',
        failureRedirect: '/login',
        failureFlash: true,
        successFlash: 'Welcome to WeeSeeArt!'

    }), function(req, res){    
});

//LOGOUT ROUTE

router.get('/logout', function(req, res) {
    req.logout();
    req.flash('success', "See you next time!")
    res.redirect('/exhibits');
});

//FORGOT PASSWORD ROUTE
router.get('/forgot', function(req, res){
    res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No user with that email address has been found.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PW
          }
        });
        var mailOptions = {
          to: user.email,
          from: process.env.EMAIL,
          subject: 'WeeSeeArt Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\n' +
            'Your WeeSeeArt\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          if(err){
            console.log('mail NOT sent');
            req.flash('error', 'Sorry. We could not reach that email.');
            return res.redirect('/forgot');
          }
          console.log('mail sent');
          req.flash('success', 'An email has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      
      if (err) 
      {
        console.log('mail WAS NOT sent');        
        return next(err.message);        
      }      
      res.redirect('/exhibits');
    });
  });

  //RESET TOKEN ROUTE
  
  router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PW
          }
        });
        var mailOptions = {
          to: user.email,
          from: process.env.EMAIL,
          subject: 'Your password for WeeSeeArt has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n\n' +
            'Your WeeSeeArt\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/exhibits');
    });
  });

module.exports = router;