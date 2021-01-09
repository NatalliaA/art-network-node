var express = require('express');
const exhibit = require('../models/exhibit');
var router = express.Router({mergeParams: true});
var Exhibit = require('../models/exhibit');
var Comment = require('../models/comment');
var middleware = require('../middleware');

//replace app variable with router 

//========================
//COMMENTS ROUTES
//========================
//NEW
router.get("/new", middleware.isLoggedIn, function(req, res){
    //find exhibit by id
    Exhibit.findById(req.params.id, function(err, exhibit){
        if(err)
        { req.flash('error', 'Something went wrong.');
        res.redirect('/exhibits');
        }
        else
        {res.render("comments/new", {exhibit: exhibit});}
    });    
});

//CREATE
router.post("/", middleware.isLoggedIn, function(req, res){
    //lookup exhibit using ID
    Exhibit.findById(req.params.id, function(err, exhibit){
        if(err)
        { req.flash('error', 'Something went wrong.');
            res.redirect('/exhibits');}
        else
        {
            //create a new comment
            Comment.create(req.body.comment, function(err, comment){
                if(err)
                {   //something wrong with db or data
                    req.flash('error', 'Something went wrong.');
                    res.redirect("/exhibits/" + exhibit._id);   
                }
                else
                {  
                    //connect new comment to exhibit
                    //add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;                   
                    //save comment
                    comment.save();
                    exhibit.comments.push(comment);
                    exhibit.save();
                    req.flash('success', 'Your comment has been added.');
                    console.log("COMMENT: " + comment);                    
                    //redirect back to exhibit's show page
                    res.redirect("/exhibits/" + exhibit._id);   
                }
            });
        }
    });
});

//EDIT
router.get('/:comment_id/edit', middleware.checkCommentOwnership, function(req, res){    
    //if someone change exhibit id in the browser, prevent from breaking the app
    Exhibit.findById(req.params.id, function(err, foundExhibit){
        if (err || !foundExhibit)
        {
            req.flash('error', 'Exhibit not found.');
            return  res.redirect('back');;
        }

        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment)
            {   req.flash('error', 'Comment not found');
                res.redirect('back');
            }
            else
            { //req.params.id - id is exhibit's id
            //comment_id - id of the comment
                res.render("comments/edit", {exhibit_id: req.params.id, comment: foundComment});
            }
        }); 
    })
    });

//UPDATE
router.put('/:comment_id', middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err)
        {   req.flash('error', 'Something went wrong.');
             res.redirect('back');}
        else
        {res.redirect('/exhibits/' + req.params.id);}
    });    
});

//DESTROY
router.delete('/:comment_id', middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err)
        {   req.flash('error', 'Something went wrong.');
            res.redirect('back');}
        else
        {   req.flash('success', "Your comment has been deleted.");
            res.redirect('/exhibits/' + req.params.id);}
    });
});

module.exports = router;