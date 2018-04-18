var express = require("express"),
    router  = express.Router(),
    parseString = require('xml2js').parseString,
    moment = require('moment'),
    async = require('async'),
    mtz = require('moment-timezone'),
    Promise = require("bluebird"),
    request = Promise.promisifyAll(require("request"), {multiArgs: true});
    
// today's date formatted for bmreports
var todayDate = moment().format("YYYY-MM-DD");

// url's for live/current (today only) JSON and XML energy data
var solarInst = "https://www.solar.sheffield.ac.uk/ssfdb3/crud/nationalgrid/pvnowcast/0";
var fuelInst = "https://api.bmreports.com/BMRS/FUELINSTHHCUR/V1?APIKey=16hudca3onmwxcy&ServiceType=xml";
var todayGenFuel = "https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate="+todayDate+"&ToDate="+todayDate+"&ServiceType=xml";
var todaySolar = "https://api.bmreports.com/BMRS/B1630/V1?APIKey=16hudca3onmwxcy&SettlementDate="+todayDate+"&Period=*&ServiceType=xml";
var todayDemand = "https://api.bmreports.com/BMRS/INDOITSDO/V1?APIKey=16hudca3onmwxcy&FromDate="+todayDate+"&ToDate="+todayDate+"&ServiceType=xml";


