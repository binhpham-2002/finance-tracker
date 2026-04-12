#!/bin/bash
docker start finance-db finance-redis
osascript -e 'tell app "Terminal" to do script "cd ~/finance-tracker/api && npm run dev"'
osascript -e 'tell app "Terminal" to do script "cd ~/finance-tracker/ml-service && source venv/bin/activate && python src/main.py"'
osascript -e 'tell app "Terminal" to do script "cd ~/finance-tracker/frontend && npm run dev"'
