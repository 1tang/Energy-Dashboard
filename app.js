let express = require("express"),
    app = express(),
    bodyParser = require('body-parser');


//to go above the route handlers
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));


app.use(require("./routes"));

// any other route catch-all
app.get("*", function(req, res) {
    res.send("Sorry page not found..");
});

//===========================
app.listen(process.env.PORT, process.env.IP, () => {
    console.log("Energy Dashboard Server has started");
});
