// ============================================================
// LAUREAN — Migración localStorage → Supabase (one-shot)
//
// Usar UNA SOLA VEZ cuando se conecte el proyecto Supabase por
// primera vez para mover todo lo guardado localmente a la DB.
//
// Llamar manualmente desde la consola del admin:
//   await migrateToSupabase();
//
// O agregar un botón temporal en el admin que lo ejecute.
// Marca un flag `laurean_migrated_to_supabase=true` para evitar
// re-correrlo. Para forzar: localStorage.removeItem(...) primero.
// ============================================================

(function () {
  async function migrateToSupabase(opts) {
    const sb = window.LAUREAN_DB;
    if (!sb) {
      console.error('[migrate] Supabase no conectado. Configura js/config.js primero.');
      return { ok: false, error: 'supabase_not_ready' };
    }
    opts = opts || {};
    if (!opts.force && localStorage.getItem('laurean_migrated_to_supabase') === 'true') {
      console.warn('[migrate] Ya migrado anteriormente. Para forzar: migrateToSupabase({force:true})');
      return { ok: true, skipped: true };
    }

    const report = { categories: 0, products: 0, errors: [] };

    // ── Categorías personalizadas ──────────────────────────
    const cats = JSON.parse(localStorage.getItem('laurean_custom_categories') || '[]');
    for (const c of cats) {
      const { error } = await sb.from('categories').upsert({
        id: c.id,
        name: c.name,
        image_url: c.image || null,
        starting_price_gtq: c.starting_price_gtq || 0,
        starting_price_usd: c.starting_price_usd || 0,
        active: true,
      });
      if (error) report.errors.push({ kind: 'category', id: c.id, error: error.message });
      else report.categories++;
    }

    // ── Productos personalizados ───────────────────────────
    const prods = JSON.parse(localStorage.getItem('laurean_custom_products') || '[]');
    for (const p of prods) {
      const { error } = await sb.from('products').upsert({
        id: p.id,
        name: p.name,
        image_url: p.image || null,
        description: p.description || null,
        price_gtq: p.price_gtq || 0,
        price_usd: p.price_usd || 0,
        parent_id: p.category || null,
        active: true,
      });
      if (error) report.errors.push({ kind: 'product', id: p.id, error: error.message });
      else report.products++;
    }

    // ── Pedidos (snapshot, opcional) ───────────────────────
    if (opts.includeOrders) {
      const orders = JSON.parse(localStorage.getItem('laurean_orders') || '[]');
      report.orders = 0;
      for (const o of orders) {
        const { error } = await sb.from('orders').insert({
          customer_name: o.customerName || o.userName || 'Cliente',
          customer_phone: o.customerPhone || null,
          customer_email: o.customerEmail || null,
          customer_address: o.customerAddress || null,
          subtotal_gtq: o.subtotal_gtq || 0,
          total_gtq: o.total_gtq || 0,
          items: o.items || [],
          status: o.status || 'pendiente',
          payment_method: o.payment_method || null,
          referral_code: o.referral_code || null,
        });
        if (error) report.errors.push({ kind: 'order', id: o.id, error: error.message });
        else report.orders++;
      }
    }

    if (report.errors.length === 0) {
      localStorage.setItem('laurean_migrated_to_supabase', 'true');
    }

    console.info('[migrate] Migración completada:', report);
    return { ok: true, report };
  }

  window.migrateToSupabase = migrateToSupabase;
})();
