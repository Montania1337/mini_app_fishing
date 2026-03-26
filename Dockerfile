FROM python:3.14-slim

ENV PYTHONBUFFERED=1
ENV DATABASE_PATH=/data/fishing.db

WORKDIR /opt/fishingapp

COPY requirements.txt .

RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade && \
    rm -rf /var/lib/apt/lists/* && \
    python3 -m pip --no-cache-dir install -r requirements.txt

COPY . .

RUN mkdir -p /data

VOLUME ["/data"]

ENTRYPOINT ["uvicorn", "main:app"]

EXPOSE 8000

CMD ["--host", "0.0.0.0", "--port", "8000"]
