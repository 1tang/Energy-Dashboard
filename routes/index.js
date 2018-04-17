var express = require("express");
var router  = express.Router();

router.use("/", require("./live"));
router.use("/", require("./twentyfour"));

//root route
router.get("/", function(req, res){
    res.render("landing");
});

// contact route
router.get("/contact", function(req, res) { 
    res.render("contact");
});

// about route
router.get("/about", function(req, res) { 
    res.render("about");
});



module.exports = router;