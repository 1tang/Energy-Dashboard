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
router.get("/live", function(req, res) {
    // today's date formatted for bmreports
    var todayDate = moment().format("YYYY-MM-DD");

    // url's for live/current (today only) JSON and XML energy data
    var solarInst = "https://www.solar.sheffield.ac.uk/ssfdb3/crud/nationalgrid/pvnowcast/0";
    var fuelInst = "https://api.bmreports.com/BMRS/FUELINSTHHCUR/V1?APIKey=16hudca3onmwxcy&ServiceType=xml";
    var todayGenFuel = "https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate="+todayDate+"&ToDate="+todayDate+"&ServiceType=xml";
    var todaySolarWind = "https://api.bmreports.com/BMRS/B1630/V1?APIKey=16hudca3onmwxcy&SettlementDate="+todayDate+"&Period=*&ServiceType=xml";
    var todayDemand = "https://api.bmreports.com/BMRS/INDOITSDO/V1?APIKey=16hudca3onmwxcy&FromDate="+todayDate+"&ToDate="+todayDate+"&ServiceType=xml";

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
        return request.getAsync(todaySolarWind);
    }).spread(function(response, body) {
        parseString(body, function (err, result) {
             if(err){
                console.log(err);
            }
            context.five = JSON.parse(JSON.stringify(result));
    }); 

     // Live / current solar data ( every 30 mins)
    var solar = (context.one.generation_MW/1000);
    // Live / current non solar data (every 5 mins)
    var ccgt = (context.two.response.responseBody[0].responseList[0].item[0].currentMW[0]/1000);
    var coal = (context.two.response.responseBody[0].responseList[0].item[3].currentMW[0]/1000);
    var nuclear = (context.two.response.responseBody[0].responseList[0].item[4].currentMW[0]/1000);
    var wind = (context.two.response.responseBody[0].responseList[0].item[5].currentMW[0]/1000);
    var biomass = (context.two.response.responseBody[0].responseList[0].item[13].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[8].currentMW[0]/1000);
    var ics = (context.two.response.responseBody[0].responseList[0].item[11].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[9].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[10].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[12].currentMW[0]/1000);
    var other = (context.two.response.responseBody[0].responseList[0].item[1].currentMW[0]/1000)+(context.two.response.responseBody[0].responseList[0].item[2].currentMW[0]/1000);
    var pumpHydro = (context.two.response.responseBody[0].responseList[0].item[6].currentMW[0]/1000);
    var hydro = (context.two.response.responseBody[0].responseList[0].item[7].currentMW[0]/1000);
    var total = (context.two.response.responseBody[0].total[0].currentTotalMW[0]/1000);
    var totalAll = (context.two.response.responseBody[0].total[0].currentTotalMW[0]/1000)+(context.one.generation_MW/1000);
    // time and date formatting for live/current data
    var time = moment(context.two.response.responseBody[0].dataLastUpdated[0]).tz("Europe/London").format('h:mm A');
    var date = moment().format('dddd Do MMMM');
    
    // non solar data for current day
    var arrayToday = context.four.response.responseBody[0].responseList[0].item;
    var timePeriodToday = []; 
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
    var totalTodayNoWind = [];
    var totalFossilToday = 0;
    var totalRenewToday = 0;
    var totalLowcToday = 0;
    for(var i = 0; i<arrayToday.length; i++){ 
            var icsTotal = ((arrayToday[i].intfr[0])/1000)+((arrayToday[i].intirl[0])/1000)+((arrayToday[i].intned[0])/1000)+((arrayToday[i].intew[0])/1000);
            var othTotal = ((arrayToday[i].oil[0])/1000)+((arrayToday[i].ocgt[0])/1000);
            var bioTotal = ((arrayToday[i].other[0])/1000)+((arrayToday[i].biomass[0])/1000);
            var hydroTotal = ((arrayToday[i].npshyd[0])/1000)+((arrayToday[i].ps[0])/1000);
            // calculation for totalMWh within each item
            var allTotal = ((arrayToday[i].intfr[0])/1000)+((arrayToday[i].intirl[0])/1000)+((arrayToday[i].intned[0])/1000)+((arrayToday[i].intew[0])/1000)+((arrayToday[i].oil[0])/1000)+((arrayToday[i].ocgt[0])/1000)+((arrayToday[i].other[0])/1000)+((arrayToday[i].biomass[0])/1000)+((arrayToday[i].ps[0])/1000)+((arrayToday[i].npshyd[0])/1000)+((arrayToday[i].ccgt[0])/1000)+((arrayToday[i].coal[0])/1000)+((arrayToday[i].nuclear[0])/1000)+(((arrayToday[i].wind[0])/1000));
            var allTotalNoWind = ((arrayToday[i].intfr[0])/1000)+((arrayToday[i].intirl[0])/1000)+((arrayToday[i].intned[0])/1000)+((arrayToday[i].intew[0])/1000)+((arrayToday[i].oil[0])/1000)+((arrayToday[i].ocgt[0])/1000)+((arrayToday[i].other[0])/1000)+((arrayToday[i].biomass[0])/1000)+((arrayToday[i].ps[0])/1000)+((arrayToday[i].npshyd[0])/1000)+((arrayToday[i].ccgt[0])/1000)+((arrayToday[i].coal[0])/1000)+((arrayToday[i].nuclear[0])/1000);
            
            //populate arrays to pass over to EJS
            timePeriodToday.push(arrayToday[i].settlementPeriod[0]);
            ccgtToday.push((arrayToday[i].ccgt[0])/1000);
            coalToday.push((arrayToday[i].coal[0])/1000) ;
            nuclearToday.push((arrayToday[i].nuclear[0])/1000);
            windToday.push((arrayToday[i].wind[0])/1000);
            hydroToday.push((arrayToday[i].npshyd[0])/1000);
            pumpHydroToday.push((arrayToday[i].ps[0])/1000);
            totalToday.push (allTotal);
            totalTodayNoWind.push (allTotalNoWind);
            icsToday.push(icsTotal);
            otherToday.push(othTotal);
            biomassToday.push(bioTotal);
            hydroTodayAll.push(hydroTotal);
            // during each loop add cumulative totals for fossil fuels, renewables and low carbon, 
            // each figure divided by 2 as they represent half hour periods only
            totalFossilToday += ((othTotal+icsTotal+((arrayToday[i].ccgt[0])/1000)+((arrayToday[i].coal[0])/1000)+((arrayToday[i].ps[0])/1000))/2);
            totalRenewToday += ((bioTotal+((arrayToday[i].npshyd[0])/1000))/2);
            totalLowcToday += ((arrayToday[i].nuclear[0])/1000)/2;
    }
    
    // solar only data for current day
    var arraySolarToday = context.five.response.responseBody[0].responseList[0].item;
    var solarToday = [];
    
    for(var t = arraySolarToday.length-1; t>=2; t-=3){
        solarToday.push((arraySolarToday[t].quantity[0])/1000);
    }
    // push two more values to solarToday array & todaySolarTotal so length matches other today arrays, first is an average
    solarToday.push((solar + (solarToday[solarToday.length-1]))/2);
    solarToday.push(solar);
    var totalSolarToday = 0;
    solarToday.forEach(function (item) {
        totalSolarToday += item/2;
    });
    
    // Demand data for current day
    var demLength = (context.three.response.responseBody[0].responseList[0].item).length;
     // most recent half hourly demand and generation figs
    var indo = (context.three.response.responseBody[0].responseList[0].item[((demLength/2)-1)].demand[0]/1000);
    var itsdo = (context.three.response.responseBody[0].responseList[0].item[(demLength-1)].demand[0]/1000);
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
    // wind array incl estimated embedded generation ** simplistic calculation / not using **
    // var embeddedWindToday2 = windToday.map((item, i) => item + ((item/meteredWindCap)*embeddedEstimateWind ));
    
    // scale up offshore contribution (1.1645) based on 26.6% / 37.2% load factor (renewable UK ** will need an update**) & then calculate actual onshore load factor,  embedded estimate then added to metered wind output
    var embeddedWindToday = windToday.map((item, i) => (((item-(((offshoreWindCap/meteredWindCap)*item)*1.28))/(onshoreWindCap-embeddedEstimateWind))*embeddedEstimateWind)+item);
    // current latest figs scaled up
    var windEmbedded = ((((wind-(((offshoreWindCap/meteredWindCap)*wind)*1.28))/(onshoreWindCap-embeddedEstimateWind))*embeddedEstimateWind)+wind);
  
    // new array with total generation incl embedded wind (not solar)
    var embeddedTotal = totalTodayNoWind.map((item,i) => item + embeddedWindToday[i]);
     // new array with total generation incl embedded wind & solar
    var embeddedTotalWithSolar = embeddedTotal.map((item,i) => item + solarToday[i]);
    //cumulative grand total GWh
    var windMwhToday = 0;
    embeddedWindToday.forEach(function (item) {
        windMwhToday += item/2
    });
    //cumulative grand total GWh
    var totalRenewTodayEmbedded = windMwhToday + totalRenewToday + totalSolarToday;
    var grandTotalMwhToday = 0;
    embeddedTotalWithSolar.forEach(function (item) {
        grandTotalMwhToday += (item/2);
    });

    var genLatest = embeddedTotal[((embeddedTotal.length)-1)];
    var genLatestSolar = embeddedTotalWithSolar[((embeddedTotalWithSolar.length)-1)];
    var genLatestEmbedded = (solarToday[((solarToday.length)-1)])+((embeddedWindToday[((embeddedWindToday.length)-1)])-(windToday[((windToday.length)-1)]));
    
    // convert national grid setttlement period to normal hourly time
    var convertTime = [];
    timePeriodToday.forEach(function(period){
    	var seconds = period*30*60;
        if((seconds/60/60)<10){
        	   var hours = "0" + Math.floor(seconds/60/60);
        } else {
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
    
    // latest half hourly time stamp
    var timeHalfHourly = (convertTime[((convertTime.length)-1)]);

    // render page
    res.render("live", {solar: solar, time: time, date: date, ccgt: ccgt, coal: coal, nuclear: nuclear, wind: wind, biomass: biomass, ics: ics, other: other, pumpHydro: pumpHydro, hydro: hydro, total: total, totalAll: totalAll,
                        timePeriodToday: timePeriodToday, ccgtToday: ccgtToday, coalToday: coalToday, nuclearToday: nuclearToday, windToday: windToday, biomassToday: biomassToday, icsToday: icsToday, otherToday: otherToday, solarToday: solarToday, hydroToday: hydroToday,
                        pumpHydroToday: pumpHydroToday, hydroTodayAll: hydroTodayAll, totalFossilToday: totalFossilToday, totalRenewToday: totalRenewToday, totalLowcToday: totalLowcToday, totalSolarToday: totalSolarToday, totalToday: totalToday,
                        indo: indo, itsdo: itsdo, demandTodayIndo: demandTodayIndo, demandTodayItsdo: demandTodayItsdo, timeDem: timeDem, genLatest : genLatest, genLatestSolar: genLatestSolar,
                        embeddedTotal: embeddedTotal, grandTotalMwhToday: grandTotalMwhToday, embeddedWindToday: embeddedWindToday, embeddedTotalWithSolar: embeddedTotalWithSolar, windEmbedded: windEmbedded, genLatestEmbedded: genLatestEmbedded,
                        timeHalfHourly: timeHalfHourly, totalRenewTodayEmbedded: totalRenewTodayEmbedded});
                        
    // error handling for bluebird promises   
    }).catch(function(err) {
    if(err){
        console.log(err);
    }
    });
});

module.exports = router;
    
    