# Despliegue en Docker Swarm con Traefik

Esta carpeta contiene los archivos para desplegar el sitio en tu servidor de
Docker Swarm, ruteando por dominio:

- `vitalia.barna.edu.do` → `vitalia_backend` (proyecto existente)
- `innovado.barna.edu.do` → `barna-innov` (este proyecto)

El reverse proxy es **Traefik v3**: descubre servicios por labels, genera
certificados gratis con Let's Encrypt y redirige HTTP → HTTPS.

```
              ┌──────────────────┐
internet  →   │ Traefik :80 :443 │  (en el host)
              └──────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
   vitalia.barna.edu.do  innovado.barna.edu.do
            │                     │
   vitalia_backend:3000     barna-innov:80
       (existente)         (este proyecto)
```

---

## Pre-requisitos en el servidor

- Puerto 80 y 443 libres en el host (no usados por nginx/apache del sistema).
- DNS: `innovado.barna.edu.do` apunta (A record) a la **misma IP** que
  `vitalia.barna.edu.do`. Verifica con `dig innovado.barna.edu.do`.

---

## Paso 1 · Verificar la red existente

`vitalia-net` ya existe en el servidor (es la red overlay que usan
`vitalia_backend` y `vitalia_postgres`). Reutilizamos esa misma red para
que Traefik pueda hablar tanto con vitalia como con innovado.

Verifica que esté creada como **overlay attachable**:

```bash
docker network ls | grep vitalia-net
docker network inspect vitalia-net --format '{{.Driver}} {{.Attachable}}'
# debe imprimir: overlay true
```

Si no es attachable, hay que recrearla con `--attachable` o forzarla
mediante `docker network update`. Si todo está bien, sigue al paso 2.

---

## Paso 2 · Editar el email de Let's Encrypt

Abre [traefik-stack.yml](traefik-stack.yml) y cambia
`admin@barna.edu.do` por un email real de un admin de BARNA. Let's Encrypt
manda avisos de expiración a esa dirección.

> **Tip**: para la primera prueba, descomenta la línea de `caserver=...staging...`
> en [traefik-stack.yml](traefik-stack.yml). Eso usa el endpoint de staging de
> Let's Encrypt (sin rate-limits) para validar que todo funciona. Una vez
> verificado, comentas esa línea y rehaces `docker stack deploy` para emitir
> certificados de producción reales. **Si no haces este test primero y algo
> está mal, hay rate-limit de 5 certs por semana por dominio**.

---

## Paso 3 · Modificar el stack de vitalia

Tu servicio `vitalia_backend` hoy expone el puerto 80 directamente
(`*:80->3000/tcp`). Eso entra en conflicto con Traefik. Como vitalia ya
está conectado a `vitalia-net` (es como habla con postgres), sólo hay que:

1. **Quitar la sección `ports`** del servicio.
2. **Agregar los labels de Traefik** en `deploy.labels`.

Tu compose/stack original de vitalia probablemente se ve así:

```yaml
# ANTES
services:
  vitalia_backend:
    image: backend-vitalia:latest
    ports:
      - "80:3000"            # ← QUITAR
    networks:
      - vitalia-net
    deploy:
      replicas: 2
    # ...
```

Tiene que quedar así:

```yaml
# DESPUÉS
services:
  vitalia_backend:
    image: backend-vitalia:latest
    # ports: ya no, Traefik se encarga
    networks:
      - vitalia-net          # ya estaba
    deploy:
      replicas: 2
      labels:                # ← NUEVO bloque
        - traefik.enable=true
        - traefik.docker.network=vitalia-net
        - traefik.http.routers.vitalia.rule=Host(`vitalia.barna.edu.do`)
        - traefik.http.routers.vitalia.entrypoints=websecure
        - traefik.http.routers.vitalia.tls.certresolver=le
        - traefik.http.services.vitalia.loadbalancer.server.port=3000
```

