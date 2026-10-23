/* AGRI-SEN Firebase integration for GitHub Pages.
 * This browser app intentionally does not issue pump commands.
 * Sensor values are displayed only when Firebase contains actual values.
 */
(() => {
  'use strict';
  window.AGRISEN_LIVE_MODE = true;

  const firebaseConfig = {
    apiKey: 'AIzaSyBm6GLVUecQ2WV45PZoqJn1y-cSrb53u0',
    authDomain: 'agrisen-iot.firebaseapp.com',
    databaseURL: 'https://agrisen-iot-default-rtdb.firebaseio.com',
    projectId: 'agrisen-iot',
    storageBucket: 'agrisen-iot.firebasestorage.app',
    messagingSenderId: '630847307653',
    appId: '1:630847307653:web:ec252198a94dc3cbb90eec',
    measurementId: 'G-CNXTF8T4WJ'
  };
  const AUTHORIZED_WEBSITE_UID = 'BbU86nYYWFcRdsCsIDLibljrqWk2';
  const $ = id => document.getElementById(id);
  let db, auth;

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }
  function validNumber(...values) {
    for (const v of values) {
      if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Number(v);
    }
    return null;
  }
  function first(obj, keys) {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of keys) if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    return null;
  }
  function displayValue(id, value, suffix = '') {
    setText(id, value === null ? '--' : `${value}${suffix}`);
  }
  function updateMeter(id, value, max) {
    const el = $(id);
    if (!el) return;
    el.style.width = value === null ? '0%' : `${Math.max(0, Math.min(100, value / max * 100))}%`;
  }
  function renderSensorStatus(id, value, low, high) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('warning', 'alert', 'unavailable');
    if (value === null) {
      el.textContent = 'Unavailable';
      el.classList.add('unavailable');
    } else if (value < low || value > high) {
      el.textContent = 'Check range';
      el.classList.add('warning');
    } else {
      el.textContent = 'Live';
    }
  }
  function renderReadings(raw) {
    // Accept common field naming variants; never invent readings.
    const moisture = validNumber(first(raw, ['soilMoisture', 'moisture', 'soil_moisture', 'moisturePercent']));
    const temperature = validNumber(first(raw, ['temperatureC', 'temperature', 'soilTemperature', 'tempC']));
    const ph = validNumber(first(raw, ['ph', 'soilPH', 'soilPh', 'pH']));
    const ec = validNumber(first(raw, ['ec', 'EC', 'electricalConductivity', 'conductivity']));
    const nitrogen = validNumber(first(raw, ['nitrogen', 'N', 'n']));
    const phosphorus = validNumber(first(raw, ['phosphorus', 'P', 'p']));
    const potassium = validNumber(first(raw, ['potassium', 'K', 'k']));

    displayValue('moisture', moisture, '%');
    displayValue('temperature', temperature, ' °C');
    displayValue('ph', ph);
    displayValue('ec', ec, ' (unit pending)');
    displayValue('nitrogen', nitrogen);
    displayValue('phosphorus', phosphorus);
    displayValue('potassium', potassium);
    updateMeter('moisture-meter', moisture, 100);
    updateMeter('temperature-meter', temperature, 50);
    updateMeter('ph-meter', ph, 14);
    updateMeter('ec-meter', ec, 3);
    renderSensorStatus('moisture-status', moisture, 0, 100);
    renderSensorStatus('temperature-status', temperature, -10, 60);
    renderSensorStatus('ph-status', ph, 0, 14);
    renderSensorStatus('ec-status', ec, 0, 1000000);

    // Prevent recommendation logic from using stale simulated values.
    if (typeof currentReadings !== 'undefined') {
      currentReadings = { moisture, temperature, ph, ec };
    }
    const stamp = first(raw, ['timestamp', 'recordedAt', 'updatedAt', 'lastUpdated']);
    const when = stamp ? (typeof stamp === 'number' ? new Date(stamp).toLocaleString() : String(stamp)) : 'Timestamp not supplied';
    setText('last-updated', `Firebase sensor record: ${when}`);
    setText('system-status', [moisture, temperature, ph, ec].some(v => v !== null) ? 'Live data received' : 'Waiting for verified sensor data');

    const badge = $('connection-badge');
    if (badge) badge.innerHTML = '<span class="status-dot"></span> Firebase connected';
    if (moisture !== null) {
      if (typeof sensorHistory !== 'undefined') {
        sensorHistory.moisture.push(moisture);
        if (sensorHistory.moisture.length > 12) sensorHistory.moisture.shift();
        if (typeof renderTrend === 'function') renderTrend('moisture');
      }
      setText('trend-moisture-value', `${moisture}%`);
    }
    if (temperature !== null) {
      if (typeof sensorHistory !== 'undefined') {
        sensorHistory.temperature.push(temperature);
        if (sensorHistory.temperature.length > 12) sensorHistory.temperature.shift();
        if (typeof renderTrend === 'function') renderTrend('temperature');
      }
      setText('trend-temperature-value', `${temperature} °C`);
    }
  }

  function updateDeviceStatus(status) {
    if (!status) {
      setText('device-connection-state', 'No device status published yet');
      return;
    }
    const online = status.online === true;
    setText('device-connection-state', online ? 'ESP32-S3 online' : 'ESP32-S3 offline');
    const badge = $('connection-badge');
    if (badge) badge.innerHTML = `<span class="status-dot"></span> ${online ? 'Device online' : 'Device offline'}`;
    // The firmware currently publishes sensorConnected=false until Modbus is verified.
    if (status.sensorConnected !== true) {
      setText('system-status', online ? 'Device online · sensor not verified' : 'Device offline');
    }
  }

  function setAuthUI(user) {
    const status = $('firebase-auth-status');
    const logout = $('firebase-logout');
    const form = $('firebase-login-form');
    if (user) {
      const authorized = user.uid === AUTHORIZED_WEBSITE_UID;
      if (status) status.textContent = authorized ? `Signed in as website account (${user.email || user.uid})` : `Signed in, but this account is not authorized to change settings.`;
      if (logout) logout.hidden = false;
      if (form) form.querySelector('button[type="submit"]').disabled = true;
      if (!authorized) console.warn('Signed-in Firebase UID is not the configured website UID. Writes are blocked by Firebase rules.');
    } else {
      if (status) status.textContent = 'Not signed in';
      if (logout) logout.hidden = true;
      if (form) {
        form.querySelector('button[type="submit"]').disabled = false;
        form.reset();
      }
    }
  }

  async function saveSettings() {
    const user = auth.currentUser;
    if (!user || user.uid !== AUTHORIZED_WEBSITE_UID) {
      alert('Please sign in with the authorized website Firebase account first.');
      return;
    }
    const value = id => $(id) ? $(id).value : '';
    const settings = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
      automaticIrrigation: !!$('auto-irrigation')?.checked,
      automaticNpk: !!$('auto-npk')?.checked,
      automaticCalculation: !!$('auto-calculation')?.checked,
      manualOverride: !!$('manual-override')?.checked,
      moistureMin: Number(value('moisture-min')),
      moistureMax: Number(value('moisture-max')),
      phMin: Number(value('ph-min')),
      phMax: Number(value('ph-max')),
      ecMin: Number(value('ec-min')),
      ecMax: Number(value('ec-max')),
      nitrogenTarget: Number(value('nitrogen-target')),
      phosphorusTarget: Number(value('phosphorus-target')),
      potassiumTarget: Number(value('potassium-target')),
      readingIntervalSeconds: Number(value('reading-interval')),
      historyLogging: value('history-logging'),
      systemMode: value('system-mode'),
      units: value('units'),
      pumpControlEnabled: false
    };
    if (!(settings.moistureMin >= 0 && settings.moistureMax <= 100 && settings.moistureMin < settings.moistureMax)) {
      alert('Check moisture thresholds: minimum must be below maximum, within 0–100%.'); return;
    }
    if (!(settings.phMin >= 0 && settings.phMax <= 14 && settings.phMin < settings.phMax)) {
      alert('Check pH thresholds: minimum must be below maximum, within 0–14.'); return;
    }
    try {
      await db.ref('irrigationSettings').set(settings);
      alert('Settings saved to Firebase. Pump control remains disabled in this firmware stage.');
    } catch (error) {
      console.error(error);
      alert(`Could not save settings: ${error.message}`);
    }
  }

  function init() {
    if (!window.firebase) {
      setText('system-status', 'Firebase SDK failed to load');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.database();
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      setText('system-status', 'Firebase initialization failed');
      return;
    }

    // Public reads are allowed by the current database rules.
    db.ref('sensorReadings').on('value', snap => {
      const data = snap.val();
      if (!data) {
        renderReadings({});
        setText('last-updated', 'No sensor readings stored yet. Waiting for real sensor data.');
        return;
      }
      // Support either one latest object or a history collection; choose newest by timestamp/key.
      let latest = data;
      if (Array.isArray(data)) latest = data.filter(Boolean).slice(-1)[0] || {};
      else if (typeof data === 'object' && !('soilMoisture' in data) && !('moisture' in data) && !('temperatureC' in data) && !('ph' in data) && !('soilPH' in data)) {
        const entries = Object.entries(data).filter(([,v]) => v && typeof v === 'object');
        if (entries.length) latest = entries.sort((a,b) => String(a[0]).localeCompare(String(b[0]))).slice(-1)[0][1];
      }
      renderReadings(latest);
    }, error => {
      console.error('sensorReadings listener:', error);
      setText('system-status', 'Cannot read sensor data');
    });
    db.ref('pumpStatus/device').on('value', snap => updateDeviceStatus(snap.val()), error => console.warn(error));
    db.ref('pumpStatus').on('value', snap => {
      const status = snap.val() || {};
      // Keep displayed pump states safely locked; no client command is issued.
      const pumpStatusText = status.device && status.device.pumpControlEnabled === true
        ? 'Pump hardware enable flag reported; website controls remain locked in this build.'
        : 'Pumps disabled';
      document.querySelectorAll('.pump-state .state-label').forEach(el => el.textContent = 'Safety lock');
      document.querySelectorAll('.pump-button').forEach(el => { el.disabled = true; el.textContent = 'DISABLED'; });
      setText('device-connection-state', `${status.device && status.device.online ? 'ESP32-S3 online' : 'Waiting/offline'} · ${pumpStatusText}`);
    });

    $('firebase-login-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const email = $('firebase-email').value.trim();
      const password = $('firebase-password').value;
      try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (result.user.uid !== AUTHORIZED_WEBSITE_UID) {
          await auth.signOut();
          alert('This Firebase account is not the authorized website account.');
        }
      } catch (error) {
        console.error(error);
        setText('firebase-auth-status', `Sign-in failed: ${error.message}`);
      } finally {
        $('firebase-password').value = '';
      }
    });
    $('firebase-logout')?.addEventListener('click', () => auth.signOut());
    $('save-settings')?.addEventListener('click', saveSettings);
    $('test-connection')?.addEventListener('click', () => {
      const badge = $('connection-badge');
      if (badge) badge.innerHTML = '<span class="status-dot"></span> Firebase listener active';
      alert('Firebase listeners are active. Check the dashboard for the latest device status.');
    });
    auth.onAuthStateChanged(setAuthUI);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
