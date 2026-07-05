# PortalDent Digital - Clínica y Ficha Odontológica

PortalDent Digital es una aplicación web SPA (Single Page Application) moderna, profesional y altamente responsiva diseñada para gestionar los procesos operativos y clínicos de un consultorio dental. Cuenta con control de acceso basado en roles (RBAC), agenda de citas con pagos de separación, registro médico inalterable, odontograma interactivo y auditoría de privacidad.

---

## 🚀 Arquitectura y Tecnologías
La aplicación está construida utilizando tecnologías web nativas para asegurar tiempos de carga menores a 2 segundos:
- **HTML5 Semántico**: Para estructura y accesibilidad.
- **CSS3 Vanilla**: HSL para paletas de colores clínicos de alto contraste, gradients, micro-animaciones y responsive design adaptado a computadoras de cabina y tablets de recepción.
- **JavaScript Moderno (ESM)**: Módulos nativos para separación de responsabilidades e integridad de datos.
- **Local Web Server**: Servidor estático nativo en PowerShell (`server.ps1`) para habilitar la carga de módulos ESM sin necesidad de instalar Node.js ni configurar CORS.

---

## 📁 Estructura del Directorio

```
Workspace Root/
├── index.html                  # Contenedor SPA principal
├── test.html                   # Suite de Pruebas Unitarias de Validación ESM
├── README.md                   # Documentación del proyecto
├── package.json                # Configuración de comandos locales
├── server.ps1                  # Servidor web estático nativo en PowerShell
├── assets/
│   └── css/
│       ├── main.css            # Variables del sistema de diseño, Login y botones
│       ├── dashboard.css       # Layouts, Sidebar y grilla horaria de la agenda (9 AM - 7 PM)
│       └── odontogram.css      # Estilos interactivos SVG de las piezas y superficies dentales
└── src/
    ├── main.js                 # Router, coordinador de vistas y reloj del sistema
    ├── auth/
    │   └── authEngine.js       # Hashing, inicio de sesión y control RBAC
    ├── utils/
    │   ├── storage.js          # Base de datos local (abstracción LocalStorage) y semillas
    │   └── pdf-generator.js    # Motor personalizado de compilación e impresión de reportes
    └── modules/
        ├── appointments.js     # Reglas del calendario, abonos de separación y límite de 4h
        ├── patients.js         # Admisión de pacientes, DNI único y capas de evolución inmutables
        ├── odontogram.js       # Odontograma, congelamiento de línea base y bloqueo de tratamientos
        └── audit.js            # Bitácora automática de auditoría de privacidad
```

---

## ⚙️ Instrucciones de Ejecución Local

Dado que la aplicación utiliza módulos nativos de JavaScript, las políticas de seguridad del navegador bloquean las importaciones sobre el protocolo `file://`. Debe ejecutarse a través de un servidor local.

### En Windows (PowerShell Nativo):
1. Abre una consola de PowerShell en la raíz del proyecto.
2. Ejecuta la política de ejecución temporal e inicia el servidor web nativo:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ./server.ps1
   ```
3. Abre tu navegador e ingresa a: **[http://localhost:3000/](http://localhost:3000/)**

---

## 🔑 Credenciales Sembradas de Prueba

El sistema cuenta con datos pre-cargados para verificar de inmediato los tres perfiles de acceso:

| Perfil | Usuario | Contraseña | Permisos Operativos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | CRUD de personal, turnos de odontólogos y visor de **Auditoría de Privacidad**. |
| **Asistente** | `receptionist` | `receptionist123` | Admisión de pacientes, agendamiento de citas, control de depósitos (S/ 50), recordatorios y descarga de resúmenes. |
| **Odontólogo** | `dentist` | `dentist123` | Antecedentes médicos, notas de evolución (V1, V2 inalterables), odontograma gráfico interactivo (Baseline vs Evolución) y exportación de expediente PDF. |

---

## 🧪 Pruebas Automatizadas
La suite de validación de reglas de negocio puede ejecutarse abriendo el servidor web local en la siguiente dirección:
👉 **[http://localhost:3000/test.html](http://localhost:3000/test.html)**
