var mongoose = require('mongoose');

//SCHEMA SETUP
var exhibitSchema = new mongoose.Schema ({
    name: String,
    image: String,
    imageId: String,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

//compile schema inot a model
module.exports = mongoose.model("Exhibit", exhibitSchema);