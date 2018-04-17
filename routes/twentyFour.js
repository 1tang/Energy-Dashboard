var express = require("express");
var   router  = express.Router(),
    parseString = require('xml2js').parseString,
    moment = require('moment'),
    async = require('async'),
    mtz = require('moment-timezone'),
    request = require("request");

var urlFuelInst = "https://api.bmreports.com/BMRS/FUELINST/V1?APIKey=16hudca3onmwxcy&ServiceType=xml";

router.get("/twentyfour", function(req, res) {
    request(urlFuelInst, function(error, response, body){
        if(!error && response.statusCode == 200){
        var dataAll24 = body;
        }
        parseString(dataAll24, function (err, result) {
            if(err){
                console.log(err);
            }
            var json = JSON.parse(JSON.stringify(result));
            var array = json.response.responseBody[0].responseList[0].item;
            var time24 = []; 
            var ccgt = []; 
            var coal = [];
            var nuclear = [];
            var wind = [];
            var biomass = [];
            var ics = [];
            var other = [];
            
            for(var i = 0; i<array.length; i++){ 
                var icsTot = ((array[i].intfr[0])/1000)+((array[i].intirl[0])/1000)+((array[i].intned[0])/1000)+((array[i].intew[0])/1000);
                var othTot = ((array[i].oil[0])/1000)+((array[i].ps[0])/1000)+((array[i].npshyd[0])/1000)+((array[i].ocgt[0])/1000)+((array[i].other[0])/1000);
                time24.push(array[i].publishingPeriodCommencingTime[0]);
                ccgt.push((array[i].ccgt[0])/1000).toFixed(3); 
                coal.push((array[i].coal[0])/1000).toFixed(3); 
                nuclear.push((array[i].nuclear[0])/1000).toFixed(3); 
                wind.push((array[i].wind[0])/1000).toFixed(3); 
                biomass.push((array[i].biomass[0])/1000).toFixed(3); 
                ics.push((icsTot.toFixed(3)));
                other.push((othTot.toFixed(3)));
            }
            var time = [];
            
            for(var t = 0; t<time24.length; t++){ 
                time.push(moment(time24[t]).format('h'));
            }
            res.render("twentyFour", {time: time, ccgt: ccgt, coal: coal, nuclear: nuclear, wind: wind, biomass: biomass, ics: ics, other: other});
        });
        
    });
});

module.exports = router;