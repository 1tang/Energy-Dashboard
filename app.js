var express    = require("express"),
    app        = express(),
    bodyParser = require('body-parser');


// has to go above the route handler
app.use(bodyParser.json()); 
app.set("view engine", "ejs");
app.use(express.static("public"));

// requiring main index route
app.use(require("./routes"));
// any other route catch-all
app.get("*", function(req, res) {
    res.send("Sorry page not found..");
});



//===========================
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Energy Dash Server has started");
});
