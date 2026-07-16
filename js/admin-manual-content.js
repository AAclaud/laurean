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
      { type: 'p', text: 'Aquí llegan los pedidos de la tienda en línea y del punto de venta (POS). Desde cada uno gestionas su estado, el pago, el envío y el contacto con el cliente.' },
      { type: 'h', text: 'Paso a paso — procesar un pedido' },
      { type: 'steps', items: [
        'En la lista, haz clic en la fila del pedido para abrirlo.',
        'Revisa los productos, el total y los datos del cliente (nombre, teléfono, dirección).',
        'En "Estado", elige cómo va: Pendiente → Procesando → Enviado → Completado.',
        'Marca si el pago ya fue recibido (campo de pago).',
        'Presiona "Guardar estado" para dejar registrado el cambio.',
      ] },
      { type: 'h', text: 'Paso a paso — avisar al cliente por WhatsApp' },
      { type: 'steps', items: [
        'Abre el pedido (o ubícalo en la lista).',
        'Presiona "Seguimiento WhatsApp".',
        'Se abre WhatsApp con el mensaje ya armado (saludo, número de pedido, productos y total).',
        'Revisa el texto y envíalo.',
      ] },
      { type: 'h', text: 'Paso a paso — generar la guía de envío (Forza)' },
      { type: 'steps', items: [
        'Confirma que el pedido tenga departamento y municipio (si falta, complétalo en el pedido).',
        'Presiona "+ Guía Forza" (o "Generar guía").',
        'Revisa los datos y confírmalos.',
        'Usa "Imprimir guía" para adjuntarla al paquete.',
      ] },
      { type: 'h', text: 'Estados del pedido' },
      { type: 'kv', items: [
        ['Pendiente', 'recién ingresado, aún no se procesa.'],
        ['Procesando', 'se está preparando.'],
        ['Enviado', 'ya salió con el courier.'],
        ['Completado', 'entregado y cerrado (cuenta como venta).'],
        ['Cancelado', 'anulado (no cuenta como venta).'],
      ] },
      { type: 'note', text: 'Los pedidos NO se borran. Si te equivocaste, cambia el estado o deja una nota; para anularlo, ponlo en "Cancelado". El punto rojo del menú se apaga solo cuando ya no quedan pedidos pendientes.' },
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
    label: 'Productos',
    subtitle: 'Crear y publicar los productos de la tienda',
    blocks: [
      { type: 'p', text: 'Es el corazón de la tienda: aquí creas los productos, subes sus fotos, pones precios y decides cuáles se publican al cliente.' },
      { type: 'h', text: 'Paso a paso — crear un producto' },
      { type: 'steps', items: [
        'Presiona "+ Nuevo producto".',
        'Escribe el nombre y la descripción.',
        'Elige la categoría y la subcategoría a la que pertenece.',
        'Sube las fotos con "Subir imágenes" (puedes subir varias).',
        'Agrega los colores con "+ Agregar variante" y las tallas con "+ Agregar talla".',
        'Escribe el precio y activa "Mostrar precio" (si lo dejas apagado, saldrá "Contactar a Laurean").',
        'Activa "Publicado" para que aparezca en la tienda.',
        'Presiona "Guardar producto".',
      ] },
      { type: 'h', text: 'Paso a paso — editar un producto' },
      { type: 'steps', items: [
        'Busca el producto en la lista y haz clic para abrirlo.',
        'Cambia lo que necesites (precio, fotos, descripción, tallas).',
        'Presiona "Guardar producto". El cambio se refleja en la tienda en pocos segundos.',
      ] },
      { type: 'note', text: 'Solo se publica lo que tiene al menos una foto y está marcado como "Publicado". Un producto sin publicar queda guardado pero el cliente no lo ve.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  lookbook: {
    label: 'Lookbook',
    subtitle: 'Editar las imágenes editoriales de la portada',
    blocks: [
      { type: 'p', text: 'Controla el lookbook (el carrusel editorial) que se muestra en la página de inicio de la tienda. Es imagen de marca, no productos con precio.' },
      { type: 'h', text: 'Paso a paso — editar el lookbook' },
      { type: 'steps', items: [
        'Presiona "+ Agregar slide" para sumar una imagen (o abre una existente para editarla).',
        'Sube la imagen y ajusta el texto y las categorías del slide.',
        'Reordena o quita los slides que ya no quieras.',
        'Presiona "Guardar contenido" para publicar los cambios en la portada.',
      ] },
      { type: 'note', text: 'El lookbook es para ambientar y atraer. Para vender, usa "Productos" y "Combos".' },
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
    subtitle: 'Controlar el stock: entradas, salidas y traslados',
    blocks: [
      { type: 'p', text: 'Controla las existencias por bodega. Tiene pestañas: "Stock actual", "Movimientos", "Calendario" y "Mayoreo" (el maestro de artículos).' },
      { type: 'h', text: 'Paso a paso — registrar una entrada o salida' },
      { type: 'steps', items: [
        'Ve a la pestaña "Movimientos".',
        'Busca el producto escribiendo su nombre o código.',
        'Elige el tipo: "Entrada" (llega mercadería) o "Salida" (merma, daño, ajuste).',
        'Escribe la cantidad.',
        'En "Notas", anota el motivo (proveedor, factura, o razón de la salida).',
        'Presiona "Registrar".',
      ] },
      { type: 'h', text: 'Paso a paso — trasladar stock entre bodegas' },
      { type: 'steps', items: [
        'Usa el botón de traslado ("⇄ Trasladar entre bodegas").',
        'Elige la bodega de origen y la de destino.',
        'Indica el producto y la cantidad a mover.',
        'Confirma: el stock sale de una bodega y entra a la otra.',
      ] },
      { type: 'h', text: 'Tipos de movimiento' },
      { type: 'kv', items: [
        ['Entrada', 'aumenta stock (llega mercadería, devolución).'],
        ['Salida', 'disminuye stock (merma, daño, vencimiento).'],
        ['Ajuste', 'corrige el stock: registra una Entrada o Salida por la diferencia del conteo físico.'],
        ['Traslado', 'mueve stock de una bodega a otra.'],
      ] },
      { type: 'note', text: 'Cada movimiento queda registrado con usuario y fecha, y NO se puede borrar. Si te equivocaste, registra el movimiento contrario para corregir. El punto rojo del menú avisa de stock bajo; el "Kardex" muestra el historial de un producto.' },
      { type: 'roles', items: ['admin', 'superusuario', 'bodega'] },
    ],
  },

  proveedores: {
    label: 'Proveedores',
    subtitle: 'Guardar a quién le compras y tu historial',
    blocks: [
      { type: 'p', text: 'Guarda tus proveedores y el historial de compras de cada uno, para tener contactos a la mano y saber cuánto les compras.' },
      { type: 'h', text: 'Paso a paso — agregar un proveedor' },
      { type: 'steps', items: [
        'Presiona "+ Agregar proveedor" (o "Nuevo Proveedor").',
        'Escribe el nombre y los datos de contacto.',
        'Guarda.',
      ] },
      { type: 'h', text: 'Cómo ver el historial' },
      { type: 'steps', items: [
        'Abre un proveedor de la lista.',
        'Revisa su historial de compras (qué y cuánto le has comprado).',
      ] },
      { type: 'note', text: 'Algunos proveedores se crean solos a partir del inventario importado; aquí los puedes completar o editar.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  bodegas: {
    label: 'Bodegas',
    subtitle: 'Administrar los lugares donde guardas stock',
    blocks: [
      { type: 'p', text: 'Administra las bodegas entre las que se reparte el inventario. Cada producto tiene stock por bodega.' },
      { type: 'h', text: 'Paso a paso — agregar una bodega' },
      { type: 'steps', items: [
        'Presiona "+ Agregar bodega" (o "Nueva Bodega").',
        'Ponle nombre.',
        'Guarda. Ya podrás asignarle stock desde "Inventario".',
      ] },
      { type: 'h', text: 'Bodegas del sistema' },
      { type: 'kv', items: [
        ['Bodega Central', 'la principal, desde donde se reparte.'],
        ['Website', 'lo asignado a la tienda en línea.'],
      ] },
      { type: 'note', text: 'Central y Website no se pueden eliminar (son del sistema), pero sí puedes renombrarlas. Crea bodegas adicionales según tu operación.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  cotizaciones: {
    label: 'Cotizaciones',
    subtitle: 'Armar propuestas de venta para clientes',
    blocks: [
      { type: 'p', text: 'Crea cotizaciones o propuestas para enviar a clientes (por ejemplo, ventas al por mayor o pedidos especiales).' },
      { type: 'h', text: 'Paso a paso — crear una cotización' },
      { type: 'steps', items: [
        'Presiona "+ Nueva cotización".',
        'Escribe los datos del cliente.',
        'Presiona "+ Agregar producto" y añade cada producto con su cantidad y precio.',
        'Presiona "Guardar borrador" para conservarla.',
        'Imprímela o envíala al cliente para su aprobación.',
      ] },
      { type: 'note', text: 'Una cotización NO descuenta stock ni crea un pedido: es solo una propuesta. Cuando el cliente confirma, se procesa como pedido o venta.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  envios: {
    label: 'Envíos · Forza',
    subtitle: 'Generar guías de envío con el courier',
    blocks: [
      { type: 'p', text: 'Conecta con Forza (el courier) para generar y dar seguimiento a las guías de envío de los pedidos.' },
      { type: 'h', text: 'Paso a paso — generar una guía' },
      { type: 'steps', items: [
        'Entra a "Envíos · Forza" y abre la pestaña "Crear guía".',
        'Verifica que el pedido tenga departamento y municipio válidos (se capturan en el checkout).',
        'Completa los datos del envío que falten.',
        'Presiona "Generar guía".',
        'Usa "Imprimir guía" para adjuntarla al paquete.',
      ] },
      { type: 'note', text: 'Si falta el municipio, no se puede generar la guía: complétalo primero en el pedido. También puedes generar la guía directamente desde un pedido con el botón "+ Guía Forza".' },
      { type: 'roles', items: ['admin', 'superusuario'] },
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
    subtitle: 'Consultar la base de datos de compradores',
    blocks: [
      { type: 'p', text: 'Reúne a los clientes que han comprado, con su contacto e historial. Se arma solo a partir de los pedidos.' },
      { type: 'h', text: 'Cómo consultar un cliente' },
      { type: 'steps', items: [
        'Entra a "Clientes" y busca por nombre o teléfono.',
        'Abre el cliente para ver su contacto, cuántos pedidos hizo y cuánto ha gastado.',
        'Si necesitas registrar uno a mano, usa "+ Nuevo Cliente".',
      ] },
      { type: 'note', text: 'Son datos personales: úsalos solo para atender a tus clientes. Un mismo cliente no se duplica porque se agrupa por su teléfono.' },
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
        'Elige el tipo: "Porcentaje" (un % del total) o "Fijo" (un monto en Q).',
        'Escribe el valor (por ejemplo, 10 para 10%, o 50 para Q50).',
        'Define la vigencia (desde/hasta) y, si quieres, un límite de usos.',
        'Actívalo y guarda.',
      ] },
      { type: 'kv', items: [
        ['Porcentaje', 'descuenta un % del total (ej. 10%).'],
        ['Fijo', 'descuenta un monto en quetzales (ej. Q50).'],
      ] },
      { type: 'note', text: 'Un código inactivo o vencido deja de aplicar solo. El sistema valida cada código al momento de usarlo, así que no se puede abusar de uno caducado.' },
      { type: 'roles', items: ['admin', 'superusuario'] },
    ],
  },

  solicitudes: {
    label: 'Solicitudes',
    subtitle: 'Aprobar o rechazar postulaciones de vendedoras',
    blocks: [
      { type: 'p', text: 'Aquí llegan las personas que se postulan como vendedoras desde la página de vendedores. Tú decides si las apruebas o rechazas.' },
      { type: 'h', text: 'Paso a paso — revisar una solicitud' },
      { type: 'steps', items: [
        'Entra a "Solicitudes" (el punto del menú avisa si hay nuevas).',
        'Abre la solicitud y revisa los datos de la persona.',
        'Presiona "Aprobar" para crear su usuario de vendedora (con su código de referido), o "Rechazar".',
      ] },
      { type: 'note', text: 'Al aprobar, la vendedora se crea automáticamente. Evita presionar "Aprobar" dos veces sobre la misma solicitud para no duplicarla.' },
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
