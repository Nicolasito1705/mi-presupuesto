# Publicar en Vercel — paso a paso

El paquete `~/Downloads/mi-presupuesto-vercel.zip` (117 KB) ya está compilado y
listo. **Sus credenciales de Supabase van dentro**: Vite las incrusta en el bundle al
compilar, así que en Vercel no hay que configurar ninguna variable de entorno.

---

## Paso 1 — Subirlo (2 minutos)

1. Entre a [vercel.com](https://vercel.com) con su cuenta `carmelio1717171…`.
2. En **Projects**, busque el recuadro **«Deploy your first project»**.
3. **Arrastre el archivo `mi-presupuesto-vercel.zip`** al recuadro. No lo descomprima
   — Vercel lo abre solo.
4. Espere unos 20 segundos. Al terminar le muestra la URL:
   `https://mi-presupuesto-XXXX.vercel.app`

Esa URL ya funciona. Ábrala y debería ver la pantalla de inicio de sesión.

## Paso 2 — Decirle a Supabase cuál es la URL (obligatorio)

Sin esto los correos de confirmación siguen apuntando a `localhost` y fallan en
cualquier dispositivo que no sea su Mac.

1. Supabase → su proyecto → **Authentication** → **URL Configuration**.
2. **Site URL**: pegue la URL de Vercel (`https://mi-presupuesto-XXXX.vercel.app`).
3. **Redirect URLs** → *Add URL*: `https://mi-presupuesto-XXXX.vercel.app/**`
   (con los dos asteriscos al final).
4. **Save**.

## Paso 3 — Quitar la confirmación por correo (para que sus amigos entren)

Sin dominio propio no hay forma de enviar correos a otras personas, así que lo más
práctico es no enviarlos:

1. Supabase → **Authentication** → **Providers** → **Email**.
2. Desactive **«Confirm email»**.
3. **Save**.

A partir de ahí, quien se registre entra de inmediato.

**Lo que pierde:** nadie verifica que el correo sea real, y **no hay recuperación de
contraseña** (ese correo también necesita SMTP). Si un amigo olvida su clave, usted se
la cambia desde Supabase → **Authentication** → **Users** → los tres puntos → *Reset
password*.

## Paso 4 — Probarlo

1. Abra la URL de Vercel.
2. **¿No tienes cuenta? Regístrate** → correo y contraseña (mínimo 6 caracteres).
3. Entra directo al dashboard con las cuatro categorías ya creadas.
4. Pásele el link a sus amigos: cada uno se registra y **tiene su propio presupuesto**,
   invisible para los demás. No es un presupuesto compartido.

En el iPhone, con la URL abierta en Safari: **Compartir → Añadir a pantalla de inicio**.
Queda como una app, a pantalla completa y sin la barra del navegador.

---

## Cuando quiera actualizar la app

El zip es una foto fija. Para publicar cambios:

```bash
npm run build
```

Luego comprima la carpeta `dist/` y arrástrela otra vez a Vercel, **en el mismo
proyecto** (pestaña del proyecto → *Deployments* → arrastrar), no como proyecto nuevo —
así conserva la misma URL.

Si prefiere que sea automático, conecte el proyecto a un repositorio de Git desde
Vercel y cada `git push` publicará solo. Eso ya requiere terminal:

```bash
npx vercel login && npx vercel link --yes && npx vercel deploy --prod --yes
```

Por esa vía sí hay que cargar las variables en Vercel (Settings → Environment
Variables), porque el build corre allá: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Qué tiene y qué no

**Privacidad.** [`vercel.json`](vercel.json) manda `X-Robots-Tag: noindex, nofollow` y
un `robots.txt` que bloquea a los buscadores: la app no aparecerá en Google. Pero
*noindex* no es *privado* — la URL es pública para quien la tenga, y cualquiera con el
link puede registrarse. Si algún día quiere cerrarla de verdad, desactive el registro
público en Supabase y cree usted los usuarios a mano.

**Sus datos.** Todo vive en su proyecto de Supabase, protegido por row-level security:
cada usuario solo lee y escribe sus propias filas, y los meses cerrados son de solo
lectura incluso para su dueño. Nada sale hacia terceros — el Asistente calcula en el
navegador y no llama a ninguna API externa.

**El Asistente** responde con reglas, no con un modelo de lenguaje. Entiende los temas
que aparecen en las sugerencias (gasto por categoría, balance, proyección a fin de mes,
deudas, metas, cargos repetidos, comparación con meses cerrados, y el nombre de
cualquier categoría o rubro). Fuera de eso dice que no entendió, en lugar de inventar.

---

## Correos de verdad, más adelante

Si consigue un dominio o quiere recuperación de contraseña, el proveedor a usar es
**Brevo**: verifica una sola dirección remitente (su propio Gmail sirve, con un clic en
un enlace) y desde ahí envía a cualquiera, 300/día gratis — sin dominio propio.

En Supabase → **Project Settings** → **Authentication** → **SMTP Settings** →
*Enable Custom SMTP*:

| Campo | Valor |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | el que le da Brevo en *SMTP & API* |
| Password | la clave SMTP de Brevo (no la de su cuenta) |
| Sender email | la dirección que verificó |

Suba también el **Rate limit for sending emails**, que de fábrica queda muy corto. Con
el SMTP puesto, vuelva a activar «Confirm email» si lo desea.

> Resend no sirve para este caso: sin dominio verificado solo envía a la dirección con
> la que usted se registró, así que sus amigos no recibirían nada.