> **Importante**: los labels van bajo `deploy.labels`, NO bajo `labels` del
> servicio. Es un detalle clave en Swarm.

Vuelve a desplegar el stack de vitalia:

```bash
docker stack deploy -c <tu-archivo-de-vitalia>.yml vitalia
```

En ese momento `vitalia_backend` deja de servir por el puerto 80 del host —
todavía no está accesible desde el dominio. Eso se arregla en el paso 4.

---

## Paso 4 · Desplegar Traefik

```bash
docker stack deploy -c deploy/traefik-stack.yml traefik
```

Esto arranca Traefik escuchando en `:80` y `:443`. Verifica que esté
corriendo:

```bash
docker service ls
docker service logs traefik_traefik --tail 50
```

A los 30–60 segundos deberías ver en los logs que Traefik descubrió el
servicio `vitalia_backend` y obtuvo un certificado para
`vitalia.barna.edu.do`. Prueba abriendo
`https://vitalia.barna.edu.do` en el navegador.

Si algo falla:
- Mira los logs de Traefik.
- Verifica que tu DNS apunte bien y que el firewall permita 80/443.
- Si usaste staging, ignora los warnings de "certificate not trusted" — son
  esperables.

---

## Paso 5 · Construir y desplegar barna-innov

En el servidor, clona el repo (o pull si ya está):

```bash
git clone https://github.com/Investigacion-Barna/barna-innov.git
cd barna-innov
```

Construye la imagen:

```bash
docker build -t barna-innov:latest .
```

> **Multi-nodo**: si tu Swarm tiene más de un nodo, la imagen debe estar
> disponible en todos. Push a un registry (Docker Hub, GHCR) o exporta con
> `docker save | ssh nodo docker load`. Para single-node esto no aplica.

Despliega el stack:

```bash
docker stack deploy -c deploy/barna-stack.yml innovado
```

Verifica:

```bash
docker service ls | grep innovado
docker service logs innovado_web --tail 20
```

Abre `https://innovado.barna.edu.do`. Traefik debe generar el cert
automáticamente en menos de 30 segundos.

---

## Actualizar el sitio después de cambios

Cuando hagas cambios en este repo:

```bash
cd /ruta/al/repo
git pull
docker build -t barna-innov:latest .
docker service update --image barna-innov:latest --force innovado_web
```

El `--force` reinicia el servicio aunque el tag no haya cambiado.

---

## Verificación rápida

| Comando | Esperado |
|---|---|
| `docker network inspect vitalia-net --format '{{.Driver}}'` | `overlay` |
| `docker service ls` | traefik, vitalia, innovado todos `1/1` o `2/2` |
| `docker service logs traefik_traefik` | sin errores de ACME ni de Swarm |
| `curl -I https://vitalia.barna.edu.do` | 200 con cert válido |
| `curl -I https://innovado.barna.edu.do` | 200 con cert válido |
| `curl -I http://innovado.barna.edu.do` | 301 → https |

---

## Problemas frecuentes

**"port 80 already in use" al desplegar Traefik**
Es porque vitalia_backend sigue agarrando el 80. Tienes que hacer el Paso 3
ANTES del Paso 4.

**"router has no entryPoint"**
Falta el label `entrypoints=websecure`. Revisa los labels del servicio.

**Cert no se emite**
Verifica DNS, firewall (80/443 abierto desde internet), y que el email en
`traefik-stack.yml` sea válido.

**El servicio se ve healthy pero el dominio da 404**
La label `traefik.http.services.<nombre>.loadbalancer.server.port` debe
apuntar al puerto INTERNO del contenedor, no al externo. Para nginx es 80,
para Node típico es 3000.

**Quiero rollback rápido del routing**
```bash
docker stack rm traefik          # Traefik desaparece
docker service update --publish-add 80:3000 vitalia_vitalia_backend
# Vitalia vuelve a agarrar el 80 directamente
```
