# Datos del Catálogo — Laurean

Edita `products.js` para gestionar todo el contenido del catálogo.

## Estructura de un producto

```js
{
  id:          "nombre-unico-01",   // sin espacios, sin tildes
  name:        "Nombre visible",
  image:       "images/archivo.jpg",
  price_gtq:   299,                 // precio en Quetzales
  price_usd:   39,                  // precio en USD
  category:    "accesorios",        // ver categorías abajo
}
```

## Categorías disponibles

| Valor       | Sección                  |
|-------------|--------------------------|
| `el`        | Para Él                  |
| `ella`      | Para Ella                |
| `ninos`     | Para Niños               |
| `accesorios`| Accesorios y Calzado     |
| `calzado`   | Accesorios y Calzado     |

## Agregar un producto nuevo

1. Copia la imagen del producto a la carpeta `images/` (o `images/accessories/` para accesorios).
2. Agrega un objeto nuevo al array correspondiente en `products.js`.
3. Guarda el archivo y recarga `Laurean.html`.

## Secciones en `products.js`

| Array          | Aparece en                           |
|----------------|--------------------------------------|
| `categories`   | Grid de 3 categorías                 |
| `sweaters`     | Sección "Punto fino para la familia" |
| `accessories`  | Grid de Accesorios y Calzado         |



Servidor corriendo. Puedes abrir en el navegador:

Tienda → http://localhost:8080/Laurean.html
Login → http://localhost:8080/login.html
Admin → http://localhost:8080/admin.html
Credenciales para probar:

Usuario	Email	Contraseña	Rol
AA Projects	super@aaprojects.com	SuperAA2026!	Superusuario
Admin Laurean	admin@laurean.gt	Admin2026!	Administrador
Para probar el flujo de vendedor, crea uno desde el panel admin y luego inicia sesión con esas credenciales.
