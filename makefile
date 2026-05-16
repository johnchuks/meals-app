
ROOT := $(CURDIR)
API_DIR := $(ROOT)/meal-api
CLIENT_DIR := $(ROOT)/meal-client

.PHONY: dev api client api-logs api-down install

dev: api client

api:
	cd $(API_DIR) && docker compose up -d --build

client:
	cd $(CLIENT_DIR) && npm run dev

install:
	cd $(CLIENT_DIR) && npm install

api-logs:
	cd $(API_DIR) && docker compose logs -f api

api-down:
	cd $(API_DIR) && docker compose down

