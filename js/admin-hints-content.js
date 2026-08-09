/* Textos de ayuda contextual del dashboard. Edita el contenido aquí, no en admin.html. */

const secciones = [
  {
    ancla: '#view-dashboard .view-title',
    texto: 'Resume la operación reciente: alertas, pedidos y datos clave para decidir qué atender primero.',
    destino: 'Pedidos · Inventario · Comisiones'
  },
  {
    ancla: '#view-productos .view-title',
    texto: 'Administra el catálogo, sus precios públicos, imágenes, categorías y opciones de color o talla. Las existencias reales se mueven en Inventario.',
    destino: 'Tienda · POS · Cotizaciones'
  },
  {
    ancla: '#view-lookbook .view-title',
    texto: 'Ordena y edita la galería editorial que presenta colecciones, imágenes y textos de marca.',
    destino: 'Lookbook público de la tienda'
  },
  {
    ancla: '#view-solicitudes .view-title',
    tono: 'aviso',
    texto: 'Revisa las solicitudes de personas que quieren vender. Al aprobar una solicitud se crea su usuario para ingresar al sistema.',
    destino: 'Usuarios · acceso de vendedores'
  },
  {
    ancla: '#view-vendedores .view-title',
    tono: 'aviso',
    texto: 'Define el acceso de cada persona, sus bodegas, permisos del dashboard, acceso al POS y reglas de comisión.',
    destino: 'Dashboard · POS · Comisiones'
  },
  {
    ancla: '#view-pedidos .view-title',
    tono: 'aviso',
    texto: 'Consulta y procesa pedidos de Tienda o POS. Al crear un pedido, el sistema descuenta automáticamente la variante vendida.',
    destino: 'Inventario · Clientes · Comisiones · Envíos'
  },
  {
    ancla: '#view-comisiones .view-title',
    texto: 'Muestra las comisiones generadas por ventas enlazadas al código de referido de cada vendedor y permite controlar su estado.',
    destino: 'Usuarios vendedores · Pedidos'
  },
  {
    ancla: '#view-config .view-title',
    tono: 'aviso',
    texto: 'Concentra porcentajes, comisiones, envíos y contenido global del sitio. Un cambio aquí puede modificar precios o información visible al cliente.',
    destino: 'Tienda · POS · Comisiones · Footer · Políticas'
  },
  {
    ancla: '#view-logs .view-title',
    texto: 'Conserva el historial de actividad para revisar quién hizo cada acción y cuándo. Este apartado es exclusivo del superusuario.',
    destino: 'Control y auditoría interna'
  },
  {
    ancla: '#view-estadisticas .view-title',
    texto: 'Agrupa resultados de ventas para comparar periodos, productos y desempeño comercial.',
    destino: 'Decisiones comerciales · reportes'
  },
  {
    ancla: '#view-analytics .view-title',
    texto: 'Presenta la actividad de la tienda para entender visitas y comportamiento de navegación.',
    destino: 'Seguimiento del sitio público'
  },
  {
    ancla: '#view-categorias .view-title',
    texto: 'Organiza productos en categorías y subcategorías para que sea más fácil encontrarlos y filtrarlos.',
    destino: 'Catálogo de la tienda · filtro del POS'
  },
  {
    ancla: '#view-proveedores .view-title',
    texto: 'Guarda los proveedores y reúne su historial de ingresos de mercadería para consultar compras y emitir órdenes.',
    destino: 'Inventario · historial de compras · orden de compra'
  },
  {
    ancla: '#view-bodegas .view-title',
    tono: 'aviso',
    texto: 'Define los lugares donde se controlan existencias. Cada vendedora del POS opera y vende únicamente desde sus bodegas asignadas.',
    destino: 'Inventario por bodega · POS · Usuarios'
  },
  {
    ancla: '#view-cotizaciones .view-title',
    texto: 'Prepara propuestas para clientes mayoristas con productos, cantidades, descuento y estado de seguimiento.',
    destino: 'Documento imprimible o PDF para el cliente'
  },
  {
    ancla: '#view-inventario .view-title',
    tono: 'aviso',
    texto: 'Aquí viven las existencias reales por producto, bodega, color y talla. Usa movimientos para ingresar, retirar, ajustar o trasladar unidades.',
    destino: 'Disponibilidad en POS · disponibilidad en tienda'
  },
  {
    ancla: '#view-combos .view-title',
    texto: 'Arma paquetes de productos con precio especial y decide dónde ofrecerlos. En el POS se elige color y talla de cada prenda al agregar el combo.',
    destino: 'Tienda · POS · bodegas asignadas'
  },
  {
    ancla: '#view-clientes .view-title',
    texto: 'Reúne los datos e historial comercial de clientes. Los registros también se crean automáticamente cuando entran pedidos.',
    destino: 'Pedidos · seguimiento comercial'
  },
  {
    ancla: '#view-descuentos .view-title',
    tono: 'aviso',
    texto: 'Crea códigos promocionales que el cliente escribe al finalizar su compra y controla su vigencia y cantidad total de usos.',
    destino: 'Checkout de la tienda · total del pedido'
  },
  {
    ancla: '#view-envios .view-title',
    texto: 'Cotiza, genera y rastrea guías con Forza Delivery. COD significa contra entrega: el repartidor cobra al cliente al recibir.',
    destino: 'Pedidos · guías Forza · cobros COD'
  },
  {
    ancla: '#view-pagos .view-title',
    tono: 'aviso',
    texto: 'Configura los datos bancarios y medios de pago manual que verá el cliente, y consulta las transacciones registradas.',
    destino: 'Checkout de la tienda · cobro del pedido'
  }
];

