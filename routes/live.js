const express = require('express'),
  router = express.Router(),
  parseString = require('xml2js').parseString,
  moment = require('moment'),
  mtz = require('moment-timezone'),
  // async = require('async'),
  Promise = require('bluebird'),
  request = Promise.promisifyAll(require('request'), { multiArgs: true });

// mutiple url requests using promises - uses the bluebird prmises library, serializing
//several url requests and accumuating the reults in the context object, rolling up error
//handing at the end after page rendered
router.get('/live', (req, res) => {
  // today's date formatted for bmreports
  const todayDate = moment().format('YYYY-MM-DD');
  const yestDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
  // url's for live/current (today only) JSON and XML energy data
  // legacy ended may 2019
  // const solarInst = "https://api0.solar.sheffield.ac.uk/pvlive/v1";
  const solarInst = 'https://api0.solar.sheffield.ac.uk/pvlive/v2/';
  const fuelInst =
    'https://api.bmreports.com/BMRS/FUELINSTHHCUR/V1?APIKey=16hudca3onmwxcy&ServiceType=xml';
  const todayGenFuel =
    'https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate=' +
    todayDate +
    '&ToDate=' +
    todayDate +
    '&ServiceType=xml';
  const todaySolar =
    'https://api0.solar.sheffield.ac.uk/pvlive/v2?start=' +
    yestDate +
    'T23:30:00&end=' +
    todayDate +
    'T23:59:59';
  const todayDemand =
    'https://api.bmreports.com/BMRS/INDOITSDO/V1?APIKey=16hudca3onmwxcy&FromDate=' +
    todayDate +
    '&ToDate=' +
    todayDate +
    '&ServiceType=xml';

  const context = {};
  request
    .getAsync(solarInst)
    .spread((response, body) => {
      context.one = JSON.parse(body);
      return request.getAsync(fuelInst);
    })
    .spread((response, body) => {
      parseString(body, (err, result) => {
        if (err) {
          console.log(err);
        }
        context.two = JSON.parse(JSON.stringify(result));
      });
      return request.getAsync(todayDemand);
    })
    .spread((response, body) => {
      parseString(body, (err, result) => {
        if (err) {
          console.log(err);
        }
        context.three = JSON.parse(JSON.stringify(result));
      });
      return request.getAsync(todayGenFuel);
    })
    .spread((response, body) => {
      parseString(body, (err, result) => {
        if (err) {
          console.log(err);
        }
        context.four = JSON.parse(JSON.stringify(result));
      });
      return request.getAsync(todaySolar);
    })
    .spread((response, body) => {
      context.five = JSON.parse(body);

      // Live / current solar data ( every 30 mins)
      const solar = context.one.data[0][2] / 1000;
      // Live / current non solar data (every 5 mins)
      const ccgt =
        context.two.response.responseBody[0].responseList[0].item[0]
          .currentMW[0] / 1000;
      const coal =
        context.two.response.responseBody[0].responseList[0].item[3]
          .currentMW[0] / 1000;
      const nuclear =
        context.two.response.responseBody[0].responseList[0].item[4]
          .currentMW[0] / 1000;
      const wind =
        context.two.response.responseBody[0].responseList[0].item[5]
          .currentMW[0] / 1000;
      const biomass = Number(
        (
          context.two.response.responseBody[0].responseList[0].item[13]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[8]
            .currentMW[0] /
            1000
        ).toFixed(3)
      );
      const ics = Number(
        (
          context.two.response.responseBody[0].responseList[0].item[11]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[9]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[10]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[12]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[14]
            .currentMW[0] /
            1000
        ).toFixed(3)
      );
      const other = Number(
        (
          context.two.response.responseBody[0].responseList[0].item[1]
            .currentMW[0] /
            1000 +
          context.two.response.responseBody[0].responseList[0].item[2]
            .currentMW[0] /
            1000
        ).toFixed(3)
      );
      const pumpHydro =
        context.two.response.responseBody[0].responseList[0].item[6]
          .currentMW[0] / 1000;
      const hydro =
        context.two.response.responseBody[0].responseList[0].item[7]
          .currentMW[0] / 1000;
      const total =
        context.two.response.responseBody[0].total[0].currentTotalMW[0] / 1000;
      const totalAll = Number(
        (
          context.two.response.responseBody[0].total[0].currentTotalMW[0] /
            1000 +
          context.one.data[0][2] / 1000
        ).toFixed(3)
      );
      // time and date formatting for live/current data
      const time = moment(
        context.two.response.responseBody[0].dataLastUpdated[0]
      )
        .tz('Europe/London')
        .format('h:mm A');
      const date = moment().format('dddd Do MMMM');

      // non solar data for current day
      const arrayToday =
        context.four.response.responseBody[0].responseList[0].item;
      const timePeriodToday = [];
      const ccgtToday = [];
      const coalToday = [];
      const nuclearToday = [];
      const windToday = [];
      const biomassToday = [];
      const icsToday = [];
      const otherToday = [];
      const hydroTodayAll = [];
      const totalToday = [];
      const totalTodayNoWind = [];
      let totalFossilToday = 0;
      let totalRenewToday = 0;
      let totalLowcToday = 0;

      for (let i = 0; i < arrayToday.length; i++) {
        const icsTotal =
          arrayToday[i].intfr[0] / 1000 +
          arrayToday[i].intirl[0] / 1000 +
          arrayToday[i].intned[0] / 1000 +
          arrayToday[i].intew[0] / 1000 +
          arrayToday[i].intnem[0] / 1000;
        const othTotal =
          arrayToday[i].oil[0] / 1000 + arrayToday[i].ocgt[0] / 1000;
        const bioTotal =
          arrayToday[i].other[0] / 1000 + arrayToday[i].biomass[0] / 1000;
        const hydroTotal =
          arrayToday[i].npshyd[0] / 1000 + arrayToday[i].ps[0] / 1000;
        // calculation for totalMWh within each item
        const allTotal =
          arrayToday[i].intfr[0] / 1000 +
          arrayToday[i].intirl[0] / 1000 +
          arrayToday[i].intned[0] / 1000 +
          arrayToday[i].intew[0] / 1000 +
          arrayToday[i].intnem[0] / 1000 +
          arrayToday[i].oil[0] / 1000 +
          arrayToday[i].ocgt[0] / 1000 +
          arrayToday[i].other[0] / 1000 +
          arrayToday[i].biomass[0] / 1000 +
          arrayToday[i].ps[0] / 1000 +
          arrayToday[i].npshyd[0] / 1000 +
          arrayToday[i].ccgt[0] / 1000 +
          arrayToday[i].coal[0] / 1000 +
          arrayToday[i].nuclear[0] / 1000 +
          arrayToday[i].wind[0] / 1000;
        const allTotalNoWind =
          arrayToday[i].intfr[0] / 1000 +
          arrayToday[i].intirl[0] / 1000 +
          arrayToday[i].intned[0] / 1000 +
          arrayToday[i].intew[0] / 1000 +
          arrayToday[i].intnem[0] / 1000 +
          arrayToday[i].oil[0] / 1000 +
          arrayToday[i].ocgt[0] / 1000 +
          arrayToday[i].other[0] / 1000 +
          arrayToday[i].biomass[0] / 1000 +
          arrayToday[i].ps[0] / 1000 +
          arrayToday[i].npshyd[0] / 1000 +
          arrayToday[i].ccgt[0] / 1000 +
          arrayToday[i].coal[0] / 1000 +
          arrayToday[i].nuclear[0] / 1000;

        //populate arrays to pass over to EJS
        timePeriodToday.push(arrayToday[i].settlementPeriod[0]);
        ccgtToday.push(arrayToday[i].ccgt[0] / 1000);
        coalToday.push(arrayToday[i].coal[0] / 1000);
        nuclearToday.push(arrayToday[i].nuclear[0] / 1000);
        windToday.push(arrayToday[i].wind[0] / 1000);
        totalToday.push(allTotal);
        totalTodayNoWind.push(allTotalNoWind);
        icsToday.push(Number(icsTotal.toFixed(3)));
        otherToday.push(Number(othTotal).toFixed(3));
        biomassToday.push(Number(bioTotal.toFixed(3)));
        hydroTodayAll.push(Number(hydroTotal.toFixed(3)));
        // during each loop add cumulative totals for fossil fuels, renewables and low carbon,
        // each figure divided by 2 as they represent half hour periods only
        totalFossilToday +=
          (othTotal +
            icsTotal +
            arrayToday[i].ccgt[0] / 1000 +
            arrayToday[i].coal[0] / 1000 +
            arrayToday[i].ps[0] / 1000) /
          2;
        totalRenewToday += (bioTotal + arrayToday[i].npshyd[0] / 1000) / 2;
        totalLowcToday += arrayToday[i].nuclear[0] / 1000 / 2;
      }

      // solar only data for current day
      const arraySolarToday = context.five.data;
      const solarToday = [];

      for (let t = 0; t < arraySolarToday.length; t++) {
        if (arraySolarToday[t][2] == null || NaN) {
          arraySolarToday[t][2] = 0;
        }
        solarToday.push(Number((arraySolarToday[t][2] / 1000).toFixed(3)));
      }

      let totalSolarToday = 0;
      solarToday.forEach((item) => {
        totalSolarToday += item / 2;
      });

      // Demand data for current day
      const demLength =
        context.three.response.responseBody[0].responseList[0].item.length;
      // most recent half hourly demand and generation figs
      const indo =
        context.three.response.responseBody[0].responseList[0].item[
          demLength / 2 - 1
        ].demand[0] / 1000;
      const itsdo =
        context.three.response.responseBody[0].responseList[0].item[
          demLength - 1
        ].demand[0] / 1000;
      const arrayDemandToday =
        context.three.response.responseBody[0].responseList[0].item;
      const demandTodayIndo = [];
      const demandTodayItsdo = [];
      const timeDem = [];
      for (let d = 0; d < demLength / 2; d++) {
        demandTodayIndo.push(arrayDemandToday[d].demand[0] / 1000);
        timeDem.push(arrayDemandToday[d].settlementPeriod[0]);
      }
      for (let e = demLength / 2; e < demLength; e++) {
        demandTodayItsdo.push(arrayDemandToday[e].demand[0] / 1000);
      }

      //calculations for embedded wind generation, using national grids estimated embedded capacity figs
      // published onshore & offshore figs from renewable UK ** update as of 28-4-2020 see https://www.renewableuk.com/page/UKWEDhome
      const onshoreWindCap = 13.625;
      const offshoreWindCap = 8.483;
      // total = 22,108.965 for ref

      // national grid latest estimate for embedded wind and solar, from demand data update ** update from 28-4-2020
      // now @ https://demandforecast.nationalgrid.com/efs_demand_forecast/faces/DataExplorer;jsessionid=2KHCSm3qpay6D1FFC8AxWsiH3G7Hb6LSCQKsXCOQrrq2n8_moqJU!-1835954340
      const embeddedEstimateWind = 6.527;
      // therefore **15.582 metered capacity as at 28-4-2020
      // const embeddedEstimateSolar = 13.08; ref only

      // onshore wind capacity (excl embedded) ie what is metered by NG ** currently 7.098
      const meteredOnshoreWindCap = onshoreWindCap - embeddedEstimateWind;

      // scale up offshore contribution (1.1645) based on 26.6% (onshore) / 38.5% (offshore) load factor (renewable UK*) * https://www.renewableuk.com/page/UKWEDExplained
      const offshoreProp = offshoreWindCap * 0.385;
      const onshoreProp = meteredOnshoreWindCap * 0.266;
      const propTotal = offshoreProp + onshoreProp;

      const onshorePercent = onshoreProp / propTotal;
      const onShoreScaleFactor = embeddedEstimateWind / meteredOnshoreWindCap;

      const embeddedWindToday = windToday.map((item, i) =>
        Number(item * onshorePercent * onShoreScaleFactor * 0.9 + item).toFixed(
          3
        )
      );

      const windEmbeddedCalc = Number(
        wind * onshorePercent * onShoreScaleFactor * 0.9 + wind
      ).toFixed(3);

      const windEmbedded = Number(windEmbeddedCalc);

      // new array with total generation incl embedded wind (not solar)
      const embeddedTotal = totalTodayNoWind.map(
        (item, i) => Number(item) + Number(embeddedWindToday[i])
      );
      // new array with total generation incl embedded wind & solar, checks that arrays are same length
      if (embeddedTotal.length === solarToday.length) {
        var embeddedTotalWithSolar = embeddedTotal.map((item, i) =>
          Number((item + solarToday[i]).toFixed(3))
        );
      } else {
        embeddedTotal.splice(-1, 1);
        embeddedTotalWithSolar = embeddedTotal.map((item, i) =>
          Number((item + solarToday[i]).toFixed(3))
        );
      }

      //cumulative grand total GWh
      let windMwhToday = 0;
      embeddedWindToday.forEach((item) => {
        windMwhToday += item / 2;
      });
      //cumulative grand total GWh
      const totalRenewTodayEmbedded =
        windMwhToday + totalRenewToday + totalSolarToday;
      let grandTotalMwhToday = 0;
      embeddedTotalWithSolar.forEach((item) => {
        grandTotalMwhToday += item / 2;
      });
      const genLatest = embeddedTotal[embeddedTotal.length - 1];
      const genLatestSolar =
        embeddedTotalWithSolar[embeddedTotalWithSolar.length - 1];
      const genLatestEmbedded =
        solarToday[solarToday.length - 1] +
        (embeddedWindToday[embeddedWindToday.length - 1] -
          windToday[windToday.length - 1]);

      // convert national grid setttlement period to normal hourly time
      const convertTime = [];
      timePeriodToday.forEach((period) => {
        const seconds = period * 30 * 60;
        if (seconds / 60 / 60 < 10) {
          var hours = 0 + Math.floor(seconds / 60 / 60);
        } else {
          hours = Math.floor(seconds / 60 / 60);
        }
        if (seconds / 60 - hours * 60 === 0) {
          const minutes = 0;
          convertTime.push(hours.toFixed(0) + minutes.toFixed(0) + 0);
        } else {
          const minutes2 = seconds / 60 - hours * 60;
          convertTime.push(hours.toFixed(0) + minutes2.toFixed(0));
        }
      });

      // latest half hourly time stamp
      const timeHalfHourly = convertTime[convertTime.length - 1];

      // render page
      res.render('live', {
        solar: solar,
        time: time,
        date: date,
        ccgt: ccgt,
        coal: coal,
        nuclear: nuclear,
        wind: wind,
        biomass: biomass,
        ics: ics,
        other: other,
        pumpHydro: pumpHydro,
        hydro: hydro,
        total: total,
        totalAll: totalAll,
        timePeriodToday: timePeriodToday,
        ccgtToday: ccgtToday,
        coalToday: coalToday,
        nuclearToday: nuclearToday,
        windToday: windToday,
        biomassToday: biomassToday,
        icsToday: icsToday,
        otherToday: otherToday,
        solarToday: solarToday,
        hydroTodayAll: hydroTodayAll,
        totalFossilToday: totalFossilToday,
        totalRenewToday: totalRenewToday,
        totalLowcToday: totalLowcToday,
        totalSolarToday: totalSolarToday,
        totalToday: totalToday,
        indo: indo,
        itsdo: itsdo,
        demandTodayIndo: demandTodayIndo,
        demandTodayItsdo: demandTodayItsdo,
        timeDem: timeDem,
        genLatest: genLatest,
        genLatestSolar: genLatestSolar,
        embeddedTotal: embeddedTotal,
        grandTotalMwhToday: grandTotalMwhToday,
        embeddedWindToday: embeddedWindToday,
        embeddedTotalWithSolar: embeddedTotalWithSolar,
        windEmbedded: windEmbedded,
        genLatestEmbedded: genLatestEmbedded,
        timeHalfHourly: timeHalfHourly,
        totalRenewTodayEmbedded: totalRenewTodayEmbedded,
        convertTime: convertTime,
      });

      // error handling for bluebird promises
    })
    .catch((err) => {
      if (err) {
        console.log(err);
      }
    });
});

module.exports = router;
