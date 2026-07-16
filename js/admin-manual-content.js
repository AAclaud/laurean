/**
 * admin-manual-content.js — Contenido de los manuales de uso del panel Laurean.
 * Data pura (documentación). El widget que lo muestra vive en js/admin-manual.js.
 *
 * Esquema por vista (clave = data-view del sidebar):
 *   { label, subtitle, blocks: [ ...bloques ] }
 * Tipos de bloque:
 *   { type:'p',     text }                 -> párrafo
 *   { type:'h',     text }                 -> subtítulo de sección
 *   { type:'list',  items:[...] }          -> lista con viñetas
 *   { type:'steps', items:[...] }          -> pasos numerados
 *   { type:'kv',    items:[[term,def],...] }-> término en negrita + explicación
 *   { type:'note',  text }                 -> caja de consejo resaltada
 *   { type:'roles', items:[...] }          -> "Quién lo usa" (chips de rol)
 */
window.LAUREAN_MANUAL_VIEWS = {

  dashboard: {
    label: 'Dashboard',
    subtitle: 'El resumen del negocio de un vistazo',
    blocks: [
      { type: 'p', text: 'Es la pantalla de inicio del panel. Reúne los números clave del día y accesos rápidos para que sepas cómo va el negocio sin entrar a cada módulo.' },
      { type: 'h', text: 'Qué muestra' },
      { type: 'list', items: [
        'Ventas y pedidos recientes.',
        'Alertas de stock bajo (productos por reabastecer).',
        'Pedidos pendientes por atender.',
        'Accesos directos a las secciones más usadas.',
      ] },
      { type: 'note', text: 'Es solo de lectura: aquí no se edita nada. Toca una tarjeta o un número para ir directo al módulo que lo controla (por ejemplo, la tarjeta de pedidos te lleva a Pedidos).' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  pedidos: {
    label: 'Pedidos',
    subtitle: 'Todos los pedidos de la tienda y del punto de venta',
    blocks: [
      { type: 'p', text: 'Aquí llegan los pedidos de la tienda en línea (clientes) y los del punto de venta (POS). Desde cada pedido gestionas su estado, el pago, el envío y el contacto con el cliente.' },
      { type: 'h', text: 'Estados del pedido' },
      { type: 'kv', items: [
        ['Pendiente', 'recién ingresado, aún no se procesa.'],
        ['Procesando', 'se está preparando.'],
        ['Enviado', 'ya salió con el courier.'],
        ['Completado', 'entregado y cerrado.'],
        ['Cancelado', 'anulado (no cuenta como venta).'],
      ] },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'steps', items: [
        'Abre un pedido para ver los productos, el total y los datos del cliente.',
        'Cambia el estado y marca si el pago fue recibido.',
        'Usa "Seguimiento WhatsApp" para escribirle al cliente con el detalle ya armado.',
        'Genera la guía de envío (Forza) cuando el pedido tenga departamento y municipio.',
      ] },
      { type: 'note', text: 'El punto rojo en el menú indica pedidos pendientes. Se apaga solo cuando ya no quedan pendientes: no necesitas "marcarlos como vistos".' },
      { type: 'roles', items: ['admin', 'superusuario', 'agente de pedidos'] },
    ],
  },

  comisiones: {
    label: 'Comisiones',
    subtitle: 'Comisiones de las vendedoras por sus pedidos',
    blocks: [
      { type: 'p', text: 'Registra cuánto le corresponde a cada vendedora por los pedidos que trajo con su código de referido. Las comisiones se calculan solas a partir de los pedidos: no se crean a mano.' },
      { type: 'h', text: 'Cómo se generan' },
      { type: 'list', items: [
        'Cuando un cliente compra usando el código de una vendedora, el pedido queda marcado con ese código.',
        'El sistema crea la comisión con el porcentaje configurado para esa vendedora.',
        'Cada comisión se enlaza a su pedido, así que no se duplican.',
      ] },
      { type: 'h', text: 'Estados' },
      { type: 'kv', items: [
        ['Pendiente', 'aún no se le ha pagado a la vendedora.'],
        ['Pagada', 'ya se liquidó.'],
      ] },
      { type: 'note', text: 'Si una comisión no aparece, revisa que el pedido tenga el código de referido y que la vendedora esté activa con su porcentaje configurado en Usuarios.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  pagos: {
    label: 'Pagos',
    subtitle: 'Transacciones de pago en línea (tarjeta)',
    blocks: [
      { type: 'p', text: 'Muestra los pagos con tarjeta hechos en la tienda a través de la pasarela (QPayPro). Es un registro de solo lectura: cada transacción la crea la pasarela cuando el cliente paga, no se ingresa a mano.' },
      { type: 'h', text: 'Qué ves de cada pago' },
      { type: 'list', items: [
        'Pedido asociado y cliente.',
        'Monto y estado del pago.',
        'Fecha de la transacción.',
      ] },
      { type: 'note', text: 'Los pagos por transferencia o contra entrega NO aparecen aquí; esos se marcan como recibidos desde el pedido, en el módulo Pedidos. Esta sección es solo para pagos con tarjeta en línea.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  estadisticas: {
    label: 'Estadísticas',
    subtitle: 'Reportes de ventas por rango de fechas',
    blocks: [
      { type: 'p', text: 'Genera reportes del período que elijas: ventas totales, ticket promedio, ventas web vs. punto de venta, cobros pendientes, y los productos y vendedoras que más venden.' },
      { type: 'h', text: 'Pasos' },
      { type: 'steps', items: [
        'Elige la fecha "Desde" y "Hasta".',
        'Presiona "Aplicar" para actualizar los números.',
        'Usa "Imprimir reporte" o "Exportar CSV" para descargar.',
      ] },
      { type: 'h', text: 'Indicadores clave' },
      { type: 'kv', items: [
        ['Ventas totales', 'suma de pedidos completados en el período.'],
        ['Ticket promedio', 'venta promedio por pedido.'],
        ['Por cobrar', 'pedidos con pago aún pendiente.'],
      ] },
      { type: 'note', text: 'Los números respetan el rango de fechas seleccionado. Si algo se ve en cero, revisa que el rango incluya los días con actividad.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  analytics: {
    label: 'Analítica',
    subtitle: 'Visitas y comportamiento en el sitio web',
    blocks: [
      { type: 'p', text: 'Muestra cuánta gente visita la tienda y qué páginas ven. Sirve para entender el tráfico, no las ventas (para ventas usa Estadísticas).' },
      { type: 'h', text: 'Qué muestra' },
      { type: 'list', items: [
        'Total de visitas y su tendencia (últimos 7 y 30 días).',
        'Páginas más visitadas.',
      ] },
      { type: 'note', text: 'Los datos llegan en vivo desde el sitio. Si aún no hay visitas registradas, la sección se verá vacía hasta que haya tráfico.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  productos: {
    label: 'Productos',
    subtitle: 'El catálogo de la tienda',
    blocks: [
      { type: 'p', text: 'Es el corazón de la tienda: aquí creas y editas los productos, subes sus fotos, defines precios y decides cuáles se publican al cliente.' },
      { type: 'h', text: 'Pasos para crear o editar' },
      { type: 'steps', items: [
        'Abre un producto o crea uno nuevo.',
        'Completa nombre, descripción, categoría y subcategoría.',
        'Sube las fotos (galería) y define las variantes de color visibles.',
        'Pon el precio y activa "Publicado" para que aparezca en la tienda.',
      ] },
      { type: 'note', text: 'Solo se publica lo que tiene foto y está marcado como "Publicado". Un producto sin publicar queda guardado pero no lo ve el cliente. Los cambios de precio se reflejan en la tienda en pocos segundos.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  lookbook: {
    label: 'Lookbook',
    subtitle: 'El lookbook editorial de la portada',
    blocks: [
      { type: 'p', text: 'Controla las imágenes del lookbook (el carrusel editorial) que se muestra en la página de inicio de la tienda.' },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'list', items: [
        'Agregar, quitar o reordenar las imágenes del lookbook.',
        'Actualizar la presentación visual de la portada sin tocar el catálogo.',
      ] },
      { type: 'note', text: 'El lookbook es imagen de marca, no productos con precio. Para vender usa Productos y Combos; el lookbook es para ambientar y atraer.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

  categorias: {
    label: 'Categorías',
    subtitle: 'Cómo se organiza el catálogo',
    blocks: [
      { type: 'p', text: 'Define las categorías (Mujer, Hombre, Laurean Kids, Ofertas…) y sus subcategorías, con las que se agrupan los productos en la tienda.' },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'list', items: [
        'Editar el nombre, la imagen y el "Precio desde Q…" de cada categoría.',
        'Crear subcategorías (por ejemplo Blusas, Vestidos).',
        'Crear categorías nuevas o eliminar las que ya no uses.',
      ] },
      { type: 'note', text: 'El "Precio desde" es solo una referencia que ve el cliente en la portada de la categoría; el precio real de venta se pone en cada Producto. Guarda con el botón de precios tras editarlos.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  combos: {
    label: 'Combos',
    subtitle: 'Paquetes de productos a precio especial',
    blocks: [
      { type: 'p', text: 'Arma paquetes de varios productos con un precio especial. Es una forma de vender conjuntos (por ejemplo, un look completo) más atractivos que comprar suelto.' },
      { type: 'h', text: 'Pasos para armar un combo' },
      { type: 'steps', items: [
        'Crea un combo y ponle nombre y descripción.',
        'Agrega los productos que lo forman y la cantidad de cada uno.',
        'Sube una portada en "Portada del combo" (o se usa un collage por defecto).',
        'Elige dónde se muestra (Tienda, Todas o bodegas) y actívalo.',
      ] },
      { type: 'note', text: 'Solo los combos ACTIVOS asignados a "Tienda" o "Todas" aparecen al cliente, en la pestaña "Combos" de la tienda. Un combo inactivo queda como borrador.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  inventario: {
    label: 'Inventario',
    subtitle: 'Stock, movimientos y control por bodega',
    blocks: [
      { type: 'p', text: 'Controla las existencias de cada producto por bodega. Tiene varias pestañas: Stock actual, Movimientos, Calendario y Mayoreo (el maestro de artículos).' },
      { type: 'h', text: 'Tipos de movimiento' },
      { type: 'kv', items: [
        ['Ingreso', 'aumenta stock (llega mercadería).'],
        ['Salida', 'disminuye stock (merma, daño, ajuste).'],
        ['Ajuste', 'corrige el stock tras un conteo físico.'],
        ['Traslado', 'mueve stock de una bodega a otra.'],
      ] },
      { type: 'note', text: 'El punto rojo en el menú avisa de stock bajo. Cada movimiento queda registrado con usuario y fecha; para corregir un error, registra el movimiento contrario (no se borran).' },
      { type: 'roles', items: ['admin', 'superusuario', 'bodega'] },
    ],
  },

  proveedores: {
    label: 'Proveedores',
    subtitle: 'A quién le compras y tu historial con cada uno',
    blocks: [
      { type: 'p', text: 'Guarda tus proveedores y el historial de compras que les has hecho. Sirve para tener a la mano contactos y saber cuánto y qué le compras a cada uno.' },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'list', items: [
        'Crear y editar proveedores (nombre, contacto).',
        'Ver el historial de compras por proveedor.',
      ] },
      { type: 'note', text: 'Algunos proveedores se crean solos a partir del inventario importado; puedes completarlos o editarlos aquí.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  bodegas: {
    label: 'Bodegas',
    subtitle: 'Los lugares donde guardas stock',
    blocks: [
      { type: 'p', text: 'Administra las bodegas entre las que se reparte el inventario. Cada producto tiene stock por bodega.' },
      { type: 'h', text: 'Bodegas protegidas' },
      { type: 'kv', items: [
        ['Bodega Central', 'la principal, desde donde se reparte.'],
        ['Website', 'lo publicado/asignado a la tienda en línea.'],
      ] },
      { type: 'note', text: 'Central y Website no se pueden eliminar (son del sistema), pero sí puedes renombrarlas. Puedes crear bodegas adicionales según tu operación.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  cotizaciones: {
    label: 'Cotizaciones',
    subtitle: 'Propuestas de venta para clientes',
    blocks: [
      { type: 'p', text: 'Crea cotizaciones o propuestas comerciales para enviar a clientes (por ejemplo, ventas al por mayor o pedidos especiales).' },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'list', items: [
        'Armar una cotización con productos, cantidades y precios.',
        'Guardarla y consultarla después.',
      ] },
      { type: 'note', text: 'Una cotización no descuenta stock ni crea un pedido: es una propuesta. Cuando el cliente confirma, se procesa como pedido o venta.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  envios: {
    label: 'Envíos · Forza',
    subtitle: 'Guías de envío con el courier',
    blocks: [
      { type: 'p', text: 'Conecta con Forza (el courier) para generar y dar seguimiento a las guías de envío de los pedidos.' },
      { type: 'h', text: 'Qué puedes hacer' },
      { type: 'list', items: [
        'Ver el estado de la conexión con Forza.',
        'Generar guías para los pedidos listos para enviar.',
      ] },
      { type: 'note', text: 'Para generar una guía, el pedido debe tener departamento y municipio válidos (se capturan en el checkout). Si falta el municipio, complétalo desde el pedido antes de generar la guía.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  vendedores: {
    label: 'Usuarios',
    subtitle: 'Quién entra al panel y con qué permisos',
    blocks: [
      { type: 'p', text: 'Crea y administra las personas que usan el sistema, su rol (qué pueden hacer) y, en el caso de las vendedoras, su código de referido y porcentaje de comisión.' },
      { type: 'h', text: 'Roles' },
      { type: 'kv', items: [
        ['Superusuario', 'control total, incluida la configuración.'],
        ['Admin', 'opera la tienda día a día.'],
        ['Vendedor', 'trae pedidos con su código y gana comisión.'],
        ['Bodega', 'maneja inventario y stock.'],
        ['Agente de pedidos', 'atiende y despacha pedidos.'],
      ] },
      { type: 'note', text: 'El rol define lo que cada quien puede ver y hacer. Da siempre el permiso mínimo necesario: no todos necesitan ser admin.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

  clientes: {
    label: 'Clientes',
    subtitle: 'La base de datos de tus compradores',
    blocks: [
      { type: 'p', text: 'Reúne a los clientes que han comprado, con su nombre, teléfono y su historial. Se arma solo a partir de los pedidos (no hay que capturarlos a mano).' },
      { type: 'h', text: 'Qué puedes ver' },
      { type: 'list', items: [
        'Datos de contacto del cliente.',
        'Cuántos pedidos ha hecho y cuánto ha gastado.',
        'Fecha de su primer y último pedido.',
      ] },
      { type: 'note', text: 'Son datos personales: úsalos con cuidado y solo para atender a tus clientes. Un mismo cliente no se duplica porque se agrupa por su teléfono.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  descuentos: {
    label: 'Descuentos',
    subtitle: 'Códigos de descuento para la tienda',
    blocks: [
      { type: 'p', text: 'Crea códigos que el cliente escribe en el checkout para obtener un descuento. Tú controlas cuánto descuentan, hasta cuándo son válidos y cuántas veces se pueden usar.' },
      { type: 'h', text: 'Tipos de descuento' },
      { type: 'kv', items: [
        ['Porcentaje', 'descuenta un % del total (por ejemplo 10%).'],
        ['Fijo', 'descuenta un monto en quetzales (por ejemplo Q50).'],
      ] },
      { type: 'h', text: 'Pasos' },
      { type: 'steps', items: [
        'Crea el código (por ejemplo BIENVENIDA10).',
        'Elige tipo (porcentaje o fijo) y el valor.',
        'Define vigencia y, si quieres, un límite de usos.',
        'Actívalo para que funcione en la tienda.',
      ] },
      { type: 'note', text: 'Un código inactivo o vencido deja de aplicar automáticamente. El sistema valida cada código al momento de usarlo, así que no se puede abusar de uno caducado.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  solicitudes: {
    label: 'Solicitudes',
    subtitle: 'Postulaciones para ser vendedora',
    blocks: [
      { type: 'p', text: 'Aquí llegan las personas que se postulan como vendedoras desde la página de vendedores. Tú decides si las apruebas o rechazas.' },
      { type: 'h', text: 'Pasos' },
      { type: 'steps', items: [
        'Revisa los datos de la solicitud.',
        'Aprueba para crear su usuario de vendedora (con su código de referido), o recházala.',
      ] },
      { type: 'note', text: 'El punto en el menú avisa de solicitudes nuevas por revisar. Al aprobar, se crea la vendedora automáticamente; evita aprobar dos veces la misma.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  config: {
    label: 'Configuración',
    subtitle: 'Los ajustes generales del negocio',
    blocks: [
      { type: 'p', text: 'Centraliza los datos y reglas del negocio que usan la tienda y el panel: información de la empresa, contacto, precios de envío y parámetros de comisiones/descuentos.' },
      { type: 'h', text: 'Qué se configura aquí' },
      { type: 'list', items: [
        'Datos del negocio (nombre, NIT, correo, horario).',
        'Número de WhatsApp de contacto.',
        'Precios de envío y parámetros de precios/comisiones.',
      ] },
      { type: 'note', text: 'Lo que cambies aquí afecta a toda la tienda y a los documentos (por ejemplo, el WhatsApp o el NIT). Cámbialo con cuidado y verifica en la tienda después de guardar.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

};
