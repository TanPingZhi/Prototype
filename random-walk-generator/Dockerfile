FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY random_walk_generator.py ./

ENV ES_HOST=http://elasticsearch:9200 \
    ES_USERNAME=admin \
    ES_PASSWORD=admin123 \
    ES_INDEX=random-walk

CMD ["python", "-u", "random_walk_generator.py"]
