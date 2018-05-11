var express = require("express");
var router  = express.Router();

router.use("/", require("./live"));
router.use("/", require("./fourtyeight"));

//root route
router.get("/", function(req, res){
    res.redirect("/live");
});

// contact route
router.get("/contact", function(req, res) { 
    res.render("contact");
});

// about route
router.get("/about", function(req, res) { 
    res.render("about");
});

// data sources route
router.get("/data", function(req, res) { 
    res.render("data");
});

// embedded generation route
router.get("/embedded", function(req, res) { 
    res.render("embedded");
});

module.exports = router;