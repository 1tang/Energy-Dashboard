var express    = require("express"),
    app        = express(),
    bodyParser = require('body-parser');

// requiring routes
var indexRoute = require("./routes/index"),
    twentyFourRoute = require("./routes/twentyFour");

// has to go above the route handler
app.use(bodyParser.json()); 
app.set("view engine", "ejs");
app.use("/", require("./routes/index"));
// app.use("/", require("./routes/test"));
app.use(express.static("public"));

app.get("/contact", function(req, res) { 
    res.render("contact");
});

app.get("/about", function(req, res) { 
    res.render("about");
});

app.get("*", function(req, res) {
    res.send("Sorry page not found..");
});

app.use("/", indexRoute);
app.use("/24hr", twentyFourRoute);

//===========================
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Energy Dash Server has started");
});
