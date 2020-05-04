let express = require('express'),
  router = express.Router(),
  moment = require('moment'),
  // mtz = require('moment-timezone'),
  request = require('request'),
  xml2js = require('xml2js');

router.get('/fourtyeight', (req, res) => {
  const todayDate = moment().format('YYYY-MM-DD');
  const yestDate = moment().subtract(2, 'days').format('YYYY-MM-DD');
  const yestDateSolar = moment().subtract(3, 'days').format('YYYY-MM-DD');
  // url's for past 48 hrs json & xml data

  const urls = [
    `https://api.bmreports.com/BMRS/FUELHH/V1?APIKey=16hudca3onmwxcy&FromDate=${yestDate}&ToDate=${todayDate}&ServiceType=xml`,
    `https://api0.solar.sheffield.ac.uk/pvlive/v2?start=${yestDateSolar}T23:30:00&end=${todayDate}T23:59:59`,
  ];

  let requestAsync = (url) => {
    return new Promise((resolve, reject) => {
      if (url.startsWith('https://api0.solar')) {
        request(url, (err, response, body) => {
          if (err) return reject(err, response, body);
          resolve(JSON.parse(body));
        });
      } else {
        request(url, (err, response, body) => {
          if (err) return reject(err, response, body);
          resolve(
            xml2js.parseStringPromise(body, (err, result) => {
              return JSON.parse(JSON.stringify(result));
            })
          );
        });
      }
    });
  };

  let getParallel = async () => {
    //transform requests into Promises, await all
    await Promise.all(urls.map(requestAsync))
      .then((response) => {
        const context = {};
        context.one = response[0];
        context.two = response[1];

        // 48 hr generation data (going back every 30 mins)
        const array48 =
          context.one.response.responseBody[0].responseList[0].item;
        const timePeriod = [];
        const ccgt = [];
        const coal = [];
        const nuclear = [];
        const wind = [];
        const biomass = [];
        const ics = [];
        const other = [];
        const hydro = [];
        const date = [];
        const total48 = [];
        const total48NoWind = [];
        let totalMwh48 = 0;
        let totalMwh48NoWind = 0;
        let totalFossil48 = 0;
        let totalRenew48NoWind = 0;
        let totalLowc48 = 0;
        // populate arrays and total variables
        for (let i = 0; i < array48.length; i++) {
          const allTotal =
            array48[i].intfr[0] / 1000 +
            array48[i].intirl[0] / 1000 +
            array48[i].intned[0] / 1000 +
            array48[i].intew[0] / 1000 +
            array48[i].intnem[0] / 1000 +
            array48[i].oil[0] / 1000 +
            array48[i].ocgt[0] / 1000 +
            array48[i].other[0] / 1000 +
            array48[i].biomass[0] / 1000 +
            array48[i].ps[0] / 1000 +
            array48[i].npshyd[0] / 1000 +
            array48[i].ccgt[0] / 1000 +
            array48[i].coal[0] / 1000 +
            array48[i].nuclear[0] / 1000 +
            array48[i].wind[0] / 1000;
          const allTotalNoWind =
            array48[i].intfr[0] / 1000 +
            array48[i].intirl[0] / 1000 +
            array48[i].intned[0] / 1000 +
            array48[i].intew[0] / 1000 +
            array48[i].intnem[0] / 1000 +
            array48[i].oil[0] / 1000 +
            array48[i].ocgt[0] / 1000 +
            array48[i].other[0] / 1000 +
            array48[i].biomass[0] / 1000 +
            array48[i].ps[0] / 1000 +
            array48[i].npshyd[0] / 1000 +
            array48[i].ccgt[0] / 1000 +
            array48[i].coal[0] / 1000 +
            array48[i].nuclear[0] / 1000;
          const icsTotal =
            array48[i].intfr[0] / 1000 +
            array48[i].intirl[0] / 1000 +
            array48[i].intned[0] / 1000 +
            array48[i].intew[0] / 1000 +
            array48[i].intnem[0] / 1000;
          const othTotal = array48[i].oil[0] / 1000 + array48[i].ocgt[0] / 1000;
          const bioTotal =
            array48[i].other[0] / 1000 + array48[i].biomass[0] / 1000;
          const hydroTotal =
            array48[i].npshyd[0] / 1000 + array48[i].ps[0] / 1000;
          timePeriod.push(array48[i].settlementPeriod[0]);
          total48.push(allTotal);
          total48NoWind.push(allTotalNoWind);
          ccgt.push(Number((array48[i].ccgt[0] / 1000).toFixed(3)));
          coal.push(Number((array48[i].coal[0] / 1000).toFixed(3)));
          nuclear.push(Number((array48[i].nuclear[0] / 1000).toFixed(3)));
          wind.push(Number((array48[i].wind[0] / 1000).toFixed(3)));
          date.push(array48[i].startTimeOfHalfHrPeriod[0]);
          ics.push(Number(icsTotal.toFixed(3)));
          other.push(Number(othTotal.toFixed(3)));
          hydro.push(Number(hydroTotal.toFixed(3)));
          biomass.push(Number(bioTotal.toFixed(3)));
          totalMwh48 += allTotal / 2;
          totalMwh48NoWind += allTotalNoWind / 2;
          totalFossil48 +=
            (othTotal +
              icsTotal +
              array48[i].ccgt[0] / 1000 +
              array48[i].coal[0] / 1000 +
              array48[i].ps[0] / 1000) /
            2;
          totalRenew48NoWind += (bioTotal + array48[i].npshyd[0] / 1000) / 2;
          totalLowc48 += array48[i].nuclear[0] / 1000 / 2;
        }

        // solar data for past 48 hrs
        const solar48 = context.two.data;
        const arraySolar48 = [];

        for (let t = 0; t < solar48.length; t++) {
          if (solar48[t][2] == null) {
            solar48[t][2] = 0;
          }
          arraySolar48.push(Number((solar48[t][2] / 1000).toFixed(3)));
        }

        // cumulative total solar
        let totalSolar48 = 0;
        arraySolar48.forEach((item) => {
          totalSolar48 += item / 2;
        });

        // convert national grid setttlement period to normal hourly time
        const convertTime = [];
        timePeriod.forEach((period) => {
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

        const timeTo =
          moment(date[date.length - 1]).format('MMM Do') +
          ' (' +
          convertTime[convertTime.length - 1] +
          ')';
        const timeFrom = moment(date[0]).format('MMM Do') + ' (0030)';

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

        const embeddedWind48 = wind.map((item, i) =>
          Number(
            item * onshorePercent * onShoreScaleFactor * 0.9 + item
          ).toFixed(3)
        );

        // new array with total generation incl embedded wind (not solar)
        const embeddedTotal = total48NoWind.map(
          (item, i) => Number(item) + Number(embeddedWind48[i])
        );
        let totalMwhEmbedded = totalSolar48;
        embeddedTotal.forEach((item) => {
          totalMwhEmbedded += item / 2;
        });
        // total cumulative renewables
        let embeddedWindCumul = 0;
        embeddedWind48.forEach((item) => {
          embeddedWindCumul += item / 2;
        });
        const renewTotalCumul =
          totalRenew48NoWind + totalSolar48 + embeddedWindCumul;

        res.render('fourtyeight', {
          timePeriod: timePeriod,
          timeTo: timeTo,
          timeFrom: timeFrom,
          ccgt: ccgt,
          coal: coal,
          nuclear: nuclear,
          wind: wind,
          biomass: biomass,
          ics: ics,
          other: other,
          hydro: hydro,
          embeddedTotal: embeddedTotal,
          embeddedWind48: embeddedWind48,
          totalMwhEmbedded: totalMwhEmbedded,
          totalFossil48: totalFossil48,
          renewTotalCumul: renewTotalCumul,
          totalLowc48: totalLowc48,
          arraySolar48: arraySolar48,
          convertTime: convertTime,
        });
      })
      .catch((err) => {
        if (err) {
          console.log(err);
        }
      });
  };

  getParallel();
});

module.exports = router;
