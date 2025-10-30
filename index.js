
const express = require('express');
const axios = require('axios');
const ical = require('ical-generator');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const port = 3000;

const adapter = new FileSync('db.json');
const db = low(adapter);

// Set some defaults if the database is new
db.defaults({ passes: [], lastFetch: null }).write();

const CACHE_DURATION = process.env.CACHE_DURATION || 60 * 60 * 1000; // 1 hour in milliseconds
const DATA_URL = 'https://spsweb.fltops.jpl.nasa.gov/rest/ops/info/activity/caps/json';

app.get('/capstone-dsn.ics', async (req, res) => {
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

    const cal = ical.default({domain: 'spsweb.fltops.jpl.nasa.gov', name: 'DSN Passes'});

    db.get('passes').value().forEach(pass => {
      cal.createEvent({
        start: new Date(pass.starttime),
        end: new Date(pass.endtime),
        summary: pass.activity,
        description: `Project User: ${pass.projuser}\nActivity Type: ${pass.activitytype}\nFacility: ${pass.facility}`,
        uid: pass.scheduleitemid.toString(),
        sequence: pass.sequence,
        lastModified: new Date(pass.lastModified),
        timezone: 'UTC'
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
