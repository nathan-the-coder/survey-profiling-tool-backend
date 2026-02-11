require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

class DatabaseManager {
  constructor() {
    this.client = null;
    this.init();
  }

  async init() {
    // Use Supabase only
    console.log('Initializing Supabase connection...');
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase client initialized');
  }

  async execute(query, params = []) {
    // Convert MySQL syntax to PostgreSQL where necessary
    let pgQuery = query;
    
    // Replace backticks with double quotes for PostgreSQL
    pgQuery = pgQuery.replace(/`/g, '"');
    
    // Replace MySQL specific functions if needed
    pgQuery = pgQuery.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
    pgQuery = pgQuery.replace(/LIMIT\s+(\d+)/gi, 'LIMIT $1');
    
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        sql_query: pgQuery,
        params: params
      });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return [data || []];
    } catch (error) {
      console.error('Supabase execution error:', error);
      throw error;
    }
  }

  async getConnection() {
    // For Supabase, return a mock connection object
    return {
      execute: this.execute.bind(this),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: async () => {}
    };
  }

  getClient() {
    return this.client;
  }
}

const db = new DatabaseManager();

module.exports = { db };