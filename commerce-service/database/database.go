package database

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

type DB struct {
    *sql.DB
}

func NewDatabase(dsn string) (*DB, error) {
    db, err := sql.Open("mysql", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    log.Println("Connected to MySQL database")
    return &DB{db}, nil
}

func (db *DB) Close() error {
    return db.DB.Close()
}