FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

# OPTIONAL: install nodemon globally
RUN npm install -g nodemon

COPY . .

CMD ["npm", "start"]
