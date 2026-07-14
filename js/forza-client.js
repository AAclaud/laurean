// ============================================================
// LAUREAN — Cliente Forza Delivery (frontend)
//
// Envuelve la Edge Function `forza-proxy` con métodos semánticos.
// Requiere que el usuario esté logueado en Supabase con rol
// admin / superuser. La Edge Function se encarga de firmar el
// HMAC y mantiene la SecretKey segura del lado del servidor.
//
// Uso:
//   const r = await Forza.quoteRate({ HeaderCodeSource: '0101', HeaderCodeDestiny: '0301', ... });
//   if (r.ok) console.log(r.data);
// ============================================================

(function () {
  async function call(endpoint, params) {
    const PUBLIC_ENDPOINTS = ['GetListProvincesByHeaderCode', 'GetListTownshipByHeaderCode'];
    const isPublicEndpoint = PUBLIC_ENDPOINTS.includes(endpoint);
    const sb = window.LAUREAN_DB;
    const config = window.LAUREAN_CONFIG;
    let token;

    if (sb) {
      const { data: sessionData } = await sb.auth.getSession();
      token = sessionData?.session?.access_token;
    } else if (!isPublicEndpoint || !config) {
      return { ok: false, error: 'supabase_not_ready', message: 'Conecta Supabase primero.' };
    }

    if (!token) {
      if (!isPublicEndpoint) return { ok: false, error: 'not_authenticated', message: 'Inicia sesión.' };
      token = config.SUPABASE_ANON;
    }

    const url = `${config.SUPABASE_URL}/functions/v1/forza-proxy`;
    let resp;
    try {
      resp = await fetch(url, {
        method:  'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type':  'application/json',
          'apikey':        config.SUPABASE_ANON,
        },
        body: JSON.stringify({ endpoint, params: params || {} }),
      });
    } catch (err) {
      return { ok: false, error: 'network', message: String(err) };
    }
    let data;
    try { data = await resp.json(); } catch { data = null; }
    if (!resp.ok) return { ok: false, status: resp.status, error: data?.error || 'http_error', data };
    return { ok: true, data };
  }

  window.Forza = {
    listDepartments:    ()             => call('GetListProvincesByHeaderCode'),
    listTownships:      (provinceCode) => call('GetListTownshipByHeaderCode', { HeaderCode: provinceCode }),
    listBanks:          ()             => call('GetBankName'),
    listExpressCenters: ()             => call('GetCatalogExpressCenter'),
    quoteRate:          (params)       => call('GetShippingRatesByHeaderCode', params),
    routeAndHub:        (params)       => call('GetRouteAndHubByAddress', params),
    createGuide:        (params)       => call('GetServiceByHeaderCodeRequest', params),
    trackGuide:         (serie, number)=> call('GetTrackOrderDetail', { GuideSerie: serie, GuideNumber: Number(number) }),
    cancelGuide:        (serie, number)=> call('SetCancelGuides', {
      Guides: [{ Serie: serie, Number: Number(number) }],
    }),
    reprintGuide:       (serie, number)=> call('GetGuideReprintRequest', {
      GuideNumber: [{ Guides: String(serie) + String(number) }],
    }),
    createAddress:      (params)       => call('SetAddressByIntegration', params),
    listAddresses:      ()             => call('GetAddressByIntegration'),
    createPickup:       (params)       => call('SetPickupServiceByIntegration', params),
  };
})();
