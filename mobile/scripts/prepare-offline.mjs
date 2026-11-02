import fs from 'node:fs';

// Keep the bundled recovery action pointed at the same server as Capacitor.
// The phone test build uses a LAN URL; the store build uses the HTTPS origin.
const target = process.env.SNOWD_NATIVE_DEV_URL || 'https://www.snowd.ca/mobile';
const url = new URL(target);
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/mobile') {
  throw new Error('The native retry URL must point to the SNOWD mobile page.');
}
const escaped = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const template = fs.readFileSync('www/offline.template', 'utf8');
fs.writeFileSync('www/offline.html', template.replace('__SNOWD_RETRY_URL__', escaped));
