# Despliegue en Docker Swarm con Traefik

Esta carpeta contiene los archivos para desplegar el sitio en tu servidor de
Docker Swarm, ruteando por dominio:

- `vitalia.barna.edu.do` → `vitalia_backend` (proyecto existente)
- `innovado.barna.edu.do` → `barna-innov` (este proyecto)

El reverse proxy es **Traefik v3** escuchando en HTTP/80. **Cloudflare**
hace la terminación TLS por delante (modo Flexible o Full) y se conecta al
origen por HTTP.

```
internet  →  Cloudflare (TLS)  →  Servidor BARNA
                                       │
                                  Traefik :80
                                       │ rutea por Host
                            ┌──────────┴──────────┐
                            │                     │
                   vitalia.barna.edu.do  innovado.barna.edu.do
                            │                     │
                   vitalia_backend:3000     barna-innov:80
                       (existente)         (este proyecto)
```

---

## Pre-requisitos en el servidor

- Puerto 80 libre en el host (no usado por nginx/apache del sistema).
- Puerto 80 **abierto en el firewall** desde la red del frontal de BARNA.
  Si `iptables -L INPUT -v -n` muestra un `REJECT all` antes del puerto 80,
  agregar antes del reject:
  ```bash
  sudo iptables -I INPUT 5 -p tcp -m state --state NEW --dport 80 -j ACCEPT
  sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
  ```
- DNS: `innovado.barna.edu.do` apuntando al frontal de BARNA (mismo A record
  que `vitalia.barna.edu.do`). El frontal hace TLS termination y enruta a
  este servidor por HTTP en el puerto 80.

## Notas sobre el frontal de BARNA

El frontal (alrededor de `10.50.10.72`) hace healthchecks del backend con
`GET / Host: <IP-INTERNA>` (no preserva el Host original del cliente). Si
Traefik responde 404 a esos healthchecks, el frontal marca el backend como
DOWN y devuelve 502 a los clientes externos. Por eso los routers de cada
servicio incluyen también `Host(\`10.50.230.30\`)` — esa IP corresponde a
la LAN interna del servidor. Si cambia la IP del servidor, actualizar el
label en cada `*-stack.yml`.

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

## Paso 2 · Modificar el stack de vitalia

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
        - traefik.swarm.network=vitalia-net
        - traefik.http.routers.vitalia.rule=Host(`vitalia.barna.edu.do`)
        - traefik.http.routers.vitalia.entrypoints=web
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

## Paso 3 · Desplegar Traefik

```bash
docker stack deploy -c deploy/traefik-stack.yml traefik
```

Esto arranca Traefik escuchando en `:80`. Verifica que esté corriendo:

```bash
docker service ls
docker service logs traefik_traefik --tail 50
```

A los 10–30 segundos deberías ver en los logs que Traefik descubrió el
servicio `vitalia_backend`. Prueba abriendo `https://vitalia.barna.edu.do`
en el navegador (Cloudflare se encarga del TLS).

Si algo falla:
- Mira los logs de Traefik.
- Verifica que el DNS en Cloudflare apunte bien y el proxy esté activo.
- Verifica que el firewall del servidor permita 80 desde las IPs de
  Cloudflare.

---

## Paso 4 · Construir y desplegar barna-innov

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

Abre `https://innovado.barna.edu.do`. Cloudflare termina el TLS y Traefik
rutea al servicio en el origen.

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
Falta el label `entrypoints=web`. Revisa los labels del servicio.

**Redirect loop al entrar al dominio**
Cloudflare en modo Flexible y el origen redirigiendo HTTP→HTTPS crea un
bucle. Verifica que ningún servicio del backend mande 301 a https. Traefik
ya no lo hace (lo quitamos). Si el problema persiste, cambia Cloudflare a
modo Full.

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
