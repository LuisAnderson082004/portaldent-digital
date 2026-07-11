# PortalDent Digital - Clínica y Ficha Odontológica

PortalDent Digital es una aplicación web SPA (Single Page Application) moderna, profesional y altamente responsiva diseñada para gestionar los procesos operativos y clínicos de un consultorio dental. Cuenta con control de acceso basado en roles (RBAC), agenda de citas con pagos de separación, registro médico inalterable, odontograma interactivo y auditoría de privacidad.

---

## 🚀 Arquitectura y Tecnologías
La aplicación está construida utilizando tecnologías web nativas para asegurar tiempos de carga menores a 2 segundos y está lista para su despliegue estático continuo en **Vercel**:
- **HTML5 Semántico**: Para estructura y accesibilidad.
- **CSS3 Vanilla**: HSL para paletas de colores clínicos de alto contraste, gradients, micro-animaciones y responsive design adaptado a computadoras de cabina y tablets de recepción.
- **JavaScript Moderno (ESM)**: Módulos nativos para separación de responsabilidades e integridad de datos.
- **Base de Datos en la Nube (Supabase)**: Persistencia en tiempo real e integraciones seguras mediante cliente oficial de Supabase.

---

## 📁 Estructura del Directorio

```
Workspace Root/
├── index.html                  # Contenedor SPA principal
├── test.html                   # Suite de Pruebas Unitarias de Validación ESM
├── README.md                   # Documentación del proyecto
├── package.json                # Configuración de comandos y dependencias
├── assets/
│   └── css/
│       ├── main.css            # Variables del sistema de diseño, Login y botones
│       ├── dashboard.css       # Layouts, Sidebar y grilla horaria de la agenda (9 AM - 7 PM)
│       └── odontogram.css      # Estilos interactivos SVG de las piezas y superficies dentales
└── src/
    ├── main.js                 # Router, coordinador de vistas y reloj del sistema
    ├── auth/
    │   └── authEngine.js       # Hashing, inicio de sesión y control RBAC (Supabase Auth)
    ├── utils/
    │   ├── storage.js          # Acceso asíncrono a datos de Supabase
    │   ├── supabaseClient.js   # Inicialización y exportación del cliente oficial
    │   └── pdf-generator.js    # Motor personalizado de compilación e impresión de reportes
    └── modules/
        ├── appointments.js     # Reglas del calendario, abonos de separación y límite de 4h
        ├── patients.js         # Admisión de pacientes, DNI único y capas de evolución inmutables
        ├── odontogram.js       # Odontograma, congelamiento de línea base y raíces anatómicas
        └── audit.js            # Bitácora automática de auditoría de privacidad
```

---

## ⚙️ Instrucciones de Despliegue en Vercel

PortalDent Digital se despliega en **Vercel** como una aplicación web estática con cero configuración:

1. Conecta tu repositorio de GitHub a tu cuenta de Vercel.
2. Crea un nuevo proyecto en Vercel seleccionando este repositorio.
3. Vercel detectará el archivo `index.html` en la raíz y configurará el despliegue automático.
4. Presiona **Deploy**. ¡Tu aplicación estará en producción en segundos!

---

## 🧪 Pruebas Automatizadas
La suite de validación de reglas de negocio puede ejecutarse abriendo el archivo `test.html` mediante tu servidor de desarrollo local preferido (por ejemplo, con `npx serve` o la extensión Live Server):
👉 **[http://localhost:3000/test.html](http://localhost:3000/test.html)**
