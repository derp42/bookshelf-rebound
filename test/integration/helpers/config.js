module.exports = {
  mysql: {
    database: 'bookshelf_test',
    user: 'root',
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    password: process.env.MYSQL_PASSWORD || '',
    encoding: 'utf8'
  },

  postgres: {
    database: 'bookshelf_test',
    user: 'postgres',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || 5432),
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  },

  sqlite3: {
    filename: ':memory:'
  }
};
