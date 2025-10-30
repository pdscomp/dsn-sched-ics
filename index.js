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

app.get('/caps-dsn-sched.ics', async (req, res) => {
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

    const cal = ical.default({domain: 'spsweb.fltops.jpl.nasa.gov', name: 'CAPS DSN Sched'});

    db.get('passes').value().forEach(pass => {
      const summary = `${pass.projuser} DSS-${pass.facility} ${pass.activity} (${pass.configcode})`
      const fields = ['version', 'week', 'year', 'starttime', 'bot', 'eot', 'endtime', 'facility', 'projuser', 'activity', 'configcode', 'equipmentlist', 'wrkcat', 'scheduleitemid', 'soecode', 'activityid', 'activitytype'];
      let attributes = '';
      for (const key of fields) {
        attributes += `${key.toUpperCase()}: ${pass[key]}\n`;
      }
      const description = `${summary}\n\n${attributes}`;

      cal.createEvent({
        start: new Date(pass.bot),
        end: new Date(pass.eot),
        summary: summary,
        description: description,
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