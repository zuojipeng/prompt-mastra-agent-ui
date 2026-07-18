FROM python:3.12.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system jingci && adduser --system --ingroup jingci jingci

COPY requirements.lock ./
RUN python -m pip install --disable-pip-version-check --root-user-action=ignore -r requirements.lock

COPY --chown=jingci:jingci jingci_spike ./jingci_spike

USER jingci

CMD ["python", "-m", "jingci_spike.runtime_service"]
