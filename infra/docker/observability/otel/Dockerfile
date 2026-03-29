FROM otel/opentelemetry-collector-contrib:0.122.1

COPY otelcol.yaml /etc/otelcol-contrib/config.yaml

EXPOSE 13133 4317 4318 8888

CMD ["--config=/etc/otelcol-contrib/config.yaml"]
