const express = require('express');
const axios = require('axios');
const ical = require('ical-generator');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const port = process.env.PORT || 3000;

const adapter = new FileSync('db.json');
const db = low(adapter);

// Set some defaults if the database is new
db.defaults({ passes: [], lastFetch: null }).write();

// Edit me if you need to!
const DATA_URL = process.env.DATA_URL || 'https://spsweb.fltops.jpl.nasa.gov/rest/ops/info/activity/caps/json';
const CAL_NAME = process.env.CAL_NAME || 'CAPS DSN Sched';
const CAL_DOMAIN = process.env.CAL_DOMAIN || 'spsweb.fltops.jpl.nasa.gov';
const CACHE_DURATION = process.env.CACHE_DURATION || 60 * 60 * 1000; // 1 hour in milliseconds
const CAL_URL = process.env.CAL_URL || '/caps-dsn-sched.ics';

app.get(CAL_URL, async (req, res) => {
  try {
    const now = Date.now();
    const lastFetch = db.get('lastFetch').value();

    if (!lastFetch || (now - lastFetch > CACHE_DURATION)) {
      console.log('Fetching fresh data...');
      const response = await axios.get(DATA_URL);
      const passes = response.data.result.item;

      // Update database
      const existingPasses = db.get('passes').value();
      const updatedPasses = passes.map(pass => {
        const existingPass = existingPasses.find(p => p.scheduleitemid === pass.scheduleitemid);
        if (existingPass) {
          // If pass exists, check for updates
          if (JSON.stringify(existingPass) !== JSON.stringify(pass)) {
            return { ...pass, sequence: (existingPass.sequence || 0) + 1, lastModified: new Date().toISOString() };
          }
          return existingPass;
        }
        // New pass
        return { ...pass, sequence: 1, lastModified: new Date().toISOString() };
      });

      db.set('passes', updatedPasses).write();
      db.set('lastFetch', now).write();
    } else {
      console.log('Serving from cache...');
    }

    const cal = ical.default({domain: CAL_DOMAIN, name: CAL_NAME, timezone: 'UTC'});

    db.get('passes').value().forEach(pass => {
      // Trim string values
      for (const key in pass) {
        if (typeof pass[key] === 'string') {
          pass[key] = pass[key].trim();
        }
      }

      const summary = `${pass.projuser} ${pass.activity} DSS-${pass.facility} (${pass.configcode})`
      const fields = ['version', 'week', 'year', 'starttime', 'bot', 'eot', 'endtime', 'facility', 'projuser', 'activity', 'configcode', 'equipmentlist', 'wrkcat', 'scheduleitemid', 'soecode', 'activityid', 'activitytype'];
      let attributes = '';
      for (const key of fields) {
        attributes += `${key.toUpperCase()}: ${pass[key]}\n`;
      }
      const description = `${summary}\n\n${attributes}`;

      cal.createEvent({
        start: new Date(pass.bot + 'Z'),
        end: new Date(pass.eot + 'Z'),
        summary: summary,
        description: description,
        uid: pass.scheduleitemid.toString(),
        sequence: pass.sequence,
        lastModified: new Date(pass.lastModified)
      });
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.send(cal.toString());

  } catch (error) {
    console.error('Error details:', error);
    res.status(500).send('Error generating iCalendar file');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
