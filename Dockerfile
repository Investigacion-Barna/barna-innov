# Diagnóstico de Cultura de Innovación · BARNA
#
# Imagen Docker ligera para servir el sitio estático con nginx.
# Imagen final: ~50 MB (basada en nginx:alpine).
#
# Build:
#   docker build -t barna-innov .
#
# Run:
#   docker run -d --name barna-innov -p 8080:80 barna-innov
#   # Abrir http://localhost:8080
#
# Stop:
#   docker stop barna-innov && docker rm barna-innov

FROM nginx:alpine

# Copiar el contenido estático al document root de nginx
COPY index.html metodologia.html styles.css /usr/share/nginx/html/
COPY js/    /usr/share/nginx/html/js/
COPY demos/ /usr/share/nginx/html/demos/

# Healthcheck básico
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

EXPOSE 80

# nginx:alpine ya define CMD ["nginx", "-g", "daemon off;"]