// mutiple url requests using promises - uses the bluebird prmises library, serializing
//multiple url requests and accumuating the reults in the context object, rolling up error 
//handing at the end after page rendered
router.get("/live", function(req, res) {
    var context = {};
    request.getAsync(solarInst).spread(function(response, body) {
    context.one = JSON.parse(body);
    return request.getAsync(fuelInst);
    }).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.two = JSON.parse(JSON.stringify(result));
        });
    return request.getAsync(todayDemand);
    }).spread(function(response, body) {
    parseString(body, function (err, result) {
         if(err){
            console.log(err);
        }
        context.three = JSON.parse(JSON.stringify(result));
    });
       return request.getAsync(todayGenFuel);
    }).spread(function(response, body) {
    parseString(body, function (err, result) {
         if(err){
            console.log(err);
        }
        context.four = JSON.parse(JSON.stringify(result));
    });
        return request.getAsync(todaySolar);
    }).spread(function(response, body) {
    parseString(body, function (err, result) {
         if(err){
            console.log(err);
        }
        context.five = JSON.parse(JSON.stringify(result));
    }); // Live / current solar data 
        var solar = (context.one.generation_MW/1000);
        // Live / current non solar data 
        var ccgt = (context.two.response.responseBody[0].responseList[0].item[0].currentMW[0]/1000);
        var coal = (context.two.response.responseBody[0].responseList[0].item[3].currentMW[0]/1000);
        var nuclear = (context.two.response.responseBody[0].responseList[0].item[4].currentMW[0]/1000);
        var wind = (context.two.response.responseBody[0].responseList[0].item[5].currentMW[0]/1000);
        var biomass = (context.two.response.responseBody[0].responseList[0].item[13].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[8].currentMW[0]/1000);
        var ics = (context.two.response.responseBody[0].responseList[0].item[11].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[9].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[10].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[12].currentMW[0]/1000);
        var other = (context.two.response.responseBody[0].responseList[0].item[1].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[2].currentMW[0]/1000);
        var pumpHydro = (context.two.response.responseBody[0].responseList[0].item[6].currentMW[0]/1000);
        var hydro = (context.two.response.responseBody[0].responseList[0].item[7].currentMW[0]/1000);
        var totalAll = (context.two.response.responseBody[0].total[0].currentTotalMW[0]/1000)+(context.one.generation_MW/1000);
        // time and date formatting for live/current data
        var time = moment(context.two.response.responseBody[0].dataLastUpdated[0]).tz("Europe/London").format('h:mm a');
        var date = moment().format('dddd MMMM Do');
        
        // non solar data for current day
        var arrayToday = context.four.response.responseBody[0].responseList[0].item;
        var timeToday = []; 
        var ccgtToday = []; 
        var coalToday = [];
        var nuclearToday = [];
        var windToday = [];
        var biomassToday = [];
        var icsToday = [];
        var otherToday = [];
        var pumpHydroToday = [];
        var hydroToday = [];
        var hydroTodayAll = [];
        var totalToday = [];
        var totalMwhToday = 0;
        var totalFossilToday = 0;
        var totalRenewToday = 0;
        var totalLowcToday = 0;
        for(var i = 0; i<arrayToday.length; i++){ 
                var icsTotal = ((arrayToday[i].intfr[0])/1000)+((arrayToday[i].intirl[0])/1000)+((arrayToday[i].intned[0])/1000)+((arrayToday[i].intew[0])/1000);
                var othTotal = ((arrayToday[i].oil[0])/1000)+((arrayToday[i].ocgt[0])/1000);
                var bioTotal = ((arrayToday[i].other[0])/1000)+((arrayToday[i].biomass[0])/1000);
                var hydroTotal = ((arrayToday[i].npshyd[0])/1000)+((arrayToday[i].ps[0])/1000);
                // calculation for totalMWh within each item
                var allTotal = ((arrayToday[i].intfr[0])/1000)+((arrayToday[i].intirl[0])/1000)+((arrayToday[i].intned[0])/1000)+((arrayToday[i].intew[0])/1000)+((arrayToday[i].oil[0])/1000)+((arrayToday[i].ocgt[0])/1000)+((arrayToday[i].other[0])/1000)+((arrayToday[i].biomass[0])/1000)+((arrayToday[i].ps[0])/1000)+((arrayToday[i].npshyd[0])/1000)+((arrayToday[i].ccgt[0])/1000)+((arrayToday[i].coal[0])/1000)+((arrayToday[i].nuclear[0])/1000)+(((arrayToday[i].wind[0])/1000)*1.15);
                //populate arrays to pass over to EJS
                timeToday.push(arrayToday[i].settlementPeriod[0]);
                ccgtToday.push((arrayToday[i].ccgt[0])/1000);
                coalToday.push((arrayToday[i].coal[0])/1000) ;
                nuclearToday.push((arrayToday[i].nuclear[0])/1000);
                windToday.push((arrayToday[i].wind[0])/1000);
                hydroToday.push((arrayToday[i].npshyd[0])/1000);
                pumpHydroToday.push((arrayToday[i].ps[0])/1000);
                totalToday.push (allTotal);
                icsToday.push(icsTotal);
                otherToday.push(othTotal);
                biomassToday.push(bioTotal);
                hydroTodayAll.push(hydroTotal);
                // during each loop add cunulative totals for gran total, fossil fuels, renewables and low carbon, 
                // divided each figure by 2 as they represent half hour periods only
                totalMwhToday += allTotal/2;
                totalFossilToday += ((othTotal+(arrayToday[i].ccgt[0]/1000)+(arrayToday[i].coal[0]/1000))/2);
                totalRenewToday += ((bioTotal+(arrayToday[i].wind[0]/1000)+(arrayToday[i].npshyd[0]/1000))/2);
                totalLowcToday += ((icsTotal+(arrayToday[i].nuclear[0]/1000)+(arrayToday[i].ps[0]/1000))/2);
        }
        // solar only data for current day
        var arraySolarToday = context.five.response.responseBody[0].responseList[0].item;
        var solarToday = [];
        var totalSolarToday = 0;
        for(var t = arraySolarToday.length-1; t>=2; t-=3){
            solarToday.push((arraySolarToday[t].quantity[0])/1000);
            totalSolarToday += (((arraySolarToday[t].quantity[0]/1000)+(solar*2))/2);
        }
        // push two more values to solarToday array so length matches other today arrays
        solarToday.push(solar);
        solarToday.push(solar);
        // total half hourly array for all techs + solar combined (for use in demand line graph)
        var totalTodayWithSolar = solarToday.map((item,i) => item + totalToday[i]);
        
        // Demand data for current day
        var demLength = (context.three.response.responseBody[0].responseList[0].item).length;
         // most current demand with solar data added to indo variable
        // var indo = (context.three.response.responseBody[0].responseList[0].item[(demLength)].demand[0]/1000)+(context.one.generation_MW/1000);
        // today's demand
        var arrayDemandToday = context.three.response.responseBody[0].responseList[0].item;
        var demandTodayIndo = [];
        var demandTodayItsdo = [];
        var timeDem = [];
        for(var d = 0; d<(demLength/2); d++){
            demandTodayIndo.push((arrayDemandToday[d].demand[0])/1000);
            timeDem.push(arrayDemandToday[d].settlementPeriod[0]);
        }
        for(var e = (demLength/2); e<demLength; e++){
            demandTodayItsdo.push((arrayDemandToday[e].demand[0])/1000);
        }
        // console.log(totalTodayWithSolar);
        console.log(totalToday);
        // console.log(solarToday);
        
       
        
        // render page
        res.render("live", {context: context, solar: solar, time: time, date: date, ccgt: ccgt, coal: coal, nuclear: nuclear, wind: wind, biomass: biomass, ics: ics, other: other, pumpHydro: pumpHydro, hydro: hydro, totalAll: totalAll,
                            timeToday: timeToday, ccgtToday: ccgtToday, coalToday: coalToday, nuclearToday: nuclearToday, windToday: windToday, biomassToday: biomassToday, icsToday: icsToday, otherToday: otherToday, solarToday: solarToday, hydroToday: hydroToday,
                            pumpHydroToday: pumpHydroToday, hydroTodayAll: hydroTodayAll, totalMwhToday: totalMwhToday, totalFossilToday: totalFossilToday, totalRenewToday: totalRenewToday, totalLowcToday: totalLowcToday, totalSolarToday: totalSolarToday,
                            demandTodayIndo: demandTodayIndo, demandTodayItsdo: demandTodayItsdo, timeDem: timeDem, totalTodayWithSolar: totalTodayWithSolar, totalToday: totalToday});
    // error handling for bluebird promises   
    }).catch(function(err) {
    if(err){
        console.log(err);
    }
    });
});

module.exports = router;
    
    