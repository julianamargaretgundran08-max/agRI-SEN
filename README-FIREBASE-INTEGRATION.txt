AGRI-SEN GitHub Pages + Firebase integration

FILES
- index.html: existing website with Firebase SDK and sign-in panel.
- script.js: existing dashboard logic; simulated readings are disabled in live mode and pump toggles are locked.
- firebase-integration.js: Firebase Realtime Database listeners and authenticated settings writes.
- style.css: existing design plus status/safety styles.

FIREBASE PROJECT
- Project ID: agrisen-iot
- RTDB: https://agrisen-iot-default-rtdb.firebaseio.com
- The Firebase web API key is client configuration, not a secret. Database rules and Authentication provide access control.

DEPLOY
1. Extract this ZIP.
2. Review the files, then upload/replace index.html, script.js, style.css, firebase-integration.js and this README in the repository root.
3. Commit changes to the branch/folder configured for GitHub Pages.
4. Wait for the GitHub Pages deployment, then hard refresh the site (Ctrl+F5).
5. Open Settings and sign in with the authorized WEBSITE account from Firebase Authentication (not the ESP32 device account).
6. Verify the device status and sensorReadings nodes in Firebase Realtime Database.

CURRENT BEHAVIOR / SAFETY
- The dashboard no longer fabricates random soil values. If there are no actual readings, fields show --.
- Public reads follow the currently configured Firebase rules.
- Saving settings requires the website account UID configured in this file and writes to /irrigationSettings.
- Pump controls are intentionally disabled; no /pumpCommands writes are issued.
- The current ESP32 firmware stage publishes pumpStatus/device and does not yet publish verified soil sensor values. The website will therefore show no real readings until the firmware is extended after the ZTS-3002 Modbus map is confirmed.
- Do not enable public writes to sensorReadings, pumpStatus, or irrigationSettings.
- Before production, replace firmware TLS setInsecure() with certificate validation and verify sensor/relay hardware.

FIREBASE RULES ASSUMPTION
This integration assumes the previously configured rules allow public reads of /sensorReadings and /pumpStatus, website UID BbU86nYYWFcRdsCsIDLibljrqWk2 to write /irrigationSettings, and device UID Ii3d2gmU6WME9hKdR8VkTMeJxvB3 to write /pumpStatus. If rules have changed, adjust them securely rather than making all writes public.
