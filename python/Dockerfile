FROM python:3.9.16-alpine

RUN pip install fastapi pydantic uvicorn
RUN apk update && apk add --no-cache gcc musl-dev
RUN addgroup -S mercari && adduser -S trainee -G mercari

WORKDIR /app
COPY requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

RUN mkdir -p /app/images /app/db && chown -R trainee:mercari /app
USER trainee

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
