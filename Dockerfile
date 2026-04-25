FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Cloud Lab Compliance Screening"
LABEL org.opencontainers.image.description="Static frontend prototype for laboratory safety protocol compliance screening."

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