const campos = {
  'mp-category': {
    titulo: 'Categoría',
    texto: 'Ubica el producto en el grupo principal del catálogo y determina qué subcategorías puedes elegir.',
    destino: 'Tienda · filtro del POS'
  },
  'mp-subcat': {
    titulo: 'Subcategoría',
    texto: 'Afina la clasificación dentro de la categoría elegida para que el producto aparezca en el filtro correcto.',
    destino: 'Catálogo de la tienda · filtro del POS'
  },
  'mp-stock': {
    titulo: 'Stock del catálogo',
    texto: 'Es un dato informativo guardado con el producto; no representa unidades disponibles en una bodega.',
    ojo: 'No cambia existencias reales. Usa Inventario → Ingreso, Salida, Ajuste o Traslado.',
    destino: 'Catálogo del producto; no existencias de bodega'
  },
  'mp-price-gtq': {
    titulo: 'Precio público (Q)',
    texto: 'Es el precio base que ve quien compra sin sesión de vendedor. Los precios por rol se calculan desde este monto.',
    destino: 'Tienda · POS · descuentos por rol'
  },
  'mp-price-usd': {
    titulo: 'Precio público (USD)',
    texto: 'Define el precio público en dólares cuando esa moneda está habilitada; no se convierte automáticamente desde quetzales.',
    destino: 'Tienda · vistas con precio en USD'
  },
  'mp-cost': {
    titulo: 'Costo interno (Q)',
    texto: 'Registra lo que cuesta adquirir el producto. Se usa para calcular utilidad y nunca se muestra al cliente.',
    destino: 'Reporte de utilidad'
  },
  'mp-image': {
    titulo: 'Imagen principal',
    texto: 'Usa una ruta o URL pública. Es la imagen de referencia cuando el producto no tiene una galería propia.',
    destino: 'Listado y ficha del producto'
  },
  'mp-gallery': {
    titulo: 'Galería',
    texto: 'Separa las URLs con comas. Estas fotos alimentan la ficha y pueden enlazarse a colores o diseños específicos.',
    destino: 'Ficha del producto · selector de variante'
  },
  'mp-variants': {
    titulo: 'Colores, diseños y tallas',
    texto: 'Define qué opciones puede elegir el cliente y qué foto corresponde a cada color o diseño.',
    ojo: 'Las existencias disponibles se controlan por variante y bodega desde Inventario.',
    destino: 'Ficha del producto · POS'
  },

  'inv-type-select': {
    titulo: 'Tipo de movimiento',
    texto: 'Ingreso suma; salida resta sin venta; ajuste deja la cantidad contada; traslado resta en origen y suma en destino.',
    destino: 'Existencias reales · historial de movimientos'
  },
  'inv-bodega-select': {
    titulo: 'Bodega',
    texto: 'El movimiento modifica únicamente las combinaciones de color y talla de esta bodega.',
    destino: 'Stock disponible para los usuarios asignados a esa bodega'
  },
  'inv-proveedor-select': {
    titulo: 'Proveedor',
    texto: 'Relaciona un ingreso de mercadería con su proveedor para conservar el costo y el historial de compras.',
    destino: 'Proveedores · historial de compras'
  },
  'inv-paid': {
    titulo: 'Pagado al proveedor',
    texto: 'Marca si la mercadería de este ingreso ya fue pagada; queda como referencia administrativa de la compra.',
    destino: 'Historial del proveedor · ingreso de inventario'
  },
  'inv-product-search': {
    titulo: 'Producto del movimiento',
    texto: 'Busca y selecciona el producto antes de indicar las combinaciones exactas que vas a mover.',
    destino: 'Inventario del producto elegido'
  },
  'inv-var-grid': {
    titulo: 'Cantidades por color y talla',
    texto: 'Escribe la cantidad para cada combinación. En un ajuste, el número es la existencia final contada, no una suma ni una resta.',
    destino: 'Existencias de la bodega · disponibilidad en el POS'
  },
  'inv-motivo': {
    titulo: 'Motivo de salida',
    texto: 'Clasifica por qué salen unidades sin pasar por una venta, por ejemplo merma, regalo o traslado externo.',
    destino: 'Historial de movimientos · auditoría de inventario'
  },
  'inv-transfer-from': {
    titulo: 'Bodega origen',
    texto: 'Es la bodega de la que se restarán las cantidades indicadas por color y talla.',
    ojo: 'Si una combinación no alcanza, se rechaza todo el traslado y no se guarda a medias.',
    destino: 'Existencias de la bodega origen'
  },
  'inv-transfer-to': {
    titulo: 'Bodega destino',
    texto: 'Recibe exactamente las unidades retiradas de la bodega origen, conservando su color y talla.',
    destino: 'Existencias de la bodega destino · disponibilidad en POS'
  },
  'inv-notes': {
    titulo: 'Notas del movimiento',
    texto: 'Anota una referencia que permita entender después por qué se hizo el movimiento o con qué documento se relaciona.',
    destino: 'Historial de movimientos'
  },

  'm-role': {
    titulo: 'Rol',
    texto: 'Define el acceso base del usuario. Después puedes limitar apartados, dejarlo en consulta o habilitarle el POS.',
    destino: 'Inicio de sesión · dashboard · permisos base'
  },
  'm-code': {
    titulo: 'Código de referido',
    texto: 'Es lo que conecta una venta con su comisión: si el cliente escribe este código al comprar, la venta se le acredita a esta persona.',
    ojo: 'Si lo cambias, las ventas hechas con el código anterior siguen enlazadas a ese código viejo.',
    destino: 'Checkout · pedidos · comisiones'
  },
  'm-bodega-checks': {
    titulo: 'Bodegas asignadas',
    texto: 'Solo verá y venderá el inventario de las bodegas que marques aquí, nunca el de las demás.',
    ojo: 'Si su bodega no tiene ese color y esa talla, no podrá venderlos: primero traslada desde Central en Inventario.',
    destino: 'POS · inventario visible del usuario'
  },
  'm-commission': {
    titulo: 'Comisión individual',
    texto: 'Manda sobre todo lo demás: si le pones un número aquí, se ignoran tanto la comisión global como los niveles de vendedor.',
    destino: 'Cálculo de comisiones en sus ventas'
  },
  'm-can-pos': {
    titulo: 'Acceso al POS',
    texto: 'Habilita a esta persona para entrar al punto de venta; no reemplaza el rol ni la asignación de bodegas.',
    destino: 'Ingreso al POS'
  },
  'm-restrict-views': {
    titulo: 'Apartados visibles',
    texto: 'Activa una segunda capa de acceso para mostrar solo los módulos marcados. El rol sigue definiendo el permiso base.',
    destino: 'Menú y vistas del dashboard'
  },
  'desc-code': {
    titulo: 'Código promocional',
    texto: 'Es la clave que el cliente escribe al finalizar su compra. Usa un texto corto y fácil de comunicar.',
    destino: 'Checkout de la tienda'
  },
  'desc-type': {
    titulo: 'Tipo de descuento',
    texto: 'Elige si el valor se resta como porcentaje del total o como un monto fijo en quetzales.',
    destino: 'Total del pedido en checkout'
  },
  'desc-value': {
    titulo: 'Valor del descuento',
    texto: 'Se interpreta según el tipo elegido: 10 puede significar 10 % o Q10.',
    ojo: 'Confirma el tipo antes de activar el código para evitar un descuento distinto al planeado.',
    destino: 'Total del pedido en checkout'
  },
  'desc-limit': {
    titulo: 'Límite total de usos',
    texto: 'Es la cantidad máxima de veces que puede usarse el código entre todos los clientes. Cero significa ilimitado.',
    ojo: 'No es un límite por cliente.',
    destino: 'Validación del código en checkout'
  },
  'desc-from': {
    titulo: 'Inicio de vigencia',
    texto: 'Antes de esta fecha el checkout rechazará el código.',
    destino: 'Validación del código en checkout'
  },
  'desc-to': {
    titulo: 'Fin de vigencia',
    texto: 'Después de esta fecha el checkout rechazará el código aunque siga marcado como activo.',
    destino: 'Validación del código en checkout'
  },
  'desc-active': {
    titulo: 'Código activo',
    texto: 'Permite usar el código dentro de sus fechas y límite. Desmárcalo para detenerlo sin eliminar su historial.',
    destino: 'Disponibilidad del código en checkout'
  },

  'combo-assign-checks': {
    titulo: 'Dónde ofrecer el combo',
    texto: 'Elige si aparece en la tienda, en todas las bodegas o únicamente en bodegas específicas.',
    destino: 'Tienda · POS de las bodegas elegidas'
  },
  'combo-product-search': {
    titulo: 'Productos del combo',
    texto: 'Agrega las prendas incluidas. Después define cantidad y precio especial de cada una dentro del paquete.',
    destino: 'Contenido y precio total del combo'
  },
  'combo-image-url': {
    titulo: 'Portada del combo',
    texto: 'Puedes subir una imagen o pegar una URL pública para identificar el paquete.',
    destino: 'Listado del combo en Tienda y POS'
  },

  'bodega-name': {
    titulo: 'Nombre de la bodega',
    texto: 'Identifica el lugar al asignar usuarios, consultar stock y registrar movimientos.',
    destino: 'Usuarios · POS · Inventario · Traslados'
  },

  'prov-name': {
    titulo: 'Proveedor',
    texto: 'Este nombre queda disponible al registrar ingresos y agrupa las compras relacionadas.',
    destino: 'Inventario · historial de compras · órdenes de compra'
  },

  'cot-client': {
    titulo: 'Cliente de la cotización',
    texto: 'Este nombre encabeza la propuesta que se imprime o guarda como PDF.',
    destino: 'Documento de cotización'
  },
  'cot-status': {
    titulo: 'Estado de la cotización',
    texto: 'Registra en qué etapa está la propuesta: borrador, enviada, aprobada o rechazada.',
    destino: 'Seguimiento interno de cotizaciones'
  },
  'cot-disc-pct': {
    titulo: 'Descuento de la cotización',
    texto: 'Reduce el subtotal completo de esta propuesta y recalcula el total final.',
    destino: 'Total impreso de la cotización'
  },
  'cot-notes': {
    titulo: 'Notas de la cotización',
    texto: 'Incluye condiciones o aclaraciones que deban aparecer en la propuesta entregada al cliente.',
    destino: 'Documento impreso o PDF'
  },

  'mc-price-gtq': {
    titulo: 'Precio inicial (Q)',
    texto: 'Es el monto “Desde Q” que presenta la tienda al entrar en esta categoría; no cambia el precio de sus productos.',
    destino: 'Encabezado de la categoría en la tienda'
  },
  'mc-price-usd': {
    titulo: 'Precio inicial (USD)',
    texto: 'Es la referencia “Desde” en dólares para esta categoría; no se calcula desde el valor en quetzales.',
    destino: 'Categoría de la tienda cuando se muestra USD'
  },
  'mc-image': {
    titulo: 'Imagen de la categoría',
    texto: 'Usa una ruta o URL pública que represente el grupo completo, no un producto individual.',
    destino: 'Tarjeta y portada de la categoría'
  },

  'msc-parent': {
    titulo: 'Categoría padre',
    texto: 'Define dentro de qué categoría aparecerá esta subcategoría y qué productos podrán usarla.',
    destino: 'Catálogo de la tienda · filtro del POS'
  },
  'msc-id': {
    titulo: 'ID de subcategoría',
    texto: 'Es la clave técnica usada en filtros y enlaces. Si la dejas vacía al crearla, se genera desde el nombre.',
    ojo: 'Al editar, evita cambiarla si ya hay productos enlazados.',
    destino: 'Productos · filtros del catálogo y POS'
  },

  'pub-public-price': {
    titulo: 'Precio público de mayoreo',
    texto: 'Es el precio que verá cualquier visitante sin sesión de vendedor cuando este artículo pase al catálogo.',
    destino: 'Ficha pública del producto'
  },
  'pub-cat-parent': {
    titulo: 'Categoría de publicación',
    texto: 'Ubica el artículo de mayoreo en el grupo principal del catálogo y habilita sus subcategorías.',
    destino: 'Catálogo de la tienda · filtro del POS'
  },
  'pub-cat-subcat': {
    titulo: 'Subcategoría de publicación',
    texto: 'Afina dónde se encontrará el artículo después de publicarlo.',
    destino: 'Catálogo de la tienda · filtro del POS'
  },
  'pub-gallery': {
    titulo: 'Galería pública',
    texto: 'Separa las URLs con comas. La primera imagen se usa como portada del producto publicado.',
    destino: 'Listado y ficha pública del producto'
  },
  'pub-show-in-catalog': {
    titulo: 'Aparece en catálogo',
    texto: 'Publica u oculta el artículo en la tienda sin borrar su registro de mayoreo.',
    destino: 'Catálogo público'
  },
  'pub-show-price': {
    titulo: 'Mostrar precio sin login',
    texto: 'Permite ver el precio público sin iniciar sesión. Si se desmarca, la ficha invita a contactar a Laurean.',
    ojo: 'Sin un precio público válido, el sistema también lo publica sin precio.',
    destino: 'Ficha pública del producto'
  },

  'cl-address': {
    titulo: 'Dirección del cliente',
    texto: 'Guarda una referencia de contacto en la ficha del cliente.',
    ojo: 'Editar esta ficha no cambia la dirección guardada en pedidos anteriores.',
    destino: 'Directorio de clientes'
  },
  'cl-notes': {
    titulo: 'Notas del cliente',
    texto: 'Guarda contexto útil para seguimiento; es información interna y no forma parte del checkout.',
    destino: 'Ficha interna del cliente'
  },

  'eq-weight': {
    titulo: 'Peso para cotizar',
    texto: 'Usa el peso total estimado del paquete; Forza lo toma para calcular la tarifa.',
    destino: 'Cotización de envío Forza'
  },
  'eq-type': {
    titulo: 'Tipo de servicio',
    texto: 'Estándar es un envío prepagado. COD es contra entrega: el repartidor cobra al destinatario cuando recibe.',
    destino: 'Tarifa cotizada por Forza'
  },

  'ec-type': {
    titulo: 'Servicio de la guía',
    texto: 'Elige estándar si el envío ya está pagado o COD si Forza debe cobrar al entregar.',
    destino: 'Guía Forza · liquidación COD'
  },
  'ec-content': {
    titulo: 'Contenido del paquete',
    texto: 'Describe brevemente qué transporta la guía, con cantidad si corresponde. El texto admite hasta 50 caracteres.',
    destino: 'Guía Forza'
  },
  'ec-address': {
    titulo: 'Dirección de entrega',
    texto: 'Escribe la dirección completa donde Forza debe entregar; departamento y municipio se seleccionan aparte.',
    destino: 'Guía y ruta de entrega Forza'
  },
  'ec-weight': {
    titulo: 'Peso del paquete',
    texto: 'Registra el peso total real o estimado en kilogramos para generar la guía.',
    destino: 'Tarifa y guía Forza'
  },
  'ec-value': {
    titulo: 'Valor declarado',
    texto: 'Es el valor de la mercadería que viaja en el paquete; no es el monto que el repartidor cobrará.',
    destino: 'Declaración de la guía Forza'
  },
  'ec-cod': {
    titulo: 'Monto COD',
    texto: 'Es la cantidad exacta que Forza cobrará al destinatario al entregar.',
    ojo: 'Úsalo solo con servicio COD y confirma que coincida con lo pendiente de cobro.',
    destino: 'Cobro contra entrega · liquidación de Forza'
  },

  'pay-enabled': {
    titulo: 'Mostrar pago manual',
    texto: 'Activa en el checkout las instrucciones de transferencia, QR o enlace configuradas aquí.',
    ojo: 'Si está desmarcado, estos datos quedan guardados pero el cliente no los ve.',
    destino: 'Checkout de la tienda'
  },
  'pay-bank': {
    titulo: 'Banco para transferencia',
    texto: 'Es el banco que se le muestra al cliente para realizar el pago manual.',
    destino: 'Checkout de la tienda'
  },
  'pay-link': {
    titulo: 'Enlace de pago',
    texto: 'Se muestra junto a las instrucciones de transferencia, como otra forma de pagar. Es opcional: si lo dejas vacío, solo se ven los datos bancarios.',
    destino: 'Checkout de la tienda'
  },
  'pay-qr-file': {
    titulo: 'QR de pago',
    texto: 'Sube la imagen del código que el cliente puede escanear para pagar.',
    destino: 'Checkout de la tienda'
  },
  'pay-instructions': {
    titulo: 'Instrucciones de pago',
    texto: 'Indica los pasos posteriores al pago, por ejemplo dónde enviar el comprobante y qué dato del pedido mencionar.',
    destino: 'Checkout de la tienda'
  },

  'cfg-seller-discount': {
    titulo: 'Descuento vendedor',
    texto: 'Se calcula sobre el precio público, así que si subes el precio de un producto, también sube lo que paga el vendedor.',
    destino: 'Precio que ve el vendedor en la tienda y en el POS'
  },
  'cfg-bodega-discount': {
    titulo: 'Descuento bodega',
    texto: 'Mismo cálculo que el de vendedor pero para el personal de bodega, y se aplica sobre el precio público vigente.',
    destino: 'Precio que ve el personal de bodega'
  },
  'cfg-referral-discount': {
    titulo: 'Descuento por referido',
    texto: 'Es lo que se le rebaja al cliente, no lo que gana el vendedor. La ganancia del vendedor se configura aparte, en la comisión.',
    destino: 'Checkout · total del pedido referido'
  },
  'cfg-commission-rate': {
    titulo: 'Comisión global',
    texto: 'Es la regla de última instancia. Manda primero la comisión individual del usuario, después los niveles de vendedor y al final este valor.',
    ojo: 'Cambiarlo no recalcula las comisiones ya generadas, solo aplica a las ventas siguientes.',
    destino: 'Cálculo de comisiones'
  },
  'cfg-discount-pin': {
    titulo: 'PIN de descuento especial',
    texto: 'Autoriza los descuentos manuales, tanto en el POS como en el checkout de la tienda.',
    ojo: 'Si lo dejas vacío, nadie puede aplicar descuentos manuales: quedan deshabilitados por completo.',
    destino: 'Descuentos manuales en POS y checkout'
  },
  'cfg-tiers-list': {
    titulo: 'Niveles de vendedor',
    texto: 'Cada nivel combina ventas referidas acumuladas y un porcentaje de comisión. Se usa si el vendedor no tiene comisión individual.',
    destino: 'Comisión y nivel de vendedores'
  },
  'cfg-ship-forza': {
    titulo: 'Envío Forza',
    texto: 'Define el precio fijo de Forza que se suma al pedido cuando el cliente elige ese transportista.',
    destino: 'Opciones de envío del checkout'
  },
  'cfg-ship-cargo': {
    titulo: 'Envío Cargo Expreso',
    texto: 'Define el precio fijo de Cargo Expreso que se suma al pedido cuando el cliente elige ese transportista.',
    destino: 'Opciones de envío del checkout'
  },
  'cfg-ship-sobrex': {
    titulo: 'Envío Sobrex',
    texto: 'Define el precio fijo de Sobrex que se suma al pedido cuando el cliente elige ese transportista.',
    destino: 'Opciones de envío del checkout'
  },
  'cfg-marquee-list': {
    titulo: 'Mensajes del marquee',
    texto: 'Son los anuncios que rotan en la banda superior de la portada. Mantén cada mensaje corto para que funcione en celular.',
    destino: 'Barra superior de la tienda'
  },
  'cfg-whatsapp': {
    titulo: 'WhatsApp del negocio',
    texto: 'Un solo número alimenta todos los botones de WhatsApp: footer, redes y el aviso de pago pendiente. Si está mal, fallan todos a la vez.',
    destino: 'Footer · redes · seguimiento de pagos pendientes'
  },
  'cfg-social-list': {
    titulo: 'Canales del footer',
    texto: 'Define icono, etiqueta y enlace de cada red o medio de contacto.',
    destino: 'Footer de todas las páginas'
  },
  'cfg-biz-plazo-cambios': {
    titulo: 'Plazo para cambios',
    texto: 'Es la cantidad de días que se comunica como límite para solicitar un cambio.',
    destino: 'Políticas y textos legales del sitio'
  },
  'cfg-biz-plazo-reembolso': {
    titulo: 'Método y plazo de reembolso',
    texto: 'Explica cómo se devuelve el dinero y cuánto puede tardar el proceso.',
    destino: 'Políticas y textos legales del sitio'
  },
  'cfg-biz-plazo-envio': {
    titulo: 'Plazos de envío',
    texto: 'Describe los tiempos de preparación y entrega que se comunican al cliente.',
    destino: 'Políticas y textos legales del sitio'
  },
  'cfg-biz-fecha-revision': {
    titulo: 'Fecha de revisión legal',
    texto: 'Registra cuándo se revisaron por última vez los datos y políticas legales publicados.',
    destino: 'Control de vigencia de la información legal'
  }
};

window.LAUREAN_HINTS = { secciones, campos };
