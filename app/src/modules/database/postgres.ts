import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import Connection from './connection';

@Injectable()
export class PostgresAdapter implements OnModuleInit, OnModuleDestroy, Connection {
  private client: Client;

  async onModuleInit() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rinha',
    });
    await this.client.connect();
    console.log('Postgres connected!');
  }

  async onModuleDestroy() {
    await this.client.end();
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.client.query(sql, params);
    return result.rows;
  }
}