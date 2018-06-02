var express = require("express"),
    router  = express.Router(),
    parseString = require('xml2js').parseString,
    moment = require('moment'),
    mtz = require('moment-timezone'),
    async = require('async'),
    Promise = require("bluebird"),
    request = Promise.promisifyAll(require("request"), {multiArgs: true});
    
// mutiple url requests using promises - uses the bluebird prmises library, serializing
//several url requests and accumuating the reults in the context object, rolling up error 
//handing at the end after page rendered
router.get("/fourtyeight", function(req, res) {
    var todayDate = moment().format("YYYY-MM-DD");
    var yestDate = moment().subtract(1, 'days').format("YYYY-MM-DD");
    var yestDateSolar = moment().subtract(2, 'days').format("YYYY-MM-DD");
    // url's for past 48 hrs json & xml data
    var fuelInst = "https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate="+yestDate+"&ToDate="+todayDate+"&ServiceType=xml";
    var todayYestSolar = "https://api0.solar.sheffield.ac.uk/pvlive/v1?start="+yestDateSolar+"T23:30:00&end="+todayDate+"T23:59:59";
    var context = {};
    request.getAsync(fuelInst).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.one = JSON.parse(JSON.stringify(result));
        });
    return request.getAsync(todayYestSolar);
    }).spread(function(response, body) {
        context.two = JSON.parse(body);
        
     // 48 hr generation data (going back every 30 mins)
    var array48 = context.one.response.responseBody[0].responseList[0].item;
    var timePeriod = []; 
    var ccgt = []; 
    var coal = [];
    var nuclear = [];
    var wind = [];
    var biomass = [];
    var ics = [];
    var other = [];
    var hydro = [];
    var date = [];
    var total48 = [];
    var total48NoWind = [];
    var totalMwh48 = 0;
    var totalMwh48NoWind = 0;
    var totalFossil48 = 0;
    var totalRenew48NoWind = 0;
    var totalLowc48 = 0;
    // populate arrays and total variables
    for(var i = 0; i<array48.length; i++){ 
        var allTotal = ((array48[i].intfr[0])/1000)+((array48[i].intirl[0])/1000)+((array48[i].intned[0])/1000)+((array48[i].intew[0])/1000)+((array48[i].oil[0])/1000)+((array48[i].ocgt[0])/1000)+((array48[i].other[0])/1000)+((array48[i].biomass[0])/1000)+((array48[i].ps[0])/1000)+((array48[i].npshyd[0])/1000)+((array48[i].ccgt[0])/1000)+((array48[i].coal[0])/1000)+((array48[i].nuclear[0])/1000)+(((array48[i].wind[0])/1000));
        var allTotalNoWind = ((array48[i].intfr[0])/1000)+((array48[i].intirl[0])/1000)+((array48[i].intned[0])/1000)+((array48[i].intew[0])/1000)+((array48[i].oil[0])/1000)+((array48[i].ocgt[0])/1000)+((array48[i].other[0])/1000)+((array48[i].biomass[0])/1000)+((array48[i].ps[0])/1000)+((array48[i].npshyd[0])/1000)+((array48[i].ccgt[0])/1000)+((array48[i].coal[0])/1000)+((array48[i].nuclear[0])/1000);
        var icsTotal = ((array48[i].intfr[0])/1000)+((array48[i].intirl[0])/1000)+((array48[i].intned[0])/1000)+((array48[i].intew[0])/1000);
        var othTotal = ((array48[i].oil[0])/1000)+((array48[i].ocgt[0])/1000);
        var bioTotal = ((array48[i].other[0])/1000)+((array48[i].biomass[0])/1000);
        var hydroTotal = ((array48[i].npshyd[0])/1000)+((array48[i].ps[0])/1000);
        timePeriod.push(array48[i].settlementPeriod[0]);
        total48.push(allTotal);
        total48NoWind.push(allTotalNoWind);
        ccgt.push((array48[i].ccgt[0])/1000).toFixed(3); 
        coal.push((array48[i].coal[0])/1000).toFixed(3); 
        nuclear.push((array48[i].nuclear[0])/1000).toFixed(3); 
        wind.push((array48[i].wind[0])/1000).toFixed(3); 
        date.push(array48[i].startTimeOfHalfHrPeriod[0]);
        ics.push((icsTotal.toFixed(3)));
        other.push((othTotal.toFixed(3)));
        hydro.push((hydroTotal.toFixed(3)));
        biomass.push((bioTotal.toFixed(3)));
        totalMwh48 += (allTotal/2);
        totalMwh48NoWind += (allTotalNoWind/2);
        totalFossil48 += ((othTotal+icsTotal+((array48[i].ccgt[0])/1000)+((array48[i].coal[0])/1000)+((array48[i].ps[0])/1000))/2);
        totalRenew48NoWind += ((bioTotal+((array48[i].npshyd[0])/1000))/2);
        totalLowc48 += ((array48[i].nuclear[0])/1000)/2;
    }
        
    // solar data for past 48 hrs
    var solar48 = context.two.data;
    var arraySolar48 = [];
    
    for(var t = 0; t<solar48.length; t++){
        if (solar48[t][2] == null) {
            solar48[t][2] = 0;
        }
        arraySolar48.push(solar48[t][2]/1000);
    }
    
    // cumulative total solar
    var totalSolar48 = 0;
    arraySolar48.forEach(function (item) {
        totalSolar48 += item/2;
    });
    
    // convert national grid setttlement period to normal hourly time
    var convertTime = [];
    timePeriod.forEach(function(period){
    	var seconds = period*30*60;
    	if((seconds/60/60)<10){
    	    var hours = "0" + Math.floor(seconds/60/60);
    	}
    	else {
    	    var hours = Math.floor(seconds/60/60);
    	}
    	if((seconds/60)-(hours*60) === 0){
        	var minutes = 0;
    		convertTime.push((hours+":"+minutes.toFixed(0))+0);
        } else {
    		var minutes2 = (seconds/60)-(hours*60);
    		convertTime.push(hours+":"+minutes2.toFixed(0));
        }
    });
      
    var dateTime = date.map((item,i) => item + " " + convertTime[i]);
    var timeArray = [];
    dateTime.forEach(function (item){
        timeArray.push(moment(item).format("MMM Do H:mm"));
    });
    
    var timeTo = timeArray[(timePeriod.length)-1] ;
    var timeFrom = timeArray[0];
    
    //calculations for embedded wind generation, using national grids estimated embedded capacity figs (currently 5.978GW )
    // published onshore & offshore figs from renewable UK ***needs updating***
    var onshoreWindCap = 12.097;
    var offshoreWindCap = 7.114;
    // national grid latest estimate for embedded wind and solar, from demand data update   
    // at https://www.nationalgrid.com/uk/electricity/market-operations-and-data/data-explorer ***needs updating***
    var embeddedEstimateWind = 5.978;
    var embeddedEstimateSolar = 13.077;
    // wind capacity net of embedded i.e. what is metered by NG
    var meteredWindCap = (Number(onshoreWindCap)+Number(offshoreWindCap)-embeddedEstimateWind); //13.233GW
   
    // scale up offshore contribution ( prev 1.1645) based on 26.6% / 37.2% load factor & then calculate actual onshore load factor, * embedded estimate then add to metered wind output
    var embeddedWind48 = wind.map((item, i) => (((item-(((offshoreWindCap/meteredWindCap)*item)*1.28))/(onshoreWindCap-embeddedEstimateWind))*embeddedEstimateWind)+item);
    // new array with total generation incl embedded wind (not solar)
    var embeddedTotal = total48NoWind.map((item,i) => item + embeddedWind48[i]);
    var totalMwhEmbedded = totalSolar48;
    embeddedTotal.forEach(function (item) {
        totalMwhEmbedded += (item/2);
    });
    // total cumulative renewables
    var embeddedWindCumul = 0;
    embeddedWind48.forEach(function (item){
        embeddedWindCumul += item/2;
    });
    var renewTotalCumul = totalRenew48NoWind + totalSolar48 + embeddedWindCumul;
    
    res.render("fourtyeight", {timePeriod: timePeriod, timeTo: timeTo, timeFrom: timeFrom, ccgt: ccgt, coal: coal, nuclear: nuclear, wind: wind, biomass: biomass, ics: ics, other: other, hydro: hydro,
                              embeddedTotal: embeddedTotal, embeddedWind48: embeddedWind48, totalMwhEmbedded: totalMwhEmbedded, totalFossil48: totalFossil48, renewTotalCumul: renewTotalCumul, totalLowc48: totalLowc48, arraySolar48: arraySolar48});
   // error handling for bluebird promises   
    }).catch(function(err) {
    if(err){
        console.log(err);
    }
    });
});

module.exports = router;