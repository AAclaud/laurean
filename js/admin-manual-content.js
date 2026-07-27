/**
 * admin-manual-content.js — Contenido de los manuales de uso del panel Laurean.
 * Data pura (documentación). El widget que lo muestra vive en js/admin-manual.js.
 *
 * Esquema por vista (clave = data-view del sidebar):
 *   { label, subtitle, blocks: [ ...bloques ] }
 * Tipos de bloque:
 *   { type:'p',     text }                  -> párrafo
 *   { type:'h',     text }                  -> subtítulo de sección
 *   { type:'list',  items:[...] }           -> lista con viñetas
 *   { type:'steps', items:[...] }           -> pasos numerados (el paso a paso)
 *   { type:'kv',    items:[[term,def],...] }-> término en negrita + explicación
 *   { type:'note',  text }                  -> caja de consejo resaltada
 *   { type:'roles', items:[...] }           -> "Quién lo usa" (chips de rol)
 *
 * Los pasos usan los NOMBRES REALES de los botones del panel (entre comillas).
 */
window.LAUREAN_MANUAL_VIEWS = {

  dashboard: {
    label: 'Dashboard',
    subtitle: 'El resumen del negocio de un vistazo',
    blocks: [
      { type: 'p', text: 'Es la pantalla de inicio. Reúne los números clave y sirve de punto de partida para entrar a cada sección. No se edita nada aquí.' },
      { type: 'h', text: 'Cómo usarlo' },
      { type: 'steps', items: [
        'Al entrar al panel, esta es la primera pantalla que ves.',
        'Lee las tarjetas de arriba: ventas, pedidos y alertas de stock bajo.',
        'Toca cualquier tarjeta o número para ir directo al módulo que lo controla (por ejemplo, la tarjeta de pedidos te lleva a "Pedidos").',
        'Revisa el punto rojo del menú: indica que hay algo pendiente por atender.',
      ] },
      { type: 'note', text: 'Si un número se ve raro, no lo corrijas aquí: entra al módulo correspondiente (Pedidos, Inventario, etc.) y ajústalo desde ahí. El Dashboard solo refleja lo que hay en cada sección.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  pedidos: {
    label: 'Pedidos',
    subtitle: 'Atender los pedidos de la tienda y del punto de venta',
    blocks: [
      { type: 'p', text: 'Aquí llegan todos los pedidos: los de la tienda en línea y los del punto de venta. Desde la lista los filtras y los exportas; al abrir uno gestionas su estado, el pago, el envío y el contacto con el cliente.' },

      { type: 'h', text: 'La lista — qué significa cada columna' },
      { type: 'kv', items: [
        ['ID', 'el número del pedido. Es con el que lo identificas ante el cliente.'],
        ['Fecha', 'cuándo se hizo.'],
        ['Cliente', 'quién compró.'],
        ['Origen', 'de dónde vino: de la tienda en línea o del punto de venta.'],
        ['Ítems', 'cuántas piezas lleva.'],
        ['Subtotal / Descuento / Total', 'el precio antes del descuento, la rebaja aplicada y lo que finalmente paga.'],
        ['Pago', 'si ya pagó y por qué medio.'],
        ['Referido', 'el código de la vendedora que trajo la venta. Si tiene código, se le genera comisión.'],
        ['Estado', 'en qué punto va el pedido.'],
      ] },

      { type: 'h', text: 'Paso a paso — procesar un pedido' },
      { type: 'steps', items: [
        'En la lista, haz clic en la fila del pedido para abrirlo.',
        'Revisa los productos, el total y los datos del cliente (nombre, teléfono, dirección).',
        'En "Estado", elige cómo va: Pendiente → Procesando → Enviado → Completado.',
        'Marca si el pago ya fue recibido.',
        'Presiona "Guardar estado" para dejar registrado el cambio.',
      ] },

      { type: 'h', text: 'Estados del pedido' },
      { type: 'kv', items: [
        ['Pendiente', 'recién ingresado, aún no se procesa.'],
        ['Procesando', 'se está preparando.'],
        ['Enviado', 'ya salió con el courier.'],
        ['Completado', 'entregado y cerrado. Solo estos cuentan como venta en las estadísticas.'],
        ['Cancelado', 'anulado. No cuenta como venta.'],
      ] },

      { type: 'h', text: 'Paso a paso — avisar al cliente por WhatsApp' },
      { type: 'steps', items: [
        'Abre el pedido.',
        'Presiona "Seguimiento WhatsApp".',
        'Se abre WhatsApp con el mensaje ya armado: saludo, número de pedido, productos y total.',
        'Revisa el texto, ajústalo si quieres y envíalo.',
      ] },

      { type: 'h', text: 'Paso a paso — generar la guía de un envío' },
      { type: 'steps', items: [
        'Confirma que el pedido tenga departamento y municipio. Si falta, complétalo en el pedido.',
        'Presiona el botón de guía Forza dentro del pedido.',
        'Revisa los datos y confirma.',
        'Imprime la guía y pégala al paquete.',
      ] },

      { type: 'h', text: 'Paso a paso — generar muchas guías de una vez' },
      { type: 'steps', items: [
        'Sirve cuando tienes varios pedidos listos para despachar el mismo día.',
        'Usa los filtros de arriba para dejar en pantalla los pedidos que vas a enviar.',
        'Presiona "Generar guías pendientes".',
        'El sistema te dice cuántas guías va a crear y te pide confirmar.',
        'Al terminar te muestra cuáles salieron bien y cuáles fallaron, para que corrijas solo esas.',
      ] },
      { type: 'note', text: 'Solo toma los pedidos que no son del punto de venta y que todavía no tienen guía, así que no genera duplicados. Los que fallan casi siempre es porque les falta el departamento o el municipio.' },

      { type: 'h', text: 'Paso a paso — exportar los pedidos' },
      { type: 'steps', items: [
        'Filtra lo que necesitas (por origen o por estado).',
        'Presiona "Exportar CSV".',
        'Se descarga un archivo que puedes abrir en Excel para contabilidad o reportes.',
      ] },

      { type: 'note', text: 'Los pedidos NO se borran. Si te equivocaste, cambia el estado; para anular uno, ponlo en "Cancelado". El punto rojo del menú se apaga solo cuando ya no quedan pedidos pendientes.' },
      { type: 'roles', items: ['admin', 'superusuario', 'agente de pedidos'] },
    ],
  },

  comisiones: {
    label: 'Comisiones',
    subtitle: 'Pagar a las vendedoras lo que ganaron',
    blocks: [
      { type: 'p', text: 'Calcula cuánto le corresponde a cada vendedora por los pedidos que trajo con su código de referido. Se generan solas: no se crean a mano.' },
      { type: 'h', text: 'Cómo se generan (automático)' },
      { type: 'steps', items: [
        'Un cliente compra usando el código de una vendedora.',
        'El pedido queda marcado con ese código.',
        'El sistema crea la comisión con el porcentaje configurado para esa vendedora.',
      ] },
      { type: 'h', text: 'Paso a paso — marcar una comisión como pagada' },
      { type: 'steps', items: [
        'Ubica la comisión de la vendedora en la lista.',
        'Verifica el pedido y el monto.',
        'Cuando ya le pagaste, cámbiala a "Pagada".',
      ] },
      { type: 'kv', items: [
        ['Pendiente', 'aún no se le ha pagado a la vendedora.'],
        ['Pagada', 'ya se liquidó.'],
      ] },
      { type: 'note', text: 'Si una comisión no aparece, revisa que el pedido tenga el código de referido y que la vendedora esté activa con su porcentaje configurado en "Usuarios".' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  pagos: {
    label: 'Pagos',
    subtitle: 'Consultar los pagos con tarjeta en línea',
    blocks: [
      { type: 'p', text: 'Muestra los pagos con tarjeta hechos en la tienda a través de la pasarela. Es un registro de solo lectura: cada transacción la crea la pasarela cuando el cliente paga.' },
      { type: 'h', text: 'Cómo consultarlo' },
      { type: 'steps', items: [
        'Entra a "Pagos" desde el menú.',
        'Revisa cada transacción: pedido asociado, cliente, monto, estado y fecha.',
        'Cruza el pago con su pedido en "Pedidos" si necesitas confirmar una venta.',
      ] },
      { type: 'note', text: 'Los pagos por transferencia o contra entrega NO aparecen aquí: esos se marcan como recibidos dentro del pedido, en "Pedidos". Esta sección es solo para tarjeta en línea.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  estadisticas: {
    label: 'Estadísticas',
    subtitle: 'Sacar reportes de ventas por fechas',
    blocks: [
      { type: 'p', text: 'Genera reportes del período que elijas: ventas, ticket promedio, web vs. punto de venta, cobros pendientes y los productos y vendedoras que más venden.' },
      { type: 'h', text: 'Paso a paso — generar un reporte' },
      { type: 'steps', items: [
        'Elige la fecha en "Desde" y en "Hasta".',
        'Presiona "Aplicar" para actualizar los números al período elegido.',
        'Lee los indicadores (ventas totales, ticket promedio, por cobrar) y las tablas de top productos/vendedoras.',
        'Para guardar o compartir, usa "Imprimir reporte" o "Exportar CSV".',
      ] },
      { type: 'kv', items: [
        ['Ventas totales', 'suma de pedidos completados en el período.'],
        ['Ticket promedio', 'venta promedio por pedido.'],
        ['Por cobrar', 'pedidos con pago aún pendiente.'],
      ] },
      { type: 'note', text: 'Todo respeta el rango de fechas. Si algo sale en cero, amplía el rango para incluir los días con actividad y vuelve a presionar "Aplicar".' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  analytics: {
    label: 'Analítica',
    subtitle: 'Ver cuánta gente visita la tienda',
    blocks: [
      { type: 'p', text: 'Muestra el tráfico del sitio: cuántas personas entran y qué páginas ven. Es sobre visitas, no ventas (para ventas usa "Estadísticas").' },
      { type: 'h', text: 'Cómo leerlo' },
      { type: 'steps', items: [
        'Entra a "Analítica".',
        'Mira el total de visitas y su tendencia de los últimos 7 y 30 días.',
        'Revisa la lista de páginas más visitadas para saber qué le interesa a la gente.',
      ] },
      { type: 'note', text: 'Los datos llegan en vivo desde el sitio. Si aún no hay tráfico, la sección se ve vacía hasta que empiecen a entrar visitas.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  productos: {
    label: 'Catálogo y Precios',
    subtitle: 'Crear productos, fijar precios por tipo de cliente y publicar en la tienda',
    blocks: [
      { type: 'p', text: 'Es el corazón de la tienda. Esta pantalla tiene dos partes: arriba las "Categorías" y abajo la tabla de "Productos", donde cada fila es un producto y cada columna un precio distinto según quién compra. Desde aquí creas productos, ajustas precios y decides qué se publica.' },

      { type: 'h', text: 'Paso a paso — agregar un producto' },
      { type: 'steps', items: [
        'Presiona "Agregar producto". Se abre la ventana "Nuevo producto".',
        'Llena "Nombre del producto" y elige "Categoría" y "Subcategoría".',
        'Escribe "Stock (unidades)": cuántas piezas tienes disponibles.',
        'Pon "Precio público (Q)" y, si vendes en dólares, "Precio público (USD)".',
        'Llena "Precio costo (interno, Q)": lo que a Laurean le cuesta. Es interno, el cliente nunca lo ve, y sirve para calcular la ganancia.',
        'Presiona "Subir imágenes" para cargar las fotos, o pega una dirección en "Imagen del producto".',
        'Opcional: escribe la "Descripción" y agrega más fotos en "Galería".',
        'Para los colores o diseños, presiona "+ Agregar variante"; dentro de cada variante usa "+ Agregar talla" para las tallas disponibles.',
        'Presiona "Guardar producto".',
        'De vuelta en la tabla, marca la casilla "Publicado" de ese producto para que aparezca en la tienda.',
      ] },

      { type: 'h', text: 'La tabla de precios — qué significa cada columna' },
      { type: 'kv', items: [
        ['Producto', 'el nombre. Haz clic en él para abrir y editar toda su ficha.'],
        ['Categoría', 'dónde se muestra dentro de la tienda.'],
        ['Publicado', 'la casilla que decide si el cliente lo ve o no. Sin marcar, el producto queda guardado pero oculto.'],
        ['Público Q / USD', 'el precio que ve cualquier persona que entra a la tienda.'],
        ['Vendedor Q / USD', 'el precio con descuento para las vendedoras de Laurean. Solo lo ven ellas al iniciar sesión.'],
        ['Bodega Q / USD', 'el precio interno de bodega, el más bajo. Es el que cobra el punto de venta.'],
      ] },
      { type: 'note', text: 'Cada persona ve únicamente el precio que le toca según su usuario. Un cliente jamás ve el precio de vendedora ni el de bodega.' },

      { type: 'h', text: 'Paso a paso — cambiar precios' },
      { type: 'steps', items: [
        'Ubica el producto en la tabla (baja o usa el buscador del navegador con Ctrl+F o Cmd+F).',
        'Haz clic sobre la celda del precio que quieres cambiar y escribe el nuevo valor.',
        'Puedes cambiar varios productos y varias columnas de una sola vez.',
        'Cuando termines, presiona "Guardar precios". Ese botón guarda TODOS los cambios de la tabla a la vez.',
        'Si sales sin guardar, los cambios se pierden.',
      ] },
      { type: 'note', text: 'Todo cambio de precio queda registrado con la fecha y quién lo hizo, para poder consultarlo después.' },

      { type: 'h', text: 'Paso a paso — precio distinto para una bodega' },
      { type: 'steps', items: [
        'Sirve cuando una sucursal debe vender un producto a un precio diferente al general.',
        'En la fila del producto, abre "Precios por Bodega". Se despliega un panel justo debajo.',
        'Escribe el precio que tendrá ese producto en cada bodega.',
        'Presiona "Guardar precios por bodega" y luego "Cerrar".',
      ] },
      { type: 'note', text: 'El precio de bodega manda sobre el general: si una bodega tiene su propio precio, el punto de venta de esa bodega cobra ese, no el de la tabla principal.' },

      { type: 'h', text: 'Paso a paso — crear una categoría' },
      { type: 'steps', items: [
        'En la sección "Categorías" de arriba, presiona "Agregar categoría".',
        'Escribe el "Nombre de la categoría" (así aparecerá en el menú de la tienda).',
        'Opcional: pon un "Precio inicial (Q)" y "(USD)". Es el precio que traerán por defecto los productos nuevos de esa categoría, para no escribirlo cada vez.',
        'Sube la "Imagen de la categoría": es la foto que representa la categoría en la tienda.',
        'Presiona "Guardar categoría".',
        'Para una subcategoría, elige la "Categoría padre", ponle "Nombre" y presiona "Guardar subcategoría".',
      ] },

      { type: 'h', text: 'Paso a paso — cargar muchos productos de una vez' },
      { type: 'steps', items: [
        'Presiona "Importar CSV".',
        'Sube el archivo con la lista de productos.',
        'El sistema revisa fila por fila y te muestra cuáles están bien y cuáles tienen error.',
        'Presiona "Importar válidos" para dar de alta solo los correctos.',
        'Corrige en el archivo los que salieron con error y vuelve a importarlos.',
      ] },

      { type: 'note', text: 'Para que un producto se vea en la tienda necesita tres cosas: al menos una foto, un precio público y la casilla "Publicado" marcada. Si falta una, no aparece.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  lookbook: {
    label: 'Lookbook',
    subtitle: 'Las fotos grandes de la portada de la tienda',
    blocks: [
      { type: 'p', text: 'El lookbook es el carrusel de fotos editoriales que aparece en la página de inicio. Es imagen de marca: sirve para mostrar el estilo de Laurean, no para vender un producto con precio.' },
      { type: 'h', text: 'Paso a paso — cambiar el lookbook' },
      { type: 'steps', items: [
        'Presiona "+ Agregar slide" por cada foto que quieras mostrar.',
        'Sube la imagen. Usa fotos horizontales y de buena calidad: se ven a pantalla completa.',
        'Escribe el texto que va encima (título y frase corta). Mientras menos texto, mejor se ve.',
        'Ordena los slides: el primero es el que ve el cliente al entrar.',
        'Presiona "Vista previa" para revisar cómo queda antes de publicarlo.',
        'Cuando estés conforme, presiona "Guardar".',
      ] },
      { type: 'note', text: 'Con tres a cinco fotos basta. Demasiadas hacen que la página cargue lento y el cliente no las ve todas.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

  categorias: {
    label: 'Categorías',
    subtitle: 'Organizar el catálogo en categorías y subcategorías',
    blocks: [
      { type: 'p', text: 'Define las categorías (Mujer, Hombre, Laurean Kids, Ofertas…) y sus subcategorías, con las que se agrupan los productos en la tienda.' },
      { type: 'h', text: 'Paso a paso — cambiar el "Precio desde Q"' },
      { type: 'steps', items: [
        'En la fila de la categoría, escribe el nuevo valor en la columna "Precio desde Q".',
        'Presiona "Guardar precios".',
      ] },
      { type: 'h', text: 'Paso a paso — crear una subcategoría' },
      { type: 'steps', items: [
        'Presiona "+ Nueva subcategoría".',
        'Escribe el nombre (por ejemplo, Blusas) y elige a qué categoría pertenece.',
        'Presiona "Guardar subcategoría".',
      ] },
      { type: 'h', text: 'Paso a paso — crear una categoría nueva' },
      { type: 'steps', items: [
        'Presiona "+ Nueva categoría".',
        'Escribe el nombre, sube su imagen y define el "Precio desde".',
        'Presiona "Guardar categoría".',
      ] },
      { type: 'note', text: 'El "Precio desde" es solo una referencia que ve el cliente en la portada de la categoría; el precio real de venta se pone en cada producto, en "Productos".' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  combos: {
    label: 'Combos',
    subtitle: 'Armar paquetes de productos a precio especial',
    blocks: [
      { type: 'p', text: 'Arma paquetes de varios productos con un precio especial (por ejemplo, un look completo). Aparecen en la pestaña "Combos" de la tienda.' },
      { type: 'h', text: 'Paso a paso — armar un combo' },
      { type: 'steps', items: [
        'Presiona "+ Armar combo".',
        'Escribe el nombre (por ejemplo, "Conjunto Verano") y una descripción breve.',
        'Presiona "+ Agregar producto" y elige cada producto con su cantidad; repite para sumar más.',
        'Sube la imagen con "Subir portada" (si no subes una, se usa un collage por defecto).',
        'Marca dónde se muestra (Tienda, Todas o una bodega).',
        'Presiona "Guardar" para publicarlo activo, o "Guardar borrador" para dejarlo sin publicar.',
      ] },
      { type: 'note', text: 'Solo los combos ACTIVOS asignados a "Tienda" o "Todas" aparecen al cliente. Un borrador queda guardado pero no se muestra hasta que lo actives.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  inventario: {
    label: 'Inventario',
    subtitle: 'Cuánto producto hay, dónde está y todo lo que entra y sale',
    blocks: [
      { type: 'p', text: 'Controla las existencias de cada bodega. Está dividido en cuatro pestañas, cada una con su propósito.' },

      { type: 'h', text: 'Las cuatro pestañas' },
      { type: 'kv', items: [
        ['Stock Actual', 'cuánto hay hoy de cada producto. Desde aquí se registra todo lo que entra y sale.'],
        ['Movimientos', 'el historial: todo lo que se registró, quién lo hizo y cuándo. Solo se consulta.'],
        ['Calendario', 'en qué días entró mercadería durante el mes.'],
        ['Mayoreo', 'el listado maestro de artículos de mayoreo, del que se publican productos a la tienda.'],
      ] },
      { type: 'note', text: 'Lo más común es confundirlas: los movimientos se REGISTRAN desde "Stock Actual"; la pestaña "Movimientos" solo sirve para consultar lo ya registrado.' },

      { type: 'h', text: 'Paso a paso — registrar mercadería que llega' },
      { type: 'steps', items: [
        'Entra a la pestaña "Stock Actual".',
        'Presiona "+ Ingreso".',
        'Elige la "Bodega" donde entra el producto y el "Producto".',
        'Escribe la cantidad que llegó.',
        'Opcional: elige el "Proveedor" y marca "Pagado al proveedor" si ya se le pagó.',
        'Si el producto maneja tallas, usa "Detalle por talla" para indicar cuántas de cada una.',
        'Presiona "Registrar". El stock sube y queda el registro.',
      ] },

      { type: 'h', text: 'Paso a paso — dar salida a un producto' },
      { type: 'steps', items: [
        'En "Stock Actual", presiona "- Salida".',
        'Elige la bodega y el producto.',
        'Escribe la "Cantidad a retirar".',
        'Escribe el "Motivo": daño, pérdida, muestra, regalo. Es lo que después explica el faltante.',
        'Presiona "Registrar".',
      ] },
      { type: 'note', text: 'Las ventas NO se registran como salida: el punto de venta y la tienda descuentan el stock solos. Usa "Salida" únicamente para lo que se pierde o se saca sin vender.' },

      { type: 'h', text: 'Paso a paso — corregir el stock tras un conteo físico' },
      { type: 'steps', items: [
        'Cuenta físicamente lo que hay en la bodega.',
        'En "Stock Actual", presiona "Ajuste".',
        'Elige la bodega y el producto.',
        'En "Nuevo stock", escribe la cantidad REAL que contaste. No la diferencia: el número final.',
        'Anota en el motivo que fue un conteo físico.',
        'Presiona "Registrar". El sistema calcula solo la diferencia.',
      ] },

      { type: 'h', text: 'Paso a paso — mover producto entre bodegas' },
      { type: 'steps', items: [
        'En "Stock Actual", presiona "⇄ Trasladar entre bodegas".',
        'Elige "Bodega origen" (de dónde sale) y "Bodega destino" (a dónde va).',
        'Indica el producto y la cantidad.',
        'Agrega "Notas" si hace falta (quién lo lleva, cuándo).',
        'Confirma: el stock baja en una bodega y sube en la otra, en un solo paso.',
      ] },

      { type: 'h', text: 'Tipos de movimiento' },
      { type: 'kv', items: [
        ['Ingreso', 'aumenta el stock: llegó mercadería o hubo una devolución.'],
        ['Salida', 'disminuye el stock: daño, pérdida, muestra o regalo.'],
        ['Ajuste', 'deja el stock en la cantidad real contada. Corrige diferencias.'],
        ['Traslado', 'mueve producto de una bodega a otra sin cambiar el total.'],
      ] },

      { type: 'h', text: 'Consultar el historial y sacar reportes' },
      { type: 'steps', items: [
        'La pestaña "Movimientos" lista todo lo registrado, con fecha, tipo, cantidad, el stock antes y después, proveedor y notas.',
        'Puedes filtrar por bodega y por tipo de movimiento.',
        'Desde "Stock Actual", "Imprimir reporte" genera el documento con la imagen de Laurean para imprimir o guardar en PDF.',
        '"Exportar CSV" descarga los datos para abrirlos en Excel.',
        'Para ver toda la vida de un solo producto, abre su "Kardex": ahí está su historial completo.',
      ] },

      { type: 'h', text: 'La pestaña Calendario' },
      { type: 'steps', items: [
        'Muestra el mes con los días en que entró mercadería.',
        'Cada día marcado indica cuántos ingresos hubo y cuántas unidades.',
        'Haz clic en un día para ver el detalle de ese día.',
        'Usa las flechas ‹ y › para moverte entre meses.',
      ] },
      { type: 'note', text: 'Sirve para ver de un vistazo cada cuánto llega mercadería y detectar si un mes se quedó sin abastecer.' },

      { type: 'h', text: 'La pestaña Mayoreo' },
      { type: 'p', text: 'Es el listado maestro de artículos de mayoreo. Cada fila trae su código (COD), descripción, proveedor, marca, conteo, costo y precio de venta, organizados por período.' },
      { type: 'steps', items: [
        'Presiona "Importar CSV" para cargar el listado desde un archivo.',
        'Usa el buscador para encontrar por código, descripción o marca.',
        'Alterna entre "Mes" y "Semana" según cómo quieras agrupar los artículos.',
        'En la leyenda puedes nombrar cada período y darle un color, para distinguirlos de un vistazo.',
        'Cuando un artículo esté listo para venderse en la tienda, presiona "Publicar".',
        'Al publicar, indica el "Precio a mostrar sin login de vendedor (Q)", la "Categoría", la "Subcategoría" y, si tienes, la "Galería" de fotos.',
      ] },
      { type: 'note', text: 'El "Precio a mostrar sin login de vendedor (Q)" es el que ve cualquier visitante de la tienda. Si lo dejas vacío, el producto se publica sin precio y aparece la opción de contactar a Laurean.' },

      { type: 'note', text: 'Ningún movimiento se puede borrar: así el inventario siempre cuadra y se puede auditar. Si te equivocaste, registra el movimiento contrario para corregir. El punto rojo del menú avisa cuando hay stock bajo.' },
      { type: 'roles', items: ['admin', 'superusuario', 'bodega'] },
    ],
  },

  proveedores: {
    label: 'Proveedores',
    subtitle: 'A quién le compras la mercadería y qué le has pedido',
    blocks: [
      { type: 'p', text: 'El directorio de los proveedores de Laurean. Desde aquí también se generan las órdenes de compra, que son el documento formal con el que se le pide mercadería a un proveedor.' },
      { type: 'h', text: 'Paso a paso — agregar un proveedor' },
      { type: 'steps', items: [
        'Presiona "+ Agregar proveedor".',
        'Llena sus datos: nombre, teléfono, correo y de dónde es.',
        'Presiona "Guardar".',
      ] },
      { type: 'h', text: 'Paso a paso — hacer una orden de compra' },
      { type: 'steps', items: [
        'Ubica al proveedor en la lista y ábrelo.',
        'Presiona "Orden de compra".',
        'Agrega los productos que le vas a pedir, con su cantidad.',
        'Se genera el documento con la imagen de Laurean, listo para imprimir o guardar en PDF.',
        'Envíaselo al proveedor.',
      ] },
      { type: 'h', text: 'Historial' },
      { type: 'steps', items: [
        'Al abrir un proveedor puedes ver lo que le has comprado antes.',
        'Sirve para comparar precios y saber cada cuánto le compras.',
      ] },
      { type: 'note', text: 'Los proveedores no se ven en la tienda: es información interna de Laurean.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  bodegas: {
    label: 'Bodegas',
    subtitle: 'Los lugares donde se guarda y se vende la mercadería',
    blocks: [
      { type: 'p', text: 'Una bodega es cada lugar físico donde Laurean tiene producto: la bodega central, una tienda, un punto de venta. Cada una lleva su propio inventario, y así sabes qué hay y dónde.' },
      { type: 'h', text: 'Paso a paso — crear una bodega' },
      { type: 'steps', items: [
        'Presiona "+ Agregar bodega".',
        'Ponle un nombre claro que cualquiera reconozca (por ejemplo: "Tienda Zona 10").',
        'Llena su ubicación y datos de contacto.',
        'Presiona "Guardar".',
      ] },
      { type: 'h', text: 'Bodegas base' },
      { type: 'kv', items: [
        ['Central', 'la bodega principal de Laurean.'],
        ['Website', 'de donde salen los pedidos de la tienda en línea.'],
      ] },
      { type: 'note', text: 'Central y Website no se pueden borrar: el sistema las necesita para funcionar. Las demás sí, pero antes de eliminar una, mueve su mercadería a otra desde "Inventario"; si la borras con producto adentro, ese inventario se pierde.' },
      { type: 'note', text: 'Al dar acceso al punto de venta a una persona, en "Usuarios" se le indica qué bodega le corresponde. Así cobra el precio de su bodega y descuenta de su propio inventario.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  cotizaciones: {
    label: 'Cotizaciones',
    subtitle: 'Armar una propuesta de precios para un cliente',
    blocks: [
      { type: 'p', text: 'Sirve para pasarle a un cliente una lista formal de productos con sus precios, con la imagen de Laurean. Útil para ventas por mayor, empresas o pedidos grandes.' },
      { type: 'h', text: 'Paso a paso — hacer una cotización' },
      { type: 'steps', items: [
        'Presiona "+ Nueva cotización".',
        'Escribe el nombre del cliente a quien va dirigida.',
        'Presiona "+ Agregar producto" por cada artículo, e indica la cantidad.',
        'Revisa los precios; puedes ajustarlos si acordaste algo distinto.',
        'Si vas a dar rebaja, escribe el porcentaje de descuento: el total se recalcula solo.',
        'Agrega notas si hay condiciones (tiempo de entrega, forma de pago).',
        'Presiona "Guardar" para conservarla.',
      ] },
      { type: 'h', text: 'Paso a paso — enviarla al cliente' },
      { type: 'steps', items: [
        'Abre la cotización y presiona "Imprimir".',
        'Se abre el documento con el logotipo y los colores de Laurean.',
        'Ahí mismo puedes imprimirla o guardarla como PDF para mandarla por WhatsApp o correo.',
      ] },
      { type: 'note', text: 'Una cotización no descuenta inventario ni genera un pedido: es solo una propuesta. Cuando el cliente acepte, el pedido se registra aparte.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  envios: {
    label: 'Envíos · Forza Delivery',
    subtitle: 'Cotizar, generar y rastrear los envíos de los pedidos',
    blocks: [
      { type: 'p', text: 'Aquí se maneja todo lo del courier Forza: consultar cuánto cuesta un envío, generar la guía, imprimirla, rastrear el paquete y pedir que lo recojan. Está dividido en pestañas.' },

      { type: 'h', text: 'Las pestañas' },
      { type: 'kv', items: [
        ['Cotizar tarifa', 'saber cuánto costará un envío antes de mandarlo.'],
        ['Crear guía', 'generar la guía de un envío.'],
        ['Rastreo', 'ver dónde va un paquete ya enviado.'],
        ['Mis guías', 'la lista de todas las guías generadas.'],
        ['Express Centers', 'los puntos de Forza donde se puede dejar el paquete.'],
        ['Recolección', 'pedir que Forza pase recogiendo a la bodega.'],
        ['Configuración', 'los datos de Laurean como remitente.'],
      ] },

      { type: 'h', text: 'Paso a paso — cotizar cuánto cuesta un envío' },
      { type: 'steps', items: [
        'Entra a la pestaña "Cotizar tarifa".',
        'Elige "Dept. origen" y "Municipio origen" (de dónde sale).',
        'Elige "Dept. destino" y "Municipio destino" (a dónde va).',
        'Escribe el "Peso (kg)" del paquete.',
        'Elige el "Tipo de servicio".',
        'Presiona "Cotizar" y te muestra el costo. Usa "Limpiar" para empezar otra consulta.',
      ] },

      { type: 'h', text: 'Paso a paso — generar la guía de un envío' },
      { type: 'steps', items: [
        'Entra a la pestaña "Crear guía".',
        'Llena los datos de quien recibe: "Nombre", "Teléfono", "Dirección", "Departamento" y "Municipio".',
        'Escribe la "Descripción del contenido" (por ejemplo: Sweater Mujer x1).',
        'Pon el "Peso (kg)" y el "Valor declarado (Q)": cuánto vale la mercadería, por si se pierde.',
        'Si el cliente paga al recibir, escribe el "Monto COD (Q)": ese es el dinero que Forza le cobra y luego le entrega a Laurean.',
        'Presiona "Generar guía".',
        'Imprime la guía y pégala al paquete.',
      ] },
      { type: 'note', text: 'Casi siempre es más rápido generar la guía desde el propio pedido, en "Pedidos": ahí los datos del cliente ya vienen llenos y no hay que escribirlos de nuevo.' },

      { type: 'h', text: 'Paso a paso — rastrear un paquete' },
      { type: 'steps', items: [
        'Entra a la pestaña "Rastreo".',
        'Escribe la "Serie" y el "Número de guía" que aparecen en la guía impresa.',
        'Presiona "Buscar" y verás en qué punto del trayecto va.',
      ] },

      { type: 'h', text: 'Paso a paso — pedir una recolección' },
      { type: 'steps', items: [
        'Entra a la pestaña "Recolección".',
        'Confirma la "Dirección" donde Forza debe pasar.',
        'Elige la "Fecha deseada" y escribe la "Cantidad de paquetes".',
        'Agrega "Notas" si hay alguna indicación (horario, punto de referencia).',
        'Envía la solicitud.',
      ] },

      { type: 'h', text: 'Configuración del remitente' },
      { type: 'steps', items: [
        'Entra a la pestaña "Configuración".',
        'Llena los datos con los que Forza identifica a Laurean: nombre o empresa, teléfono, email, departamento, municipio y dirección.',
        'La "Referencia" ayuda al mensajero a ubicar el lugar (por ejemplo: Edificio Atlantis, segundo nivel).',
        'Guarda. Estos datos se usan en todas las guías, así que solo se llenan una vez.',
      ] },

      { type: 'note', text: 'Si una guía sale con error, casi siempre es porque al pedido le falta el departamento o el municipio. Complétalos en el pedido y vuelve a generarla.' },
      { type: 'roles', items: ['admin', 'superusuario', 'agente de pedidos'] },
    ],
  },

  vendedores: {
    label: 'Usuarios',
    subtitle: 'Crear las personas que usan el sistema y sus permisos',
    blocks: [
      { type: 'p', text: 'Crea y administra a quienes usan el panel, su rol (lo que pueden hacer) y, en el caso de las vendedoras, su código de referido y porcentaje de comisión.' },
      { type: 'h', text: 'Paso a paso — crear un usuario' },
      { type: 'steps', items: [
        'Presiona "+ Nuevo usuario".',
        'Escribe el nombre y el correo (con ese correo iniciará sesión).',
        'Elige el rol (superusuario, admin, vendedor, bodega o agente de pedidos).',
        'Si es vendedor, define su porcentaje de comisión; su código de referido se genera solo.',
        'Guarda. El usuario ya puede iniciar sesión con su correo y contraseña.',
      ] },
      { type: 'h', text: 'Roles' },
      { type: 'kv', items: [
        ['Superusuario', 'control total, incluida la configuración.'],
        ['Admin', 'opera la tienda día a día.'],
        ['Vendedor', 'trae pedidos con su código y gana comisión.'],
        ['Bodega', 'maneja inventario y stock.'],
        ['Agente de pedidos', 'atiende y despacha pedidos.'],
      ] },
      { type: 'note', text: 'Da siempre el permiso mínimo necesario: no todos necesitan ser admin. El rol define lo que cada quien puede ver y hacer.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

  clientes: {
    label: 'Clientes',
    subtitle: 'El directorio de quienes ya compraron',
    blocks: [
      { type: 'p', text: 'Reúne a las personas que han comprado en la tienda o en el punto de venta. La lista se arma sola con cada pedido: no hay que estar registrando gente a mano.' },
      { type: 'h', text: 'Qué información guarda de cada cliente' },
      { type: 'kv', items: [
        ['Nombre y teléfono', 'con lo que se le identifica y contacta.'],
        ['Dirección', 'la que dejó en su último pedido.'],
        ['Pedidos', 'cuántas veces ha comprado.'],
        ['Total gastado', 'cuánto ha comprado en total, para reconocer a los mejores clientes.'],
      ] },
      { type: 'h', text: 'Paso a paso — consultar un cliente' },
      { type: 'steps', items: [
        'Entra a "Clientes" desde el menú.',
        'Ubica a la persona en la lista.',
        'Ábrela para ver sus datos y su historial de compras.',
      ] },
      { type: 'h', text: 'Paso a paso — agregar un cliente a mano' },
      { type: 'steps', items: [
        'Sirve cuando alguien te compra por WhatsApp y quieres tenerlo registrado.',
        'Presiona "Nuevo cliente".',
        'Llena nombre, teléfono y dirección.',
        'Guarda.',
      ] },
      { type: 'note', text: 'Si un cliente aparece dos veces, casi siempre es porque dio el teléfono escrito distinto en cada compra. El teléfono es lo que el sistema usa para reconocerlo.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  descuentos: {
    label: 'Descuentos',
    subtitle: 'Crear códigos de descuento para la tienda',
    blocks: [
      { type: 'p', text: 'Crea códigos que el cliente escribe en el checkout para obtener un descuento. Tú controlas cuánto descuentan, hasta cuándo valen y cuántas veces se usan.' },
      { type: 'h', text: 'Paso a paso — crear un código' },
      { type: 'steps', items: [
        'Presiona "+ Nuevo Código".',
        'Escribe el código (por ejemplo, BIENVENIDA10).',
        'Elige el tipo: "Porcentaje (%)" (un % del total) o "Monto fijo (Q)" (una cantidad en quetzales).',
        'Escribe el valor (por ejemplo, 10 para 10%, o 50 para Q50).',
        'Define la vigencia (desde/hasta) y, si quieres, un límite de usos.',
        'Actívalo y guarda.',
      ] },
      { type: 'kv', items: [
        ['Porcentaje (%)', 'descuenta un % del total (ej. 10%).'],
        ['Monto fijo (Q)', 'descuenta una cantidad en quetzales (ej. Q50).'],
      ] },
      { type: 'note', text: 'Un código inactivo o vencido deja de aplicar solo. El sistema valida cada código al momento de usarlo, así que no se puede abusar de uno caducado.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  solicitudes: {
    label: 'Solicitudes de Vendedoras',
    subtitle: 'Aprobar a quienes quieren vender Laurean',
    blocks: [
      { type: 'p', text: 'Cuando alguien llena el formulario de la tienda para ser vendedora de Laurean, su solicitud llega aquí. Son personas ajenas al negocio que quieren revender, no empleadas.' },
      { type: 'h', text: 'Paso a paso — revisar y aprobar' },
      { type: 'steps', items: [
        'Entra a "Solicitudes" desde el menú. El punto rojo indica que hay solicitudes sin atender.',
        'Abre la solicitud y revisa los datos: nombre, teléfono, correo y lo que escribió.',
        'Si la aceptas, apruébala. El sistema le crea su usuario y su código de referido.',
        'Comparte con ella su correo y contraseña temporal para que entre y la cambie.',
        'Si no la aceptas, recházala.',
      ] },
      { type: 'h', text: 'Qué pasa al aprobarla' },
      { type: 'list', items: [
        'Se le crea su usuario para entrar a su panel de vendedora.',
        'Recibe un código de referido propio.',
        'Cuando un cliente compra con ese código, se le genera su comisión automáticamente.',
        'A partir de ahí aparece en "Usuarios" y sus comisiones en "Comisiones".',
      ] },
      { type: 'note', text: 'Aprueba una sola vez cada solicitud: si la apruebas dos veces se puede duplicar la vendedora. Las solicitudes ya atendidas se conservan como respaldo, no las borres.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  config: {
    label: 'Configuración',
    subtitle: 'Ajustar los datos y reglas del negocio',
    blocks: [
      { type: 'p', text: 'Centraliza los datos del negocio y las reglas que usan la tienda y el panel: información de la empresa, contacto, envíos y métodos de pago.' },
      { type: 'h', text: 'Paso a paso — actualizar los datos del negocio' },
      { type: 'steps', items: [
        'Entra a "Configuración".',
        'Completa los datos de la empresa (nombre, NIT, correo, horario) y el WhatsApp de contacto.',
        'Presiona "Guardar datos del negocio".',
      ] },
      { type: 'h', text: 'Otros ajustes' },
      { type: 'list', items: [
        'Precios de envío: edítalos y presiona "Guardar precios de envío".',
        'Métodos de pago: actívalos/edítalos y presiona "Guardar métodos de pago".',
        'Parámetros de precios y comisiones: ajústalos y presiona "Guardar configuración".',
      ] },
      { type: 'note', text: 'Lo que cambies aquí afecta a TODA la tienda y a los documentos (por ejemplo el WhatsApp o el NIT). Cámbialo con cuidado y verifica en la tienda después de guardar.' },
      { type: 'roles', items: ['superusuario'] },
    ],
  },

};
