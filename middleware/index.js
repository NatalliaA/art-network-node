// all the middleware goes here
var Exhibit = require('../models/exhibit');
var Comment = require('../models/comment');

var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    //message
    req.flash('error', 'You need to log in first.');
    res.redirect('/login');
}

middlewareObj.checkExhibitOwnership = function(req, res, next){
        //is user logged in
        if(req.isAuthenticated())
        {
                Exhibit.findById(req.params.id, function(err, foundExhibit){
                if(err || !foundExhibit)
                {
                    req.flash('error', "Exhibit not found.")
                    res.redirect(`/exhibits/${req.params.id}`);
                }
                else
                {
                    //does user own the exhibit?
                    // don't use this exhibit.author.id === req.user._id, the left one is actually not a String
                    //even thogh they look the same, use equals instead
                    if(foundExhibit.author.id.equals(req.user._id))
                    {next();}
                    else
                    {   //message
                        req.flash('error', 'You do not have permission for that action.');
                        //not the exhibit owner - redirect
                        res.redirect(`/exhibits/${req.params.id}`);
                    }
                }
            });            
        }
        else
        {
            //if user is not logged in, redirect back where user came from
            //message
            req.flash('error', 'You need to log in first.');        
            res.redirect(`/exhibits/${req.params.id}`);
        }   
};

middlewareObj.checkCommentOwnership = function(req, res, next){
    //is user logged in
    if(req.isAuthenticated())
    {
            Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment)
            {
                req.flash('error', 'Comment not found.');
                res.redirect(`/exhibits/${req.params.id}`);
            }
            else
            {   //user owns the comment
                // don't use this foundComment.author.id === req.user._id, the left one is actually not a String
                //even though they look the same, use equals instead
                if(foundComment.author.id.equals(req.user._id))
                {next();}
                else
                {  //not the exhibit owner - message and redirect
                    req.flash('error', 'You do not have permission for that action.');
                    res.redirect(`/exhibits/${req.params.id}`);
                }
            }
        });            
    }
    else
    {
        //if user is not logged in, redirect back where user came from 
        req.flash('error', 'Please log in first.');       
        res.redirect(`/exhibits/${req.params.id}`);
    } 
}

module.exports = middlewareObj;