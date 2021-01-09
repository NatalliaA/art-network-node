var express = require('express');
var exhibit = require('../models/exhibit');
var router = express.Router();
var Exhibit = require('../models/exhibit');
var middleware = require('../middleware');
//for hiding api key/secret
require('dotenv').config();

//for image upload
var multer = require('multer');
var storage = multer.diskStorage({
    //create a custom name
  filename: function(req, file, callback) {  
      callback(null, Date.now() + file.originalname);
  }
});


var upload = multer({ storage: storage}).single('image');

var cloudinary = require('cloudinary');
const { register } = require('../models/user');
cloudinary.config({ 
  cloud_name: 'addedpictures', 
  api_key: process.env.CLOUDINARY_API_KEY,  
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//replace app variable with router 

//ROUTES
//INDEX - show all exhibits
router.get("/", function(req, res){

    //get all exhibits from db
    Exhibit.find({}, function (err, allexhibits){
       if(err){
            req.flash('error', 'Something went wrong');
            res.redirect('/exhibits');           
       }
       else
       {//add found exhibits in db to the page "exhibits"
           res.render("exhibits/index", {exhibits: allexhibits, currentUser: req.user});
       }
})
});

//NEW - show form to create a new exhibit
router.get("/new", middleware.isLoggedIn, function(req, res){
    var nameinput="";
    var descriptioninput="";
         res.render('exhibits/new',
         {
             name: nameinput,
             desciption: descriptioninput
         }); 
});

//CREATE - add a new exhibit to DB
router.post("/", middleware.isLoggedIn, upload, function(req, res) {
    
    var name= req.body.exhibit.name;
    var desciption= req.body.exhibit.description;
    console.log("NAME: " + name);
    console.log("DESCR: " + desciption);
    
if(!req.file.originalname.match(/\.(jpg|jpeg|png)$/i))
{    
     res.render('exhibits/new', 
    {
        name: name,
        desciption: desciption,
        error: 'Only .png/.jpg/.jpeg image format allowed.'        
    } );      
}
else
{
    //takes req.file.path, returns result
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
        if(err)
        {
            req.flash('error', err.message);
            return res.redirect('/exhibits/' + exhibit.id);
        }
      // add cloudinary url for the image to the exhibit object under image property
      //secure_url,public_id come from cloudinary API 
      req.body.exhibit.image = result.secure_url;
      //add image's public_id to exhibit object
      req.body.exhibit.imageId = result.public_id;
      // add author to exhibit
      req.body.exhibit.author = {
        id: req.user._id,
        username: req.user.username
      }
      Exhibit.create(req.body.exhibit, function(err, exhibit) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        req.flash('success', 'You post has been added.');   
        res.redirect('/exhibits/' + exhibit.id);
      });
    });
    }
});

//SHOW - show info about a cprecific exhibit
//make show it is after exhibits/new otherwise new can be read as id
router.get("/:id", function(req, res){
   //find the exhibit with provided id
   //populate - add comments' content and autor to the exhibit
   Exhibit.findById(req.params.id).populate("comments").exec(function(err, foundExhibit){
       if(err || !foundExhibit)
           {
                req.flash('error', 'Exhibit not found.');
                res.redirect('/exhibits'); 
            }
       else
       {
           console.log("Found Exhibit: " + foundExhibit);
            //render show template with that exhibit
           res.render("exhibits/show", {exhibit: foundExhibit});
       }
   });   
});

//EDIT
router.get('/:id/edit', middleware.checkExhibitOwnership, function(req, res){
    
    //if user is exhibit's owner open edit form
        Exhibit.findById(req.params.id, function(err, foundExhibit){
            if(err)
            {   //did not found exhibit
                req.flash('error', 'Exhibit not found.');
                res.redirect('/exhibits');
            }
            else
            {//found exhibit
            res.render('exhibits/edit', {exhibit: foundExhibit});}               
        });        
});

//UPDATE
router.put('/:id', middleware.checkExhibitOwnership, upload, function(req, res){   
        //find the correct exhibit
        Exhibit.findById(req.params.id, async function(err, exhibit){
         if(err)
            {   
            req.flash('error', err.message);
            res.redirect('/exhibits');
            }
        else
            {   
                //check if req.file exists: user uploads a new image for this exhibit
                if(req.file)
                {

                    //check image file format
                    if(!req.file.originalname.match(/\.(jpg|jpeg|png)$/i))
                    {
                          //var oldimage = exhibit.image;  
                        //req.body.exhibit.image = oldimage;
                       // return res.render('exhibits/edit', 
                        /* {
                            exhibit: req.body.exhibit,
                            error: 'Only .png, .jpg and .jpeg image format allowed!'

                        });  */
                       req.flash('error', 'Only .png/.jpg/.jpeg image format allowed.');
                        return res.redirect('back');                          
                     }

                    
                    try{
                        //delete the previos image from cloudinary
                        //await means wait untill destroy finishes and then goe to next line
                        //by default in Javascript or Node.js all callbacks are synchronous
                        await cloudinary.v2.uploader.destroy(exhibit.imageId);                                             
                        //upload a new image
                        var result = await  cloudinary.v2.uploader.upload(req.file.path);                        
                        //take the result and pull a new url for image
                        exhibit.imageId = result.public_id;
                        exhibit.image = result.secure_url;
                    }
                    catch(err)
                    {
                        req.flash('error', err.message);
                        return res.redirect('/exhibits');
                    }             
                }
                           
                //update other exhibit's info
                 exhibit.name = req.body.exhibit.name;
                 exhibit.description = req.body.exhibit.description;
                 //save in db
                 exhibit.save();

                // redirect to exhibit's show page    
                req.flash('success', 'Your post has been updated.');    
                res.redirect('/exhibits/' + req.params.id);
            }
            });    
    });


//DESTROY
router.delete('/:id', middleware.checkExhibitOwnership, function(req, res){
    Exhibit.findById(req.params.id, async function(err, exhibit){
        if(err)
        {   req.flash('error', err.message);
            return res.redirect('/exhibits'); 
        }
        
        try
          {//delete image from cloudinary
            await cloudinary.v2.uploader.destroy(exhibit.imageId);    
            //delete exhibit from db
            exhibit.remove();
            req.flash('success', "Your post has been deleted.");
            res.redirect("/exhibits");
          }
        catch(err)
          {  req.flash('error', err.message);
          return res.redirect('/exhibits/' + req.params.id);}
    });
});

module.exports = router;