var express = require("express"),
    router  = express.Router(),
    parseString = require('xml2js').parseString,
    moment = require('moment'),
    mtz = require('moment-timezone'),
    async = require('async'),
    Promise = require("bluebird"),
    request = Promise.promisifyAll(require("request"), {multiArgs: true});
    
router.get("/fourtyeight", function(req, res) {
    var todayDate = moment().format("YYYY-MM-DD");
    var yestDate = moment().subtract(1, 'days').format("YYYY-MM-DD");
    // url for past 48 hrs xml data (not solar)
    var solarInst = "https://www.solar.sheffield.ac.uk/ssfdb3/crud/nationalgrid/pvnowcast/0";
    var fuelInst = "https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate="+yestDate+"&ToDate="+todayDate+"&ServiceType=xml";
    var todaySolar = "https://api.bmreports.com/BMRS/B1630/V1?APIKey=16hudca3onmwxcy&SettlementDate="+todayDate+"&Period=*&ServiceType=xml";
    var yestSolar = "https://api.bmreports.com/BMRS/B1630/V1?APIKey=16hudca3onmwxcy&SettlementDate="+yestDate+"&Period=*&ServiceType=xml";
   
    
    var context = {};
    request.getAsync(solarInst).spread(function(response, body) {
    context.one = JSON.parse(body);
    return request.getAsync(fuelInst)
    }).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.two = JSON.parse(JSON.stringify(result));
        });
    return request.getAsync(todaySolar);
    }).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.three = JSON.parse(JSON.stringify(result));
        });
    return request.getAsync(yestSolar);
    }).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.four = JSON.parse(JSON.stringify(result));
        });
    
    var solar = (context.one.generation_MW/1000);
    
    var array48 = context.two.response.responseBody[0].responseList[0].item;
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
        
        // solar only data for current day
    var arraySolarToday = context.three.response.responseBody[0].responseList[0].item;
    var arraySolarYest = context.four.response.responseBody[0].responseList[0].item;
    var solarToday = [];
    var solarYest = [];
    
    for(var t = arraySolarToday.length-1; t>=2; t-=3){
        solarToday.push((arraySolarToday[t].quantity[0])/1000);
    }
    for(var s = arraySolarYest.length-1; s>=2; s-=3){
        solarYest.push((arraySolarYest[s].quantity[0])/1000);
    }
    // push two more values to solarToday array so length matches other today arrays, first is an average
    solarToday.push(solar);
    solarToday.push((solar + (solarToday[solarToday.length-1]))/2);
    
    // combined solar arrays 48 hours 
    var solarCombined48 = solarYest.concat(solarToday);
    // cumulative total solar
    var totalSolar48 = 0;
    solarCombined48.forEach(function (item) {
        totalSolar48 += item/2;
    });
    
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
    // published onshore & offshore figs from B1410 ***needs updating***
    var onshoreWindCap = 12.097;
    var offshoreWindCap = 7.114;
    // national grid latest estimate for embedded wind and solar, from demand data update   
    // at https://www.nationalgrid.com/uk/electricity/market-operations-and-data/data-explorer ***needs updating***
    var embeddedEstimateWind = 5.978;
    var embeddedEstimateSolar = 13.077;
    // wind capacity net of embedded i.e. what is metered by NG
    var meteredWindCap = (Number(onshoreWindCap)+Number(offshoreWindCap)-embeddedEstimateWind); //13.233GW
    // wind array incl estimated embedded generation ** simplistic calculation
    // var embeddedWindToday2 = windToday.map((item, i) => item + ((item/meteredWindCap)*embeddedEstimateWind ));
    // console.log(embeddedWindToday2[embeddedWindToday2.length-1])
    // scale up offshore contribution (1.1645) based on 26.6% / 37.2% load factor & then calculate actual onshore load factor, * embedded estimate then add to metered wind output
    var embeddedWind48 = wind.map((item, i) => (((item-(((offshoreWindCap/meteredWindCap)*item)*1.1645))/(onshoreWindCap-embeddedEstimateWind))*embeddedEstimateWind)+item);
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
                               embeddedTotal: embeddedTotal, embeddedWind48: embeddedWind48, totalMwhEmbedded: totalMwhEmbedded, totalFossil48: totalFossil48, renewTotalCumul: renewTotalCumul, totalLowc48: totalLowc48, solarCombined48: solarCombined48});
    // res.send(context.thre)
   // error handling for bluebird promises   
    }).catch(function(err) {
    if(err){
        console.log(err);
    }
    });
});

module.exports = router;