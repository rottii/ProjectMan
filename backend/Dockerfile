FROM node:22-alpine

# Prisma'nın Alpine üzerinde çalışabilmesi için OpenSSL kütüphanesini, Auto-Code için Git'i ve Native modüller için build araçlarını yüklüyoruz
RUN apk add --no-cache openssl git python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]