const staticPaths = new Set(["/_headers","/_redirects","/favicon.svg","/fonts/poppins-400.woff2","/fonts/poppins-500.woff2","/fonts/poppins-700.woff2","/icons/KNRT-Marketplace-Complete-Whitepaper (1).pdf","/icons/KNRT-Marketplace-Complete-Whitepaper (2).pdf","/icons/KNRT-Marketplace-Complete-Whitepaper.pdf","/icons/SteamSetup.exe","/icons/eth.svg","/icons/usdc.svg","/icons/weth.svg","/manifest.json","/marker-icon-2x.png","/marker-icon.png","/marker-shadow.png","/prs_alice.idle.mp4","/q-manifest.json","/robots.txt","/screenshot.png","/service-worker.js","/sitemap.xml"]);
function isStaticPath(method, url) {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }
  const p = url.pathname;
  if (p.startsWith("/build/")) {
    return true;
  }
  if (p.startsWith("/assets/")) {
    return true;
  }
  if (staticPaths.has(p)) {
    return true;
  }
  if (p.endsWith('/q-data.json')) {
    const pWithoutQdata = p.replace(/\/q-data.json$/, '');
    if (staticPaths.has(pWithoutQdata + '/')) {
      return true;
    }
    if (staticPaths.has(pWithoutQdata)) {
      return true;
    }
  }
  return false;
}
export { isStaticPath };