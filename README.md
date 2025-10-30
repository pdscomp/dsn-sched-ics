# DSN Schedule iCal Generator

This project generates a dynamic iCal calendar endpoint with Node.js to easily track your favorite satellite in your favorite Calendar app! It fetches data from NASA's Deep Space Network (DSN) schedule and provides it in a format that can be imported into any calendar application that supports iCal.

## Live Endpoint

A running instance of the main branch of this application is available at:
[https://dsn-sched-ics.fly.dev/caps-dsn-sched.ics](https://dsn-sched-ics.fly.dev/caps-dsn-sched.ics)

Note: This instance is pre-configured for the [CAPSTONE satellite](https://en.wikipedia.org/wiki/CAPSTONE).

## Dependencies

This project uses the following dependencies:

*   [axios](https://www.npmjs.com/package/axios): For making HTTP requests to the DSN schedule API.
*   [express](https://www.npmjs.com/package/express): For creating the web server and the iCal endpoint.
*   [ical-generator](https://www.npmjs.com/package/ical-generator): For generating the iCal file.
*   [lowdb](https://www.npmjs.com/package/lowdb): For caching the DSN schedule data to a local JSON file.

## How it Works

The `index.js` file sets up an Express server with a single endpoint: `/caps-dsn-sched.ics`.

When a request is made to this endpoint, the server:

1.  Checks if it has a fresh (less than 1 hour old) cached copy of the DSN schedule data.
2.  If the cache is stale or doesn't exist, it fetches the latest schedule data from the NASA JPL DSN data URL.
3.  The fetched data is then processed and stored in a local `db.json` file for caching purposes.
4.  The script then uses `ical-generator` to create a new iCal calendar with the schedule data.
5.  Finally, it sends the generated iCal data as the response with the correct `text/calendar` content type.

This allows you to subscribe to the `/caps-dsn-sched.ics` URL from your calendar application and always have the latest DSN schedule.

## Configuration

This application can be configured using environment variables. This is useful when deploying with a container or to a cloud platform.

| Variable         | Description                                                                 | Default                                                              |
| ---------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `DATA_URL`       | The URL to fetch the schedule data from.                                    | `https://spsweb.fltops.jpl.nasa.gov/rest/ops/info/activity/caps/json`  |
| `CAL_NAME`       | The name of the generated iCal calendar.                                    | `CAPS DSN Sched`                                                     |
| `CAL_DOMAIN`     | The domain for the iCal calendar.                                           | `spsweb.fltops.jpl.nasa.gov`                                         |
| `CACHE_DURATION` | The cache duration in milliseconds.                                         | `3600000` (1 hour)                                                   |
| `CAL_URL`        | The URL path for the iCal endpoint.                                         | `/caps-dsn-sched.ics`                                                |
| `PORT`           | The port the server listens on.                                             | `3000`                                                               |

**Note:** By default, this application is configured to generate an iCal feed for the [CAPSTONE](https://en.wikipedia.org/wiki/CAPSTONE) satellite.

## License

This project is licensed under the MIT License.

Copyright (c) 2025 Paul Swenson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
