/* Reemplazar GA4_ID y PIXEL_ID por los IDs reales para activar la analítica. */
(function() {
  var GA4_ID = 'G-XXXXXXXXXX';
  var PIXEL_ID = 'XXXXXXXXXXXXXXX';
  var GA4_ON = GA4_ID !== 'G-XXXXXXXXXX' && /^G-[A-Z0-9]{6,}$/.test(GA4_ID);
  var PIXEL_ON = PIXEL_ID !== 'XXXXXXXXXXXXXXX' && /^\d{6,}$/.test(PIXEL_ID);

  window.dataLayer = window.dataLayer || [];

  if (GA4_ON) {
    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(gtagScript);

    window.gtag = window.gtag || function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  if (PIXEL_ON) {
    if (!window.fbq) {
      window.fbq = function() {
        window.fbq.callMethod
          ? window.fbq.callMethod.apply(window.fbq, arguments)
          : window.fbq.queue.push(arguments);
      };
      window.fbq.push = window.fbq;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];
    }

    var pixelScript = document.createElement('script');
    pixelScript.async = true;
    pixelScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(pixelScript);

    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  window.track = function(event, params) {
    params = params || {};
    try {
      window.dataLayer.push(Object.assign({ event: event }, params));
      if (window.gtag) window.gtag('event', event, params);
      if (window.fbq) {
        var m = {
          view_item: 'ViewContent',
          add_to_cart: 'AddToCart',
          begin_checkout: 'InitiateCheckout',
          purchase: 'Purchase'
        };
        if (m[event]) window.fbq('track', m[event], params);
        else window.fbq('trackCustom', event, params);
      }
    } catch (e) {}
  };
})();
